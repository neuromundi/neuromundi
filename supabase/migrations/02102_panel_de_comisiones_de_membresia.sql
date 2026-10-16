-- 0210c · Lo que el panel necesita para ver y liquidar comisiones.

-- Resumen por referidor: lo que se le debe y lo que ya se le pagó.
create or replace function public.admin_comisiones_membresia(p_estado text default 'devengada')
returns table (
  referrer_id uuid, referidor text, correo text,
  referidor_vigente boolean, cuenta_de_cobro boolean,
  comisiones bigint, referidos bigint,
  monto_cents bigint, currency text,
  primera timestamptz, ultima timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.referrer_id,
         coalesce(nullif(btrim(p.business_name), ''), p.full_name, '(sin nombre)'),
         u.email,
         public.cuota_cubierta(c.referrer_id),
         (p.stripe_connect_id is not null),
         count(*), count(distinct c.referred_id),
         sum(c.amount_cents), min(c.currency),
         min(c.creada_en), max(c.creada_en)
  from public.membership_commissions c
  join public.profiles p on p.id = c.referrer_id
  left join auth.users u on u.id = c.referrer_id
  where public.is_admin_or_advisor()
    and (p_estado is null or p_estado = 'todas' or c.status = p_estado)
  group by c.referrer_id, p.business_name, p.full_name, u.email, p.stripe_connect_id
  order by sum(c.amount_cents) desc;
$$;

comment on function public.admin_comisiones_membresia(text) is
  'Comisiones de membresia agrupadas por referidor, con su estado de vigencia y si tiene cuenta de cobro. Solo admin o asesor.';

revoke all on function public.admin_comisiones_membresia(text) from public, anon;
grant execute on function public.admin_comisiones_membresia(text) to authenticated, service_role;


-- Detalle de un referidor: cada comision, de quien y por cuanto.
create or replace function public.admin_comisiones_detalle(p_referrer uuid)
returns table (
  id uuid, referido text, es_primer_pago boolean,
  base_cents integer, comision_pct numeric, amount_cents integer, currency text,
  status text, creada_en timestamptz, pagada_en timestamptz, pagada_nota text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id,
         coalesce(nullif(btrim(pr.business_name), ''), pr.full_name, '(sin nombre)'),
         c.es_primer_pago, c.base_cents, c.comision_pct, c.amount_cents, c.currency,
         c.status, c.creada_en, c.pagada_en, c.pagada_nota
  from public.membership_commissions c
  join public.profiles pr on pr.id = c.referred_id
  where public.is_admin_or_advisor() and c.referrer_id = p_referrer
  order by c.creada_en desc;
$$;

revoke all on function public.admin_comisiones_detalle(uuid) from public, anon;
grant execute on function public.admin_comisiones_detalle(uuid) to authenticated, service_role;


-- Liquidar: marca como pagadas TODAS las devengadas de un referidor y deja la
-- constancia de como se le pago. No toca las ya pagadas ni las revertidas.
create or replace function public.admin_liquidar_comisiones(p_referrer uuid, p_nota text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_n int; v_monto bigint;
begin
  if not public.is_admin() then
    raise exception 'solo_admin' using errcode = 'insufficient_privilege';
  end if;

  with liq as (
    update public.membership_commissions
       set status = 'pagada', pagada_en = now(),
           pagada_nota = left(coalesce(p_nota, ''), 300)
     where referrer_id = p_referrer and status = 'devengada'
    returning amount_cents
  )
  select count(*), coalesce(sum(amount_cents), 0) into v_n, v_monto from liq;

  if v_n > 0 then
    insert into public.notifications (user_id, type, title, body, data)
    values (p_referrer, 'referral_reward', 'Sus comisiones fueron liquidadas',
            'Se liquidaron ' || v_n || ' comisiones por referidos.',
            jsonb_build_object('comisiones', v_n, 'amount_cents', v_monto));
  end if;

  return jsonb_build_object('ok', true, 'comisiones', v_n, 'amount_cents', v_monto);
end;
$$;

comment on function public.admin_liquidar_comisiones(uuid, text) is
  'Marca como pagadas las comisiones devengadas de un referidor y le avisa. Solo admin.';

revoke all on function public.admin_liquidar_comisiones(uuid, text) from public, anon;
grant execute on function public.admin_liquidar_comisiones(uuid, text) to authenticated, service_role;
