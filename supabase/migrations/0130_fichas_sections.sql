-- 0130_fichas_sections.sql
-- Las fichas del directorio (por invitar) deben aparecer al filtrar por sección
-- en el buscador. Hoy la vista directorio_publico devolvía '{}' fijo en sections
-- para la rama de fichas, así que cualquier selección de sección las ocultaba.
-- 1) columna sections en directorio + backfill de las publicadas con las 3 secciones.
alter table public.directorio add column if not exists sections text[] not null default '{}';

update public.directorio
   set sections = array['neurodesarrollo','neurodivergencias','afecciones']
 where estado_revision = 'publicado'
   and (sections is null or cardinality(sections) = 0);

-- 2) Reescribe SOLO la expresión de sections en la vista (rama de fichas) a
--    COALESCE(d.sections, '{}') sin transcribir el resto de columnas.
do $$
declare v text;
begin
  v := pg_get_viewdef('public.directorio_publico'::regclass);
  v := replace(v, '''{}''::text[] AS sections', 'COALESCE(d.sections, ''{}''::text[]) AS sections');
  execute 'create or replace view public.directorio_publico as ' || v;
end $$;
