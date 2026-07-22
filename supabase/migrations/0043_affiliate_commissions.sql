-- ============================================================================
-- 0043 — Libro de comisiones de afiliados
--
-- CONTEXTO / DECISIÓN DE NEGOCIO
-- Hasta ahora la comisión del promotor se cobraba como `application_fee` y caía
-- en el balance de Stripe de NEUROMUNDI, que debía liquidarla después. Se
-- decidió lo contrario: **la plataforma no retiene nada**. El vendedor cobra el
-- 100% de su venta y él es quien le paga a su promotor. La plataforma solo
-- lleva la cuenta y da la herramienta para administrarla.
--
-- Por eso `create-product-checkout` deja de mandar `application_fee_amount`, y
-- esta migración crea el libro donde queda registrada cada comisión, quién la
-- debe, a quién, y si ya se pagó.
--
-- No hay periodo de retención: la comisión queda cobrable en cuanto el pedido
-- se marca pagado. Retener o no es decisión del vendedor, no de la plataforma.
--
-- Idempotente. Aplicar en el SQL Editor de Supabase después de la 0042.
-- ============================================================================

-- ── 1. Tabla ────────────────────────────────────────────────────────────────
create table if not exists public.affiliate_commissions (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  vendor_id     uuid not null references public.profiles(id) on delete cascade,
  affiliate_id  uuid not null references public.profiles(id) on delete cascade,
  product_name  text,
  amount_cents  integer not null check (amount_cents >= 0),
  currency      text not null,
  -- payable : el pedido está pagado y el vendedor le debe esto al promotor.
  -- paid    : el vendedor declaró haberla pagado.
  -- reversed: la venta se reembolsó antes de pagarle al promotor.
  status        text not null default 'payable'
                check (status in ('payable', 'paid', 'reversed')),
  -- Se marca cuando el reembolso llega DESPUÉS de que el vendedor ya pagó la
  -- comisión. No se toca el estado 'paid' (el dinero salió de verdad); queda la
  -- señal para que el vendedor lo resuelva con su promotor.
  refund_after_payment boolean not null default false,
  paid_at       timestamptz,
  paid_note     text,
  reversed_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint uq_commission_order unique (order_id)
);

create index if not exists idx_commissions_affiliate
  on public.affiliate_commissions (affiliate_id, status);
create index if not exists idx_commissions_vendor
  on public.affiliate_commissions (vendor_id, status);

alter table public.affiliate_commissions enable row level security;

-- Lo ven las dos partes. Escribir SIEMPRE por función: así se valida quién
-- puede marcar como pagado y se avisa al promotor en la misma transacción.
drop policy if exists commissions_select_parties on public.affiliate_commissions;
create policy commissions_select_parties on public.affiliate_commissions
  for select using (vendor_id = auth.uid() or affiliate_id = auth.uid());

-- ── 2. Alta y reversa automáticas desde `orders` ────────────────────────────
create or replace function public.tg_sync_affiliate_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sin promotor o sin comisión no hay nada que registrar.
  if NEW.affiliate_id is null or coalesce(NEW.commission_cents, 0) <= 0 then
    return NEW;
  end if;

  if NEW.status = 'paid' then
    insert into public.affiliate_commissions
      (order_id, vendor_id, affiliate_id, product_name, amount_cents, currency, status)
    values
      (NEW.id, NEW.vendor_id, NEW.affiliate_id, NEW.product_name,
       NEW.commission_cents, NEW.currency, 'payable')
    on conflict (order_id) do nothing;

  elsif NEW.status = 'refunded' then
    update public.affiliate_commissions ac
       set status      = case when ac.status = 'paid' then ac.status else 'reversed' end,
           reversed_at = now(),
           refund_after_payment = (ac.status = 'paid')
     where ac.order_id = NEW.id;
  end if;

  return NEW;
exception when others then
  -- Nunca bloquear la actualización del pedido por un fallo del libro.
  return NEW;
end;
$$;

drop trigger if exists trg_sync_affiliate_commission on public.orders;
create trigger trg_sync_affiliate_commission
  after insert or update of status on public.orders
  for each row execute function public.tg_sync_affiliate_commission();

-- ── 3. Backfill de lo ya vendido ────────────────────────────────────────────
-- Los pedidos pagados anteriores nunca pasaron por el trigger. Se registran
-- como cobrables; si el vendedor ya los liquidó por fuera, los marca pagados.
insert into public.affiliate_commissions
  (order_id, vendor_id, affiliate_id, product_name, amount_cents, currency, status, created_at)
select o.id, o.vendor_id, o.affiliate_id, o.product_name,
       o.commission_cents, o.currency, 'payable', coalesce(o.paid_at, o.created_at)
  from public.orders o
 where o.status = 'paid'
   and o.affiliate_id is not null
   and coalesce(o.commission_cents, 0) > 0
on conflict (order_id) do nothing;

-- ── 4. Consultas ────────────────────────────────────────────────────────────
-- Se escriben en SQL puro (no PL/pgSQL) a propósito: con `returns table` en
-- PL/pgSQL las columnas de salida se vuelven variables y cualquier referencia
-- sin calificar revienta con 42702 en tiempo de EJECUCIÓN, no al crearla.

-- Lo que a MÍ me deben, como promotor.
drop function if exists public.my_commissions_earned();
create or replace function public.my_commissions_earned()
returns table (
  id uuid, order_id uuid, counterpart_id uuid, counterpart_name text,
  counterpart_member_no bigint, product_name text, amount_cents integer,
  currency text, status text, refund_after_payment boolean,
  paid_at timestamptz, paid_note text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select ac.id, ac.order_id, ac.vendor_id,
         coalesce(p.business_name, p.full_name), p.member_no,
         ac.product_name, ac.amount_cents, ac.currency, ac.status,
         ac.refund_after_payment, ac.paid_at, ac.paid_note, ac.created_at
    from public.affiliate_commissions ac
    join public.profiles p on p.id = ac.vendor_id
   where ac.affiliate_id = auth.uid()
   order by ac.created_at desc;
$$;
grant execute on function public.my_commissions_earned() to authenticated;

-- Lo que YO debo, como vendedor.
drop function if exists public.my_commissions_owed();
create or replace function public.my_commissions_owed()
returns table (
  id uuid, order_id uuid, counterpart_id uuid, counterpart_name text,
  counterpart_member_no bigint, product_name text, amount_cents integer,
  currency text, status text, refund_after_payment boolean,
  paid_at timestamptz, paid_note text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select ac.id, ac.order_id, ac.affiliate_id,
         coalesce(p.business_name, p.full_name), p.member_no,
         ac.product_name, ac.amount_cents, ac.currency, ac.status,
         ac.refund_after_payment, ac.paid_at, ac.paid_note, ac.created_at
    from public.affiliate_commissions ac
    join public.profiles p on p.id = ac.affiliate_id
   where ac.vendor_id = auth.uid()
   order by ac.created_at desc;
$$;
grant execute on function public.my_commissions_owed() to authenticated;

-- ── 5. Marcar como pagado (solo el vendedor que debe) ───────────────────────
drop function if exists public.mark_commissions_paid(uuid[], text);
create or replace function public.mark_commissions_paid(p_ids uuid[], p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
  r record;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'sin_ids');
  end if;

  -- El `where vendor_id = auth.uid()` es la autorización: nadie puede dar por
  -- pagada una comisión que no debe.
  update public.affiliate_commissions ac
     set status    = 'paid',
         paid_at   = now(),
         paid_note = nullif(trim(coalesce(p_note, '')), '')
   where ac.id = any(p_ids)
     and ac.vendor_id = auth.uid()
     and ac.status = 'payable';

  get diagnostics v_updated = row_count;

  -- Aviso al promotor, agrupado por persona para no llenarle la campana.
  for r in
    select ac.affiliate_id,
           sum(ac.amount_cents)::bigint as total,
           ac.currency,
           count(*)::int as n
      from public.affiliate_commissions ac
     where ac.id = any(p_ids)
       and ac.vendor_id = auth.uid()
       and ac.status = 'paid'
       and ac.paid_at >= now() - interval '1 minute'
     group by ac.affiliate_id, ac.currency
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (
      r.affiliate_id,
      'commission_paid',
      'Comisión pagada',
      format('Te liquidaron %s comisión(es) por %s %s.',
             r.n, round(r.total / 100.0, 2), upper(r.currency)),
      jsonb_build_object('total_cents', r.total, 'currency', r.currency, 'count', r.n)
    );
  end loop;

  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;
grant execute on function public.mark_commissions_paid(uuid[], text) to authenticated;

-- ── 6. Vista del administrador ──────────────────────────────────────────────
drop function if exists public.admin_commissions();
create or replace function public.admin_commissions()
returns table (
  id uuid, vendor_id uuid, vendor_name text, vendor_member_no bigint,
  affiliate_id uuid, affiliate_name text, affiliate_member_no bigint,
  product_name text, amount_cents integer, currency text, status text,
  refund_after_payment boolean, paid_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select ac.id, ac.vendor_id, coalesce(v.business_name, v.full_name), v.member_no,
         ac.affiliate_id, coalesce(a.business_name, a.full_name), a.member_no,
         ac.product_name, ac.amount_cents, ac.currency, ac.status,
         ac.refund_after_payment, ac.paid_at, ac.created_at
    from public.affiliate_commissions ac
    join public.profiles v on v.id = ac.vendor_id
    join public.profiles a on a.id = ac.affiliate_id
   where public.is_admin()
   order by ac.created_at desc;
$$;
grant execute on function public.admin_commissions() to authenticated;
