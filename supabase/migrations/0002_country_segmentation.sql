-- ============================================================================
-- Segmentación por país (versión de producción)
-- ----------------------------------------------------------------------------
-- La plataforma segmenta Directorio, Inclusión y Academy por país. El país lo
-- elige la persona (se guarda en su navegador) y la app filtra por el NOMBRE
-- canónico del país (en español: "México", "Argentina"…), que es lo que el
-- formulario de registro guarda en `profiles.country` (lista src/data/countries.ts).
--
-- El filtrado se hace del lado del SERVIDOR (.eq('country', ...)), por lo que
-- estos índices son necesarios para el rendimiento a escala.
-- Idempotente: se puede ejecutar varias veces sin problema.
-- ============================================================================

-- 1) Índice para filtrar proveedores/escuelas por país sin escanear la tabla.
create index if not exists profiles_country_idx on public.profiles (country);

-- 2) Academy: país propio del curso (opcional).
--      country = NULL            → el curso hereda el país de su autor.
--      country = 'México', etc.  → el curso se muestra solo en ese país.
alter table public.courses add column if not exists country text;
create index if not exists courses_country_idx on public.courses (country);
create index if not exists courses_author_id_idx on public.courses (author_id);

-- 3) Vista pública de cursos con el "país efectivo" ya resuelto (país del curso
--    o, si es NULL, país del autor). Permite filtrar en el servidor con una sola
--    consulta:  select * from public.courses_public where effective_country = 'México';
--    security_invoker = on → respeta las políticas RLS de las tablas base.
create or replace view public.courses_public
  with (security_invoker = on) as
  select
    c.*,
    coalesce(c.country, p.country) as effective_country
  from public.courses c
  left join public.profiles p on p.id = c.author_id;

-- Índice de apoyo para el filtro por país efectivo desde la vista.
create index if not exists profiles_id_country_idx on public.profiles (id, country);
