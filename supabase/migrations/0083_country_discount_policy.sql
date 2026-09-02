-- ============================================================================
-- Política de descuento por país, controlable por el admin desde el panel.
-- ----------------------------------------------------------------------------
-- · Nueva tabla country_discount_policies: % de descuento por país. Se aplica
--   SOBRE el precio ya resuelto por membership_price_for() (venga de una fila
--   explícita en membership_prices o del fallback por FX de country_pricing),
--   sin importar el tipo de afiliado — un solo % cubre TODOS los tipos de ese
--   país, en vez de tener que reeditar cada cuota una por una.
-- · membership_price_for() se modifica para aplicar el descuento al final,
--   escalando monthly/annual/annual_list de forma uniforme (mantiene la
--   proporción 10/12 meses). Misma firma de retorno (CREATE OR REPLACE, sin
--   cambiar columnas): transparente para todo lo que ya la consume (checkout,
--   admin_country_prices, my_membership_options) — cero cambios de frontend
--   requeridos para que el descuento surta efecto.
-- · RLS igual al patrón ya usado en country_pricing: SELECT para cualquier
--   autenticado, escritura solo is_admin(). Mismas grants por defecto de
--   Supabase (RLS es el filtro real).
-- · Punto 5 de la lista original ("completar semilla de países/tipos para el
--   descuento de 10 meses") se verificó innecesario: membership_price_for()
--   ya aplicaba el 10/12 automáticamente en cualquier país/tipo vía el
--   fallback de base_usd × FX. Lo único que faltaba era darle al admin una
--   palanca de descuento por país sin tener que reescribir cuotas absolutas
--   una por una — eso es exactamente esta migración.
-- ============================================================================

create table if not exists public.country_discount_policies (
  country_label text primary key,
  discount_pct numeric not null check (discount_pct >= 0 and discount_pct <= 100),
  is_active boolean not null default true,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.country_discount_policies enable row level security;

create policy discount_policies_select on public.country_discount_policies
  for select using (auth.uid() is not null);
create policy discount_policies_admin_write on public.country_discount_policies
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.membership_price_for(p_type text, p_country text, p_class text default 'ordinary', p_period text default 'annual')
returns table(currency text, amount numeric, list_amount numeric, monthly_amount numeric, annual_amount numeric, annual_list_amount numeric, zero_decimal boolean, is_override boolean)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_label text := public.normalize_country(p_country);
  v_class text := case when p_class = 'founder' then 'founder' else 'ordinary' end;
  v_row public.membership_prices%rowtype;
  v_base numeric; v_cur text; v_fx numeric; v_zero boolean;
  v_monthly numeric; v_annual numeric; v_list numeric;
  v_pct numeric; v_scale numeric; v_dec int;
begin
  select dp.discount_pct into v_pct
    from public.country_discount_policies dp
   where dp.country_label = v_label and dp.is_active = true;

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

    v_dec := case when v_zero then 0 else 2 end;
    if v_pct is not null and v_pct > 0 then
      v_scale := 1 - (v_pct / 100);
      v_monthly := round(v_monthly * v_scale, v_dec);
      v_annual := round(v_annual * v_scale, v_dec);
      v_list := round(v_list * v_scale, v_dec);
    end if;

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

  v_dec := case when v_zero then 0 else 2 end;
  v_annual := round(v_base * v_fx, v_dec);
  v_monthly := round(v_annual / 10, v_dec);
  v_list := round(v_monthly * 12, v_dec);

  if v_pct is not null and v_pct > 0 then
    v_scale := 1 - (v_pct / 100);
    v_monthly := round(v_monthly * v_scale, v_dec);
    v_annual := round(v_annual * v_scale, v_dec);
    v_list := round(v_list * v_scale, v_dec);
  end if;

  return query select v_cur,
    case when p_period = 'monthly' then v_monthly else v_annual end,
    case when p_period = 'monthly' then null::numeric else v_list end,
    v_monthly, v_annual, v_list, v_zero, false;
end; $function$;
