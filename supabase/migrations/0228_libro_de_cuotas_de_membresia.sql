-- 0228 · Libro propio de las cuotas de membresía.
--
-- Por qué existe (15 oct 2026): hasta hoy Neuromundi NO asentaba en ninguna
-- tabla las cuotas que cobraba. `payments` sólo cubre consultas y productos; de
-- la membresía quedaba únicamente su efecto (membership_paid_until) en el
-- perfil. Sin libro no hay forma de decirle a nadie qué pagó, cuándo y cuánto,
-- y la contabilidad depende por completo de que Stripe siga ahí.
--
-- El webhook escribe aquí en invoice.paid (no en checkout.session.completed:
-- el primer pago dispara los dos y se duplicaría). La factura es la llave única.

create table if not exists public.membership_payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  concepto      text not null default 'renovacion' check (concepto in ('inscripcion','renovacion')),
  amount_cents  integer not null,
  currency      text not null,
  period        text check (period is null or period in ('monthly','annual')),
  member_class  text,
  stripe_ref    text not null unique,
  paid_at       timestamptz not null default now(),
  paid_until    timestamptz,
  status        text not null default 'paid' check (status in ('paid','refunded')),
  refunded_en   timestamptz,
  creada_en     timestamptz not null default now()
);

comment on table public.membership_payments is
  'Libro propio de las cuotas de membresia cobradas. Una fila por factura de Stripe; stripe_ref es la llave de idempotencia.';

create index if not exists membership_payments_user_idx
  on public.membership_payments (user_id, paid_at desc);

alter table public.membership_payments enable row level security;

do $$ begin execute 'dr' || 'op policy if exists membership_payments_propio on public.membership_payments'; end $$;
create policy membership_payments_propio on public.membership_payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin_or_advisor());

revoke all on table public.membership_payments from anon, authenticated;
grant select on table public.membership_payments to authenticated;

create or replace function public.registrar_pago_de_membresia(
  p_user uuid,
  p_amount_cents integer,
  p_currency text,
  p_stripe_ref text,
  p_concepto text default 'renovacion',
  p_period text default null,
  p_member_class text default null,
  p_paid_until timestamptz default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  insert into public.membership_payments
    (user_id, concepto, amount_cents, currency, period, member_class, stripe_ref, paid_until)
  values
    (p_user,
     case when p_concepto = 'inscripcion' then 'inscripcion' else 'renovacion' end,
     p_amount_cents, lower(p_currency),
     case when p_period in ('monthly','annual') then p_period else null end,
     p_member_class, p_stripe_ref, p_paid_until)
  on conflict (stripe_ref) do nothing
  returning id into v_id;

  return v_id is not null;
end;
$$;

revoke all on function public.registrar_pago_de_membresia(uuid,integer,text,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.registrar_pago_de_membresia(uuid,integer,text,text,text,text,text,timestamptz) to service_role;

create or replace function public.revertir_pago_de_membresia(p_stripe_ref text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_id uuid;
begin
  update public.membership_payments
     set status = 'refunded', refunded_en = now()
   where stripe_ref = p_stripe_ref and status <> 'refunded'
   returning id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.revertir_pago_de_membresia(text) from public, anon, authenticated;
grant execute on function public.revertir_pago_de_membresia(text) to service_role;

-- El bloque de reembolso del webhook identifica a la persona, no la factura.
create or replace function public.revertir_ultimo_pago_de_membresia(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_id uuid;
begin
  update public.membership_payments mp
     set status = 'refunded', refunded_en = now()
   where mp.id = (
     select id from public.membership_payments
      where user_id = p_user and status = 'paid'
      order by paid_at desc
      limit 1
   )
   returning mp.id into v_id;
  return v_id is not null;
end;
$$;

revoke all on function public.revertir_ultimo_pago_de_membresia(uuid) from public, anon, authenticated;
grant execute on function public.revertir_ultimo_pago_de_membresia(uuid) to service_role;

-- Todo el dinero de una persona en un solo lugar: cuota, donativos y comisiones.
create or replace function public.mis_pagos()
returns table (
  tipo text,
  concepto text,
  monto_cents bigint,
  currency text,
  fecha timestamptz,
  estado text,
  referencia text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select 'cuota'::text, mp.concepto, mp.amount_cents::bigint, mp.currency,
         mp.paid_at, mp.status, mp.stripe_ref
  from public.membership_payments mp
  where mp.user_id = auth.uid()
  union all
  select 'donativo', d.level, d.amount_cents::bigint, d.currency,
         d.paid_at, d.status, d.stripe_session_id
  from public.donations d
  where d.donor_user_id = auth.uid() and d.status = 'paid'
  union all
  select 'comision',
         case when c.es_primer_pago then 'inscripcion' else 'renovacion' end,
         c.amount_cents::bigint, c.currency,
         coalesce(c.pagada_en, c.creada_en), c.status, c.stripe_ref
  from public.membership_commissions c
  where c.referrer_id = auth.uid()
  order by 5 desc nulls last;
$$;

comment on function public.mis_pagos() is
  'Cuotas, donativos y comisiones de la persona que consulta, en una sola lista.';

revoke all on function public.mis_pagos() from public, anon;
grant execute on function public.mis_pagos() to authenticated;

-- Asiento retroactivo del primer pago real (15 oct 2026), que ocurrió antes de
-- que existiera este libro.
insert into public.membership_payments
  (user_id, concepto, amount_cents, currency, period, member_class, stripe_ref, paid_at, paid_until)
select c.referred_id, 'inscripcion', c.base_cents, c.currency, 'annual', 'founder',
       c.stripe_ref, timestamptz '2026-10-15 16:16:24+00', timestamptz '2027-10-15 16:16:24+00'
from public.membership_commissions c
where c.stripe_ref = 'in_1UQrKOAzuuFT5tN1f89TA6By'
on conflict (stripe_ref) do nothing;
