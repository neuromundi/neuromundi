-- ============================================================================
-- Programa de recomendación: enlace único, 5% de descuento y reporte al admin
-- ----------------------------------------------------------------------------
-- Reglas de negocio acordadas:
--  · Cada usuario recomienda con su folio: /?ref=NM-000123
--  · El enlace CADUCA a los 7 días de recibirse (no se atribuye ni descuenta
--    después de esa ventana).
--  · Quien se suscribe con el enlace recibe 5% SOLO en su primer pago.
--  · Si quien usa el enlace es paciente/padre (membresía gratuita) NO hay
--    descuento ni recompensa, pero SÍ se registra el uso para futuras
--    recompensas.
--  · El referente acumula 5% por cada referido que efectivamente pague, con
--    tope configurable, aplicable a su siguiente pago.
--  · Los descuentos se ACUMULAN de forma compuesta sobre el precio ya rebajado.
-- Idempotente.
-- ============================================================================

-- ── Configuración editable por el admin (una sola fila) ─────────────────────
create table if not exists public.referral_config (
  id int primary key default 1,
  discount_pct numeric not null default 5,      -- % para quien usa el enlace
  validity_days int not null default 7,         -- vigencia del enlace
  referrer_step_pct numeric not null default 5, -- % que gana el referente por referido pagado
  referrer_max_pct numeric not null default 50, -- tope acumulado del referente
  constraint referral_config_single check (id = 1)
);
insert into public.referral_config (id) values (1) on conflict (id) do nothing;

alter table public.referral_config enable row level security;
drop policy if exists referral_config_read on public.referral_config;
create policy referral_config_read on public.referral_config
  for select using (auth.uid() is not null);
drop policy if exists referral_config_admin on public.referral_config;
create policy referral_config_admin on public.referral_config
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Momento de la atribución (para la ventana de 7 días) ────────────────────
alter table public.profiles
  add column if not exists referred_at timestamptz;

-- ── Registro de cada uso del enlace ─────────────────────────────────────────
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referrer_member_no bigint,
  referred_id uuid not null references auth.users(id) on delete cascade unique,
  referred_role text,               -- rol del referido al momento de usar el enlace
  is_paying_type boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists referrals_referrer_idx on public.referrals(referrer_id, created_at desc);

alter table public.referrals enable row level security;
drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id or public.is_admin());

-- ── Atribución del referente (reemplaza a set_referrer de 0013) ─────────────
-- Registra el uso del enlace y sella referred_at. Rechaza auto-referencia,
-- referidos duplicados y usuarios que ya pagaron.
-- Cambia el tipo de retorno (antes boolean): hay que soltarla primero.
drop function if exists public.set_referrer(bigint);

create or replace function public.set_referrer(p_member_no bigint)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_referrer uuid;
  v_my_role text;
  v_paying boolean;
begin
  if v_me is null then
    return json_build_object('ok', false, 'error', 'auth');
  end if;
  -- Ya tiene referente: no se reasigna nunca.
  if exists (select 1 from public.profiles p where p.id = v_me and p.referred_by is not null) then
    return json_build_object('ok', false, 'error', 'already');
  end if;
  select p.id into v_referrer from public.profiles p where p.member_no = p_member_no;
  if v_referrer is null then
    return json_build_object('ok', false, 'error', 'referrer_not_found');
  end if;
  if v_referrer = v_me then
    return json_build_object('ok', false, 'error', 'self');
  end if;

  select p.role into v_my_role from public.profiles p where p.id = v_me;
  -- Pagan cuota los prestadores (servicios, comercios, escuelas).
  v_paying := (v_my_role = 'provider');

  update public.profiles
     set referred_by = p_member_no,
         referred_at = now()
   where id = v_me;

  insert into public.referrals (referrer_id, referrer_member_no, referred_id, referred_role, is_paying_type)
  values (v_referrer, p_member_no, v_me, v_my_role, v_paying)
  on conflict (referred_id) do nothing;

  -- Aviso al referente (dispara también push nativo por el trigger de 0030).
  insert into public.notifications (user_id, type, title, body, data)
  values (v_referrer, 'referral_use', 'Usaron tu enlace',
          'Alguien se registró con tu recomendación.',
          json_build_object('referred_role', v_my_role, 'is_paying_type', v_paying));

  return json_build_object('ok', true, 'is_paying_type', v_paying);
end; $$;
revoke all on function public.set_referrer(bigint) from public;
grant execute on function public.set_referrer(bigint) to authenticated;

-- ── Descuento que corresponde a un usuario en su PRÓXIMO pago ──────────────
-- referral_pct : 5% por haber llegado con un enlace vigente y no haber pagado aún.
-- referrer_pct : 5% por cada referido suyo que ya pagó (con tope).
-- total_pct    : combinación COMPUESTA (se aplica una sobre la otra).
create or replace function public.membership_discount(p_user uuid)
returns table (referral_pct numeric, referrer_pct numeric, total_pct numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_cfg public.referral_config%rowtype;
  v_ref numeric := 0;
  v_own numeric := 0;
  v_has_paid boolean;
  v_role text;
  v_referred_by bigint;
  v_referred_at timestamptz;
  v_n int;
begin
  select * into v_cfg from public.referral_config where id = 1;
  if not found then
    return query select 0::numeric, 0::numeric, 0::numeric; return;
  end if;

  select p.role, p.referred_by, p.referred_at,
         (p.membership_paid_until is not null and p.membership_paid_until > now())
    into v_role, v_referred_by, v_referred_at, v_has_paid
  from public.profiles p where p.id = p_user;

  -- 1) Descuento por venir de un enlace: solo primer pago, solo si paga cuota,
  --    y solo dentro de la ventana de vigencia del enlace.
  if v_referred_by is not null
     and v_role = 'provider'
     and coalesce(v_has_paid, false) = false
     and v_referred_at is not null
     and now() <= v_referred_at + make_interval(days => v_cfg.validity_days)
  then
    v_ref := v_cfg.discount_pct;
  end if;

  -- 2) Descuento acumulado por recomendar: 5% por cada referido que YA pagó.
  select count(*)::int into v_n
  from public.referrals rf
  join public.profiles rp on rp.id = rf.referred_id
  where rf.referrer_id = p_user
    and rf.is_paying_type = true
    and rp.membership_paid_until is not null
    and rp.membership_paid_until > now();

  v_own := least(coalesce(v_n, 0) * v_cfg.referrer_step_pct, v_cfg.referrer_max_pct);

  -- Compuesto: precio * (1-a) * (1-b)  ->  descuento total equivalente.
  return query select
    v_ref,
    v_own,
    round((1 - (1 - v_ref/100.0) * (1 - v_own/100.0)) * 100, 2)::numeric;
end; $$;
revoke all on function public.membership_discount(uuid) from public;
grant execute on function public.membership_discount(uuid) to authenticated, service_role;

-- Atajo para el usuario en sesión (lo usa el front).
create or replace function public.my_membership_discount()
returns table (referral_pct numeric, referrer_pct numeric, total_pct numeric)
language sql stable security definer set search_path = public as $$
  select * from public.membership_discount(auth.uid());
$$;
revoke all on function public.my_membership_discount() from public;
grant execute on function public.my_membership_discount() to authenticated;

-- ── Resumen para el usuario que recomienda ─────────────────────────────────
create or replace function public.my_referral_summary()
returns table (
  total_uses int,
  paying_uses int,
  rewarded_uses int,
  accrued_pct numeric,
  max_pct numeric,
  step_pct numeric,
  validity_days int
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.referrals rf where rf.referrer_id = auth.uid()),
    (select count(*)::int from public.referrals rf
       where rf.referrer_id = auth.uid() and rf.is_paying_type = true),
    (select count(*)::int from public.referrals rf
       join public.profiles rp on rp.id = rf.referred_id
      where rf.referrer_id = auth.uid() and rf.is_paying_type = true
        and rp.membership_paid_until is not null and rp.membership_paid_until > now()),
    (select referrer_pct from public.membership_discount(auth.uid())),
    (select referrer_max_pct from public.referral_config where id = 1),
    (select referrer_step_pct from public.referral_config where id = 1),
    (select validity_days from public.referral_config where id = 1);
$$;
revoke all on function public.my_referral_summary() from public;
grant execute on function public.my_referral_summary() to authenticated;

-- Compatibilidad: my_referral_count sigue existiendo para el código previo.
drop function if exists public.my_referral_count();

create or replace function public.my_referral_count()
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.referrals rf where rf.referrer_id = auth.uid();
$$;
grant execute on function public.my_referral_count() to authenticated;

-- ── Reporte para el panel de administración ────────────────────────────────
create or replace function public.admin_referrals()
returns table (
  id uuid,
  used_at timestamptz,
  referrer_id uuid,
  referrer_name text,
  referrer_member_no bigint,
  referred_id uuid,
  referred_name text,
  referred_member_no bigint,
  referred_role text,
  is_paying_type boolean,
  referred_has_paid boolean,
  referred_paid_until timestamptz,
  link_still_valid boolean,
  reward_due boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_days int;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  select validity_days into v_days from public.referral_config where id = 1;
  return query
  select
    rf.id,
    rf.created_at,
    rf.referrer_id,
    coalesce(pr.business_name, pr.full_name),
    pr.member_no,
    rf.referred_id,
    coalesce(pd.business_name, pd.full_name),
    pd.member_no,
    rf.referred_role,
    rf.is_paying_type,
    (pd.membership_paid_until is not null and pd.membership_paid_until > now()),
    pd.membership_paid_until,
    (now() <= rf.created_at + make_interval(days => coalesce(v_days, 7))),
    -- Hay recompensa pendiente cuando el referido paga cuota y ya pagó.
    (rf.is_paying_type and pd.membership_paid_until is not null and pd.membership_paid_until > now())
  from public.referrals rf
  left join public.profiles pr on pr.id = rf.referrer_id
  left join public.profiles pd on pd.id = rf.referred_id
  order by rf.created_at desc;
end; $$;
revoke all on function public.admin_referrals() from public, anon;
grant execute on function public.admin_referrals() to authenticated;
