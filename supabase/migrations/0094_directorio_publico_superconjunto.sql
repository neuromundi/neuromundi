-- ============================================================================
-- 0094 · directorio_publico como superconjunto exacto de profiles
--
-- Por qué se rehace la vista de 0091:
--   El front asigna el resultado a Profile[] y lee campos como provider_details.
--   Si la vista expone menos columnas que profiles, TypeScript rechaza la
--   asignación y la página de inclusión escolar se queda sin datos. Aquí la
--   rama de fichas devuelve TODAS las columnas de profiles: las que la ficha
--   tiene con su valor, y las demás en null o en su valor por defecto.
--
--   Además, una ficha se calla mientras exista un perfil publicado con su
--   mismo id. Eso evita que un lugar aparezca dos veces durante la migración
--   y después de que alguien reclame su ficha.
--
-- Idempotente. Ya aplicada en producción el 2026-09-08.
-- ============================================================================

drop view if exists public.directorio_publico;

create view public.directorio_publico
with (security_invoker = on) as
  select p.*, 'perfil'::text as origen, null::text as clee, false as reclamable
  from public.profiles p
  where p.role = 'provider' and p.is_published
union all
  select
    d.id, 'provider'::text, d.nombre,
    null::text, d.telefono, null::text,
    d.id, d.provider_type, d.nombre,
    d.sitio_web, d.direccion, d.ciudad,
    'MX'::text, false, true,
    d.lat, d.lng, d.creada_en,
    d.actualizada_en, null::date, null::text,
    null::text, d.estado, d.ciudad,
    false, d.especializacion,
    'exempt'::text, null::timestamptz,
    null::timestamptz, null::text,
    null::text, null::text,
    null::text, d.sitio_web, null::text,
    null::text, null::text, null::text,
    null::text, null::timestamptz,
    null::text, false,
    false, null::numeric,
    null::text, null::text, null::text,
    null::text, null::text,
    null::text, null::text, null::text,
    null::text, null::text, null::text,
    '{}'::text[], null::text, null::text,
    '{}'::text[], false, null::text,
    null::text, null::text, null::text,
    null::text, '{}'::text[], '{}'::text[],
    '{}'::text[], '{}'::text[],
    '{}'::jsonb, '{}'::text[],
    '{}'::text[], '{}'::text[],
    '{}'::text[], null::text,
    null::tsvector, null::text, null::bigint,
    false, null::bigint, null::timestamptz,
    0::numeric, null::boolean,
    null::timestamptz, null::timestamptz,
    null::boolean, null::timestamptz,
    false, false, false,
    '{}'::text[], '{}'::text[],
    'ficha'::text, d.clee, true
  from public.directorio d
  where d.estado_revision = 'publicado'
    and not d.baja_solicitada
    and d.reclamada_por is null
    and not exists (
      select 1 from public.profiles p
      where p.id = d.id and p.is_published and p.role = 'provider'
    );

grant select on public.directorio_publico to anon, authenticated;

-- OJO: el orden de las columnas de la rama de fichas depende del orden de
-- columnas de public.profiles. Si añades una columna a profiles, añade su
-- equivalente aquí, en la misma posición, o la vista dejará de crearse.

select origen, count(*) from public.directorio_publico group by 1 order by 1;
