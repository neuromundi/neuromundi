-- ============================================================================
-- Cuotas por tipo de usuario y país (editables desde el panel) + ajustes del
-- programa de recomendación
-- ----------------------------------------------------------------------------
--  A) membership_prices: precio EXPLÍCITO por (tipo de afiliado, país) en su
--     propia moneda. Si existe, manda sobre el cálculo base_usd × FX. Todo
--     editable por el admin desde el panel.
--  B) Se admite el tipo 'school' (escuelas), que faltaba en membership_fees.
--  C) referral_config editable por el admin (el % de comisión ya no se toca
--     por SQL). El usuario NUNCA puede editar su % ni su código.
--  D) Se registra el ROL DEL REFERENTE: pacientes y familias sí generan
--     recompensa, pero como su membresía es gratuita no se les puede aplicar
--     como descuento; el panel los marca para recompensa manual.
-- Idempotente. Requiere 0034 y 0035.
-- ============================================================================

-- ── B. Escuelas también pagan cuota ─────────────────────────────────────────
alter table public.membership_fees drop constraint if exists membership_fees_affiliate_type_check;
alter table public.membership_fees
  add constraint membership_fees_affiliate_type_check
  check (affiliate_type in ('patient', 'parent', 'service_provider', 'merchant', 'school'));
insert into public.membership_fees (affiliate_type, base_usd)
values ('school', 50.00) on conflict (affiliate_type) do nothing;

-- ── A. Precio explícito por tipo y país ─────────────────────────────────────
create table if not exists public.membership_prices (
  affiliate_type text not null,
  country_label  text not null,              -- en minúsculas, como country_pricing
  currency       text not null,              -- ISO 4217
  amount         numeric(12,2) not null check (amount >= 0),
  zero_decimal   boolean not null default false,
  is_active      boolean not null default true,
  updated_at     timestamptz not null default now(),
  primary key (affiliate_type, country_label)
);

alter table public.membership_prices enable row level security;
drop policy if exists membership_prices_read on public.membership_prices;
create policy membership_prices_read on public.membership_prices
  for select using (auth.uid() is not null);
drop policy if exists membership_prices_admin on public.membership_prices;
create policy membership_prices_admin on public.membership_prices
  for all using (public.is_admin()) with check (public.is_admin());

-- Precio efectivo: primero el explícito; si no hay, base_usd × FX del país.
create or replace function public.membership_price_for(p_type text, p_country text)
returns table (currency text, amount numeric, zero_decimal boolean, is_override boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_label text := lower(trim(coalesce(p_country, '')));
  v_row public.membership_prices%rowtype;
  v_base numeric;
  v_cur text; v_fx numeric; v_zero boolean;
begin
  select * into v_row from public.membership_prices mp
   where mp.affiliate_type = p_type and mp.country_label = v_label and mp.is_active = true;
  if found then
    return query select v_row.currency, v_row.amount, v_row.zero_decimal, true;
    return;
  end if;

  select mf.base_usd into v_base from public.membership_fees mf
   where mf.affiliate_type = p_type and mf.is_active = true;
  if v_base is null then return; end if;

  select cp.currency, cp.fx_per_usd, cp.zero_decimal into v_cur, v_fx, v_zero
    from public.country_pricing cp
   where cp.is_active = true and cp.country_label = v_label;
  if not found then
    select cp.currency, cp.fx_per_usd, cp.zero_decimal into v_cur, v_fx, v_zero
      from public.country_pricing cp where cp.country_label = 'default';
  end if;
  if v_cur is null then return; end if;

  return query select v_cur,
    round(v_base * v_fx, case when v_zero then 0 else 2 end)::numeric,
    v_zero, false;
end; $$;
grant execute on function public.membership_price_for(text, text) to authenticated, service_role;

-- get_membership_quote pasa a apoyarse en lo anterior (misma firma de antes).
drop function if exists public.get_membership_quote(text, text);
create or replace function public.get_membership_quote(p_type text, p_country text)
returns table (currency text, amount numeric, base_usd numeric)
language sql stable security definer set search_path = public as $$
  select mp.currency, mp.amount,
         (select mf.base_usd from public.membership_fees mf
           where mf.affiliate_type = p_type and mf.is_active = true)
  from public.membership_price_for(p_type, p_country) mp;
$$;
grant execute on function public.get_membership_quote(text, text) to authenticated;

-- ── Panel: matriz de cuotas y su edición ────────────────────────────────────
create or replace function public.admin_membership_prices()
returns table (
  affiliate_type text,
  country_label text,
  currency text,
  amount numeric,
  zero_decimal boolean,
  is_override boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select t.affiliate_type, c.country_label, pr.currency, pr.amount, pr.zero_decimal, pr.is_override
  from (select mf.affiliate_type from public.membership_fees mf where mf.is_active = true) t
  cross join (select cp.country_label from public.country_pricing cp where cp.is_active = true) c
  cross join lateral public.membership_price_for(t.affiliate_type, c.country_label) pr
  order by t.affiliate_type, c.country_label;
end; $$;
revoke all on function public.admin_membership_prices() from public, anon;
grant execute on function public.admin_membership_prices() to authenticated;

create or replace function public.admin_set_membership_price(
  p_type text, p_country text, p_currency text, p_amount numeric, p_zero_decimal boolean default false
) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_amount is null or p_amount < 0 then
    return json_build_object('ok', false, 'error', 'bad_amount');
  end if;
  insert into public.membership_prices (affiliate_type, country_label, currency, amount, zero_decimal, updated_at)
  values (p_type, lower(trim(p_country)), upper(trim(p_currency)), p_amount, coalesce(p_zero_decimal, false), now())
  on conflict (affiliate_type, country_label) do update
    set currency = excluded.currency,
        amount = excluded.amount,
        zero_decimal = excluded.zero_decimal,
        is_active = true,
        updated_at = now();
  return json_build_object('ok', true);
end; $$;
revoke all on function public.admin_set_membership_price(text, text, text, numeric, boolean) from public, anon;
grant execute on function public.admin_set_membership_price(text, text, text, numeric, boolean) to authenticated;

-- Quitar el precio explícito: vuelve al cálculo base_usd × FX.
create or replace function public.admin_clear_membership_price(p_type text, p_country text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.membership_prices
   where affiliate_type = p_type and country_label = lower(trim(p_country));
  return json_build_object('ok', true);
end; $$;
revoke all on function public.admin_clear_membership_price(text, text) from public, anon;
grant execute on function public.admin_clear_membership_price(text, text) to authenticated;

-- ── C. Configuración del programa de recomendación (solo admin) ─────────────
create or replace function public.admin_referral_config()
returns table (discount_pct numeric, validity_days int, referrer_step_pct numeric, referrer_max_pct numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select rc.discount_pct, rc.validity_days, rc.referrer_step_pct, rc.referrer_max_pct
    from public.referral_config rc where rc.id = 1;
end; $$;
revoke all on function public.admin_referral_config() from public, anon;
grant execute on function public.admin_referral_config() to authenticated;

create or replace function public.admin_set_referral_config(
  p_discount_pct numeric, p_validity_days int, p_referrer_step_pct numeric, p_referrer_max_pct numeric
) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_discount_pct < 0 or p_discount_pct > 100
     or p_referrer_step_pct < 0 or p_referrer_step_pct > 100
     or p_referrer_max_pct < 0 or p_referrer_max_pct > 100
     or p_validity_days < 1 then
    return json_build_object('ok', false, 'error', 'out_of_range');
  end if;
  update public.referral_config
     set discount_pct = p_discount_pct,
         validity_days = p_validity_days,
         referrer_step_pct = p_referrer_step_pct,
         referrer_max_pct = p_referrer_max_pct
   where id = 1;
  return json_build_object('ok', true);
end; $$;
revoke all on function public.admin_set_referral_config(numeric, int, numeric, numeric) from public, anon;
grant execute on function public.admin_set_referral_config(numeric, int, numeric, numeric) to authenticated;

-- ── D. Rol del referente: familias/pacientes se premian aparte ──────────────
alter table public.referrals
  add column if not exists referrer_role text;

update public.referrals rf
   set referrer_role = p.role
  from public.profiles p
 where p.id = rf.referrer_id and rf.referrer_role is null;

-- set_referrer vuelve a crearse guardando también el rol del referente.
drop function if exists public.set_referrer(bigint);
create or replace function public.set_referrer(p_member_no bigint)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_referrer uuid;
  v_referrer_role text;
  v_my_role text;
  v_paying boolean;
begin
  if v_me is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if exists (select 1 from public.profiles p where p.id = v_me and p.referred_by is not null) then
    return json_build_object('ok', false, 'error', 'already');
  end if;
  select p.id, p.role into v_referrer, v_referrer_role
    from public.profiles p where p.member_no = p_member_no;
  if v_referrer is null then return json_build_object('ok', false, 'error', 'referrer_not_found'); end if;
  if v_referrer = v_me then return json_build_object('ok', false, 'error', 'self'); end if;

  select p.role into v_my_role from public.profiles p where p.id = v_me;
  -- Sólo los prestadores pagan cuota: son los únicos que reciben descuento y
  -- los únicos cuyo pago genera recompensa para quien los recomendó.
  v_paying := (v_my_role = 'provider');

  update public.profiles set referred_by = p_member_no, referred_at = now() where id = v_me;

  insert into public.referrals (referrer_id, referrer_member_no, referrer_role, referred_id, referred_role, is_paying_type)
  values (v_referrer, p_member_no, v_referrer_role, v_me, v_my_role, v_paying)
  on conflict (referred_id) do nothing;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_referrer, 'referral_use', 'Usaron tu enlace',
          'Alguien se registró con tu recomendación.',
          json_build_object('referred_role', v_my_role, 'is_paying_type', v_paying));

  return json_build_object('ok', true, 'is_paying_type', v_paying);
end; $$;
revoke all on function public.set_referrer(bigint) from public;
grant execute on function public.set_referrer(bigint) to authenticated;

-- El reporte del panel distingue si la recompensa es descuento o manual.
-- Cambian las columnas de salida: hay que soltarla antes de recrearla.
drop function if exists public.admin_referrals();

create or replace function public.admin_referrals()
returns table (
  id uuid, used_at timestamptz,
  referrer_id uuid, referrer_name text, referrer_member_no bigint, referrer_role text,
  referred_id uuid, referred_name text, referred_member_no bigint, referred_role text,
  is_paying_type boolean, referred_has_paid boolean, referred_paid_until timestamptz,
  link_still_valid boolean, reward_due boolean, reward_manual boolean, reward_counted boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_days int;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select validity_days into v_days from public.referral_config where id = 1;
  return query
  select
    rf.id, rf.created_at,
    rf.referrer_id, coalesce(pr.business_name, pr.full_name), pr.member_no,
    coalesce(rf.referrer_role, pr.role),
    rf.referred_id, coalesce(pd.business_name, pd.full_name), pd.member_no, rf.referred_role,
    rf.is_paying_type,
    (pd.membership_paid_until is not null and pd.membership_paid_until > now()),
    pd.membership_paid_until,
    (now() <= rf.created_at + make_interval(days => coalesce(v_days, 7))),
    (rf.is_paying_type and pd.membership_paid_until is not null and pd.membership_paid_until > now()),
    -- Recompensa MANUAL: el referente no paga cuota, así que no puede recibirla
    -- como descuento de membresía.
    (rf.is_paying_type and pd.membership_paid_until is not null and pd.membership_paid_until > now()
      and coalesce(rf.referrer_role, pr.role) is distinct from 'provider'),
    (rf.reward_counted_at is not null)
  from public.referrals rf
  left join public.profiles pr on pr.id = rf.referrer_id
  left join public.profiles pd on pd.id = rf.referred_id
  order by rf.created_at desc;
end; $$;
revoke all on function public.admin_referrals() from public, anon;
grant execute on function public.admin_referrals() to authenticated;
