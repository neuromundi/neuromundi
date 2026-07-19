-- ============================================================================
-- Búsqueda de texto del directorio a escala (incluye los "Otro (especifica)")
-- ----------------------------------------------------------------------------
-- La app ya busca esos textos en el cliente (dentro del país seleccionado). Esta
-- migración prepara la BÚSQUEDA EN EL SERVIDOR para volúmenes grandes: crea una
-- columna `search_tsv` (full-text) que combina los campos de texto del perfil y
-- los valores libres "_other" guardados en provider_details, con índice GIN.
--
-- Es OPCIONAL: no rompe nada si no se usa. Cuando quieras, la búsqueda de texto
-- del directorio puede pasar a filtrar en el servidor con:
--    .textSearch('search_tsv', termino, { type: 'websearch', config: 'simple' })
-- Idempotente.
-- ============================================================================

-- 1) Función inmutable: concatena los campos buscables del perfil + los "_other".
create or replace function public.provider_search_text(
  business text, full_name text, profession text, bio text, pd jsonb
) returns text language sql immutable as $$
  select
    coalesce(business, '')   || ' ' ||
    coalesce(full_name, '')  || ' ' ||
    coalesce(profession, '') || ' ' ||
    coalesce(bio, '')        || ' ' ||
    coalesce((
      select string_agg(value, ' ')
      from jsonb_each_text(coalesce(pd, '{}'::jsonb))
      where key like '%\_other' escape '\'
    ), '')
$$;

-- 2) Columna full-text generada (se recalcula sola en cada insert/update).
alter table public.profiles
  add column if not exists search_tsv tsvector
  generated always as (
    to_tsvector('simple',
      public.provider_search_text(business_name, full_name, profession, bio, provider_details))
  ) stored;

-- 3) Índice GIN para búsquedas full-text rápidas.
create index if not exists profiles_search_tsv_idx on public.profiles using gin (search_tsv);
