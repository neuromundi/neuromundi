-- Decision de Enyoria (20 oct 2026): el muro de Miembros Fundadores NO debe
-- mostrar a nadie todavia. Se abre por PAIS cuando ese pais ya tiene un primer
-- grupo representativo, y el numero no se anuncia en ningun texto publico.
--
-- El filtro vive en la BASE, no en la pantalla: si solo se ocultara en el
-- navegador, los nombres seguirian saliendo por la API publica a quien la
-- consultara directamente.
--
-- founders_wall_min_por_pais:
--   NULL  -> el muro esta CERRADO para todos los paises (estado actual).
--   N     -> un pais aparece cuando tiene al menos N fundadores publicados.
alter table public.campaign_config
  add column if not exists founders_wall_min_por_pais integer;

comment on column public.campaign_config.founders_wall_min_por_pais is
  'Minimo de fundadores publicados que necesita un pais para aparecer en el muro. NULL = muro cerrado. El numero NO se muestra en ningun texto publico.';

create or replace function public.founders_wall_countries()
returns table(country text, n bigint)
language sql
stable
security definer
set search_path to 'public'
as $$
  with tope as (select founders_wall_min_por_pais m from public.campaign_config where id = 1)
  select f.country, count(*)::bigint
  from public.founder_members f, tope
  where f.wall_published = true
    and f.country is not null
    and f.country <> ''
    and tope.m is not null
  group by f.country, tope.m
  having count(*) >= tope.m
  order by f.country asc;
$$;

create or replace function public.founders_wall_v2(p_country text default null::text)
returns table(display_name text, member_no bigint, kind text, country text, featured boolean, is_company boolean, provider_id uuid)
language sql
stable
security definer
set search_path to 'public'
as $$
  with tope as (select founders_wall_min_por_pais m from public.campaign_config where id = 1),
  paises_abiertos as (
    select f.country
    from public.founder_members f, tope
    where f.wall_published = true and f.country is not null and f.country <> ''
      and tope.m is not null
    group by f.country, tope.m
    having count(*) >= tope.m
  )
  select
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Neuromundi'),
    p.member_no,
    f.kind,
    f.country,
    f.wall_featured,
    coalesce(p.is_company, false),
    case
      when f.kind <> 'families' and public.perfil_publicado_y_vigente(p.id)
        then p.id
      else null::uuid
    end
  from public.founder_members f
  join public.profiles p on p.id = f.user_id
  where f.wall_published = true
    and coalesce(p.is_internal, false) = false
    and f.country in (select country from paises_abiertos)
    and (p_country is null or f.country = p_country)
  order by f.wall_featured desc, f.wall_order asc, p.member_no asc nulls last;
$$;
