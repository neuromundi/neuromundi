-- ============================================================================
-- Cuotas para CUALQUIER país desde el panel
-- ----------------------------------------------------------------------------
-- admin_membership_prices() solo listaba las combinaciones de country_pricing
-- (que trae 'default', México y Estados Unidos), así que el admin no podía fijar
-- la cuota de otros países. Estas dos RPC permiten trabajar país por país sobre
-- la lista completa: se consulta el precio efectivo de un país cualquiera y se
-- sabe cuáles ya tienen cuota propia. Idempotente. Requiere 0036.
-- ============================================================================

-- Precio efectivo de TODOS los tipos de afiliado para UN país.
create or replace function public.admin_country_prices(p_country text)
returns table (
  affiliate_type text,
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
  select t.affiliate_type, pr.currency, pr.amount, pr.zero_decimal, pr.is_override
  from (select mf.affiliate_type from public.membership_fees mf where mf.is_active = true) t
  cross join lateral public.membership_price_for(t.affiliate_type, p_country) pr
  order by t.affiliate_type;
end; $$;
revoke all on function public.admin_country_prices(text) from public, anon;
grant execute on function public.admin_country_prices(text) to authenticated;

-- Países que YA tienen al menos una cuota propia (para destacarlos en el panel).
create or replace function public.admin_configured_countries()
returns table (country_label text, types int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select mp.country_label, count(*)::int
  from public.membership_prices mp
  where mp.is_active = true
  group by mp.country_label
  order by mp.country_label;
end; $$;
revoke all on function public.admin_configured_countries() from public, anon;
grant execute on function public.admin_configured_countries() to authenticated;
