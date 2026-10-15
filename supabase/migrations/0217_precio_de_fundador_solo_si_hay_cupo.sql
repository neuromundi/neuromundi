-- 0217 — El precio de fundador solo se anuncia si de verdad se puede obtener.
--
-- DOS FALLAS QUE CORRIGE.
--
-- (1) registration_quote devolvia SIEMPRE las dos clases de precio, sin mirar
--     cupo ni plazo. La pagina de registro decide con eso si pinta el precio
--     de fundador, el precio ordinario tachado y la insignia. Resultado: a un
--     visitante de un pais con el cupo agotado, o despues de la fecha limite
--     (Mexico: 18 nov 2026), se le anunciaba la mitad del precio que iba a
--     pagar. Es la primera cifra que ve un prospecto y no era la suya.
--
-- (2) Efecto colateral de la migracion 0216. Al vaciar monthly_amount en la
--     clase fundador, el 'order by monthly_amount asc nulls last limit 1' de
--     registration_quote se quedo ordenando una columna toda nula: para
--     p_type='specialist', que abarca medical_specialist y
--     nonmedical_specialist, el renglon elegido pasaba a ser arbitrario y
--     podia salir el caro donde la pagina promete 'desde'. Ahora se ordena por
--     annual_amount, que es la columna que de verdad tiene valor.
--
-- El cupo se cuenta por tipo de fundador y por pais, con la misma regla que
-- founder_eligible aplica al conceder el asiento, para que lo anunciado y lo
-- concedido no puedan divergir.

-- Traduce el tipo de afiliado (lo unico que conoce un visitante sin cuenta) al
-- tipo de fundador que usa el padron. Espeja founder_kind_for, que hace lo
-- mismo partiendo de un perfil ya creado.
create or replace function public.founder_kind_para_tipo(p_type text)
returns text
language sql
immutable
set search_path = public
as $fn$
  select case p_type
    when 'company'  then 'companies'
    when 'ngo'      then 'ngos'
    when 'merchant' then 'providers'
    else 'professionals'
  end;
$fn$;

-- Hay cupo de fundador para este tipo en este pais, y el plazo sigue abierto.
create or replace function public.founder_disponible(p_country text, p_type text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare v_kind text; v_limite timestamptz; v_usados int; v_pais text;
begin
  v_pais := coalesce(nullif(btrim(p_country), ''), '');
  if v_pais = '' then return false; end if;
  v_kind := public.founder_kind_para_tipo(p_type);

  select (value #>> '{}')::timestamptz into v_limite
  from public.campaign_config c, jsonb_each(c.founder_deadline_by_country)
  where c.id = 1 and key = v_pais;
  if v_limite is not null and now() >= v_limite then return false; end if;

  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal, false) = false and p.country = v_pais;

  return v_usados < public.founder_cap_for(v_pais, v_kind);
end;
$fn$;

grant execute on function public.founder_kind_para_tipo(text) to anon, authenticated;
grant execute on function public.founder_disponible(text, text) to anon, authenticated;

create or replace function public.registration_quote(p_type text, p_country text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  with disp as (
    select public.founder_disponible(p_country, p_type) as hay
  ),
  cand as (
    select member_class, currency, monthly_amount, annual_amount
    from public.membership_prices
    where is_active
      and public.normalize_country(country_label) = public.normalize_country(coalesce(p_country,''))
      and (
        (p_type = 'specialist' and affiliate_type in ('medical_specialist','nonmedical_specialist'))
        or (p_type <> 'specialist' and affiliate_type = p_type)
      )
  ),
  -- Se ordena por annual_amount: desde la migracion 0216 la columna mensual de
  -- la clase fundador esta vacia y no sirve para elegir el mas barato.
  f as (select * from cand where member_class = 'founder'  order by annual_amount asc nulls last limit 1),
  o as (select * from cand where member_class = 'ordinary' order by annual_amount asc nulls last limit 1)
  select case
    when not exists (select 1 from cand) then jsonb_build_object('configured', false)
    else jsonb_build_object(
      'configured', true,
      'is_from', (p_type = 'specialist'),
      'currency', coalesce((select currency from o), (select currency from f)),
      -- Sin cupo o fuera de plazo no hay precio de fundador que ofrecer: se
      -- devuelve nulo y la pagina muestra solo la cuota ordinaria.
      'founder_monthly',  case when (select hay from disp) then (select monthly_amount from f) end,
      'founder_annual',   case when (select hay from disp) then (select annual_amount  from f) end,
      'ordinary_monthly', (select monthly_amount from o),
      'ordinary_annual',  (select annual_amount  from o),
      'founder_open',     (select hay from disp)
    )
  end;
$fn$;
