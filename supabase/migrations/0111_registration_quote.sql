-- ============================================================================
-- 0111 · registration_quote — precio limpio para el MODAL DE REGISTRO
--
-- Lee SOLO membership_prices (sin el fallback de membership_fees): si el
-- tipo/país no tiene precio configurado devuelve {configured:false} y el front
-- no muestra ningún dato. Para 'specialist' devuelve el MÍNIMO ("desde") entre
-- medical_specialist y nonmedical_specialist. Empareja país con normalize_country
-- (la tabla guarda "mexico" en minúsculas/sin acento; el front envía "México").
-- Read-only, SECURITY DEFINER, para anon+authenticated. Idempotente.
-- ============================================================================
create or replace function public.registration_quote(p_type text, p_country text)
returns jsonb
language sql stable security definer set search_path = public as $$
  with cand as (
    select member_class, currency, monthly_amount, annual_amount
    from public.membership_prices
    where is_active
      and public.normalize_country(country_label) = public.normalize_country(coalesce(p_country,''))
      and (
        (p_type = 'specialist' and affiliate_type in ('medical_specialist','nonmedical_specialist'))
        or (p_type <> 'specialist' and affiliate_type = p_type)
      )
  ),
  f as (select * from cand where member_class = 'founder'  order by monthly_amount asc nulls last limit 1),
  o as (select * from cand where member_class = 'ordinary' order by monthly_amount asc nulls last limit 1)
  select case
    when not exists (select 1 from cand) then jsonb_build_object('configured', false)
    else jsonb_build_object(
      'configured', true,
      'is_from', (p_type = 'specialist'),
      'currency', coalesce((select currency from f), (select currency from o)),
      'founder_monthly',  (select monthly_amount from f),
      'founder_annual',   (select annual_amount  from f),
      'ordinary_monthly', (select monthly_amount from o),
      'ordinary_annual',  (select annual_amount  from o)
    )
  end;
$$;
revoke all on function public.registration_quote(text, text) from public;
grant execute on function public.registration_quote(text, text) to anon, authenticated;
