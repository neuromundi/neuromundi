-- ============================================================================
-- Estructura de cuotas: periodicidad, clase de miembro y precio de referencia
-- ----------------------------------------------------------------------------
-- Modelo acordado:
--   · Dos periodicidades que elige el usuario al pagar: MENSUAL o ANUAL.
--   · El ANUAL siempre equivale a 10 meses (contratas 12, pagas 10). El importe
--     de 12 meses se conserva como precio de REFERENCIA para mostrarlo tachado.
--   · Dos clases de miembro: FUNDADOR y ORDINARIA, con precios distintos.
--   · Todo por tipo de afiliado y país. Se siembra México; el resto lo agrega
--     el administrador desde el panel.
--
-- Tabla de México para ESPECIALISTA MÉDICO (la que definió el negocio):
--   Fundador:  mensual $1,000 · anual $10,000 (referencia $12,000)
--   Ordinaria: mensual $1,500 · anual $15,000 (referencia $18,000)
--
-- Idempotente. Requiere 0036 y 0037.
-- ============================================================================

-- ── Tipos de afiliado: se separan los especialistas médicos de los que no ────
alter table public.membership_fees drop constraint if exists membership_fees_affiliate_type_check;
alter table public.membership_fees
  add constraint membership_fees_affiliate_type_check
  check (affiliate_type in (
    'patient', 'parent',
    'medical_specialist', 'nonmedical_specialist',
    'service_provider', 'merchant', 'school', 'clinic'
  ));

insert into public.membership_fees (affiliate_type, base_usd) values
  ('medical_specialist', 50.00),
  ('nonmedical_specialist', 50.00),
  ('clinic', 50.00)
on conflict (affiliate_type) do nothing;

-- ── Precios con periodicidad y clase ────────────────────────────────────────
-- La tabla de 0036 guardaba un solo importe anual; se amplía conservando los
-- datos existentes (el importe anterior pasa a ser el anual cobrado).
alter table public.membership_prices
  add column if not exists member_class text not null default 'ordinary',
  add column if not exists monthly_amount numeric(12,2),
  add column if not exists annual_amount numeric(12,2),
  add column if not exists annual_list_amount numeric(12,2);

alter table public.membership_prices drop constraint if exists membership_prices_class_ck;
alter table public.membership_prices
  add constraint membership_prices_class_ck check (member_class in ('founder', 'ordinary'));

-- El importe anterior (columna `amount`) era el anual: se conserva.
update public.membership_prices
   set annual_amount = coalesce(annual_amount, amount)
 where annual_amount is null;

-- La clase forma parte de la identidad de la fila.
alter table public.membership_prices drop constraint if exists membership_prices_pkey;
alter table public.membership_prices
  add constraint membership_prices_pkey primary key (affiliate_type, country_label, member_class);

-- ── Semilla: México, especialista médico ────────────────────────────────────
insert into public.membership_prices
  (affiliate_type, country_label, member_class, currency, monthly_amount, annual_amount, annual_list_amount, amount, zero_decimal)
values
  ('medical_specialist', 'méxico', 'founder',   'MXN',  1000.00, 10000.00, 12000.00, 10000.00, false),
  ('medical_specialist', 'méxico', 'ordinary',  'MXN',  1500.00, 15000.00, 18000.00, 15000.00, false),
  ('medical_specialist', 'mexico', 'founder',   'MXN',  1000.00, 10000.00, 12000.00, 10000.00, false),
  ('medical_specialist', 'mexico', 'ordinary',  'MXN',  1500.00, 15000.00, 18000.00, 15000.00, false)
on conflict (affiliate_type, country_label, member_class) do update
  set currency = excluded.currency,
      monthly_amount = excluded.monthly_amount,
      annual_amount = excluded.annual_amount,
      annual_list_amount = excluded.annual_list_amount,
      amount = excluded.amount,
      updated_at = now();

-- ── Resolución de precio: tipo × país × clase × periodicidad ────────────────
-- Devuelve el importe a cobrar y el de referencia (para tacharlo en la UI).
-- Si el país no tiene precio propio cae a 'default'; si tampoco, calcula desde
-- base_usd × tipo de cambio y deriva anual = mensual × 10.
drop function if exists public.membership_price_for(text, text);
create or replace function public.membership_price_for(
  p_type text,
  p_country text,
  p_class text default 'ordinary',
  p_period text default 'annual'
)
returns table (
  currency text,
  amount numeric,
  list_amount numeric,
  monthly_amount numeric,
  annual_amount numeric,
  annual_list_amount numeric,
  zero_decimal boolean,
  is_override boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_label text := lower(trim(coalesce(p_country, '')));
  v_class text := case when p_class = 'founder' then 'founder' else 'ordinary' end;
  v_row public.membership_prices%rowtype;
  v_base numeric; v_cur text; v_fx numeric; v_zero boolean;
  v_monthly numeric; v_annual numeric; v_list numeric;
begin
  -- 1) Precio explícito del país; si no, el de 'default'.
  select * into v_row from public.membership_prices mp
   where mp.affiliate_type = p_type and mp.country_label = v_label
     and mp.member_class = v_class and mp.is_active = true;
  if not found then
    select * into v_row from public.membership_prices mp
     where mp.affiliate_type = p_type and mp.country_label = 'default'
       and mp.member_class = v_class and mp.is_active = true;
  end if;

  if found then
    v_cur := v_row.currency;
    v_zero := v_row.zero_decimal;
    v_monthly := v_row.monthly_amount;
    v_annual := coalesce(v_row.annual_amount, v_row.amount);
    v_list := v_row.annual_list_amount;
    -- Coherencia: si falta alguno se deriva (anual = 10 meses, lista = 12).
    if v_monthly is null and v_annual is not null then v_monthly := round(v_annual / 10, 2); end if;
    if v_annual is null and v_monthly is not null then v_annual := round(v_monthly * 10, 2); end if;
    if v_list is null and v_monthly is not null then v_list := round(v_monthly * 12, 2); end if;
    return query select v_cur,
      case when p_period = 'monthly' then v_monthly else v_annual end,
      case when p_period = 'monthly' then null::numeric else v_list end,
      v_monthly, v_annual, v_list, v_zero, true;
    return;
  end if;

  -- 2) Sin precio explícito: base USD × tipo de cambio del país.
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

  v_annual := round(v_base * v_fx, case when v_zero then 0 else 2 end);
  v_monthly := round(v_annual / 10, case when v_zero then 0 else 2 end);
  v_list := round(v_monthly * 12, case when v_zero then 0 else 2 end);

  return query select v_cur,
    case when p_period = 'monthly' then v_monthly else v_annual end,
    case when p_period = 'monthly' then null::numeric else v_list end,
    v_monthly, v_annual, v_list, v_zero, false;
end; $$;
grant execute on function public.membership_price_for(text, text, text, text) to authenticated, service_role;

-- get_membership_quote conserva su firma (la usa el front actual).
drop function if exists public.get_membership_quote(text, text);
create or replace function public.get_membership_quote(p_type text, p_country text)
returns table (currency text, amount numeric, base_usd numeric)
language sql stable security definer set search_path = public as $$
  select mp.currency, mp.amount,
         (select mf.base_usd from public.membership_fees mf
           where mf.affiliate_type = p_type and mf.is_active = true)
  from public.membership_price_for(p_type, p_country, 'ordinary', 'annual') mp;
$$;
grant execute on function public.get_membership_quote(text, text) to authenticated;

-- ── Panel: matriz de un país con AMBAS clases ───────────────────────────────
drop function if exists public.admin_country_prices(text);
create or replace function public.admin_country_prices(p_country text)
returns table (
  affiliate_type text,
  member_class text,
  currency text,
  monthly_amount numeric,
  annual_amount numeric,
  annual_list_amount numeric,
  zero_decimal boolean,
  is_override boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select t.affiliate_type, c.member_class, pr.currency,
         pr.monthly_amount, pr.annual_amount, pr.annual_list_amount,
         pr.zero_decimal, pr.is_override
  from (select mf.affiliate_type from public.membership_fees mf where mf.is_active = true) t
  cross join (values ('founder'), ('ordinary')) as c(member_class)
  cross join lateral public.membership_price_for(t.affiliate_type, p_country, c.member_class, 'annual') pr
  order by t.affiliate_type, c.member_class desc;
end; $$;
revoke all on function public.admin_country_prices(text) from public, anon;
grant execute on function public.admin_country_prices(text) to authenticated;

-- ── Panel: guardar una fila completa (mensual + anual + referencia) ─────────
drop function if exists public.admin_set_membership_price(text, text, text, numeric, boolean);
create or replace function public.admin_set_membership_price(
  p_type text,
  p_country text,
  p_class text,
  p_currency text,
  p_monthly numeric,
  p_annual numeric,
  p_annual_list numeric,
  p_zero_decimal boolean default false
) returns json
language plpgsql security definer set search_path = public as $$
declare v_class text := case when p_class = 'founder' then 'founder' else 'ordinary' end;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_monthly is null or p_monthly < 0 or p_annual is null or p_annual < 0 then
    return json_build_object('ok', false, 'error', 'bad_amount');
  end if;
  insert into public.membership_prices (
    affiliate_type, country_label, member_class, currency,
    monthly_amount, annual_amount, annual_list_amount, amount, zero_decimal, updated_at
  ) values (
    p_type, lower(trim(p_country)), v_class, upper(trim(p_currency)),
    p_monthly, p_annual, coalesce(p_annual_list, round(p_monthly * 12, 2)),
    p_annual, coalesce(p_zero_decimal, false), now()
  )
  on conflict (affiliate_type, country_label, member_class) do update
    set currency = excluded.currency,
        monthly_amount = excluded.monthly_amount,
        annual_amount = excluded.annual_amount,
        annual_list_amount = excluded.annual_list_amount,
        amount = excluded.amount,
        zero_decimal = excluded.zero_decimal,
        is_active = true,
        updated_at = now();
  return json_build_object('ok', true);
end; $$;
revoke all on function public.admin_set_membership_price(text, text, text, text, numeric, numeric, numeric, boolean) from public, anon;
grant execute on function public.admin_set_membership_price(text, text, text, text, numeric, numeric, numeric, boolean) to authenticated;

drop function if exists public.admin_clear_membership_price(text, text);
create or replace function public.admin_clear_membership_price(p_type text, p_country text, p_class text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.membership_prices
   where affiliate_type = p_type
     and country_label = lower(trim(p_country))
     and member_class = case when p_class = 'founder' then 'founder' else 'ordinary' end;
  return json_build_object('ok', true);
end; $$;
revoke all on function public.admin_clear_membership_price(text, text, text) from public, anon;
grant execute on function public.admin_clear_membership_price(text, text, text) to authenticated;
