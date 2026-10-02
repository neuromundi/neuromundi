-- ============================================================================
-- 0190 — Precio "desde" de Neuromundi por país para el comparativo del home.
--
-- El comparativo mostraba una cifra fija (nmPrice) que no reflejaba las cuotas
-- reales por moneda. Esta RPC devuelve el rango de cuota de FUNDADOR (anual) de
-- los tipos de PAGO en la moneda del país (el mínimo es el "desde"). Si el país
-- no tiene cuotas cargadas (fase "próximamente"), no devuelve filas y el front
-- cae al texto genérico. Pública (solo lectura). Idempotente.
-- ============================================================================
create or replace function public.nm_compare_price(p_country text)
returns table(currency text, min_founder numeric, max_founder numeric)
language sql stable security definer
set search_path to 'public'
as $$
  select mp.currency, min(mp.annual_amount), max(mp.annual_amount)
  from public.membership_prices mp
  where mp.country_label = public.normalize_country(p_country)
    and mp.is_active
    and mp.member_class = 'founder'
    and mp.affiliate_type not in ('patient','parent')
  group by mp.currency
  order by count(*) desc
  limit 1;
$$;
grant execute on function public.nm_compare_price(text) to anon, authenticated;
