-- ============================================================================
-- País canónico: sin acentos, para que "México" y "Mexico" sean UNO solo
-- ----------------------------------------------------------------------------
-- El país se guarda como texto libre y solo se pasaba a minúsculas, así que
-- 'méxico' y 'mexico' convivían como países distintos: el selector de Cuotas
-- mostraba México duplicado y las cuotas podían quedar en la fila equivocada
-- según cómo escribiera el país cada persona al registrarse.
--
-- Solución: una forma canónica sin acentos que se aplica al guardar Y al
-- consultar. Se fusionan las filas existentes conservando la que tenga datos.
-- Idempotente. Requiere 0038 y 0040.
-- ============================================================================

create or replace function public.normalize_country(p text)
returns text
language sql immutable set search_path = public as $$
  select translate(
    lower(btrim(coalesce(p, ''))),
    'áàäâãÁÀÄÂÃéèëêÉÈËÊíìïîÍÌÏÎóòöôõÓÒÖÔÕúùüûÚÙÜÛñÑçÇ',
    'aaaaaaaaaaeeeeeeeeiiiiiiiioooooooooouuuuuuuunncc'
  );
$$;
grant execute on function public.normalize_country(text) to authenticated, service_role, anon;

-- ── Fusionar duplicados en membership_prices ────────────────────────────────
-- Se queda la fila con importes; si ambas los tienen, la más reciente.
with ranked as (
  select ctid,
         public.normalize_country(country_label) as norm,
         affiliate_type, member_class,
         row_number() over (
           partition by affiliate_type, public.normalize_country(country_label), member_class
           order by (monthly_amount is not null) desc, updated_at desc
         ) as rn
  from public.membership_prices
)
delete from public.membership_prices mp
using ranked r
where mp.ctid = r.ctid and r.rn > 1;

update public.membership_prices
   set country_label = public.normalize_country(country_label)
 where country_label <> public.normalize_country(country_label);

-- ── Fusionar duplicados en country_pricing ─────────────────────────────────
with ranked as (
  select ctid,
         row_number() over (
           partition by public.normalize_country(country_label)
           order by is_active desc, updated_at desc
         ) as rn
  from public.country_pricing
)
delete from public.country_pricing cp
using ranked r
where cp.ctid = r.ctid and r.rn > 1;

update public.country_pricing
   set country_label = public.normalize_country(country_label)
 where country_label <> public.normalize_country(country_label);

-- ── Las funciones usan la forma canónica al consultar y al guardar ──────────
create or replace function public.membership_price_for(
  p_type text,
  p_country text,
  p_class text default 'ordinary',
  p_period text default 'annual'
)
returns table (
  currency text, amount numeric, list_amount numeric,
  monthly_amount numeric, annual_amount numeric, annual_list_amount numeric,
  zero_decimal boolean, is_override boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_label text := public.normalize_country(p_country);
  v_class text := case when p_class = 'founder' then 'founder' else 'ordinary' end;
  v_row public.membership_prices%rowtype;
  v_base numeric; v_cur text; v_fx numeric; v_zero boolean;
  v_monthly numeric; v_annual numeric; v_list numeric;
begin
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
    if v_monthly is null and v_annual is not null then v_monthly := round(v_annual / 10, 2); end if;
    if v_annual is null and v_monthly is not null then v_annual := round(v_monthly * 10, 2); end if;
    if v_list is null and v_monthly is not null then v_list := round(v_monthly * 12, 2); end if;
    return query select v_cur,
      case when p_period = 'monthly' then v_monthly else v_annual end,
      case when p_period = 'monthly' then null::numeric else v_list end,
      v_monthly, v_annual, v_list, v_zero, true;
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

  v_annual := round(v_base * v_fx, case when v_zero then 0 else 2 end);
  v_monthly := round(v_annual / 10, case when v_zero then 0 else 2 end);
  v_list := round(v_monthly * 12, case when v_zero then 0 else 2 end);

  return query select v_cur,
    case when p_period = 'monthly' then v_monthly else v_annual end,
    case when p_period = 'monthly' then null::numeric else v_list end,
    v_monthly, v_annual, v_list, v_zero, false;
end; $$;
grant execute on function public.membership_price_for(text, text, text, text) to authenticated, service_role;

create or replace function public.admin_set_membership_price(
  p_type text, p_country text, p_class text, p_currency text,
  p_monthly numeric, p_annual numeric, p_annual_list numeric,
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
    p_type, public.normalize_country(p_country), v_class, upper(btrim(p_currency)),
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

create or replace function public.admin_clear_membership_price(p_type text, p_country text, p_class text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.membership_prices
   where affiliate_type = p_type
     and country_label = public.normalize_country(p_country)
     and member_class = case when p_class = 'founder' then 'founder' else 'ordinary' end;
  return json_build_object('ok', true);
end; $$;
revoke all on function public.admin_clear_membership_price(text, text, text) from public, anon;
grant execute on function public.admin_clear_membership_price(text, text, text) to authenticated;
