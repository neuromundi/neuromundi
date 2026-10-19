-- Hallazgo de la auditoría del 19 oct 2026, de la misma familia que la caída
-- del panel: la columna de áreas es texto libre y NADA impedía guardar un
-- valor fuera del catálogo. Importa más desde ayer, porque ahora son los
-- propios miembros quienes la escriben al subir su evento, su artículo, su
-- producto, su curso o su vacante.
--
-- Qué pasaría con un valor inválido: las tarjetas lo omiten (eso ya está bien
-- resuelto en el código), así que no se cae nada, pero la entrada quedaría
-- fuera de los filtros sin que nadie se entere. Un error silencioso.
--
-- Medido antes de aplicar: los 4,124 valores guardados hoy en las cuatro
-- tablas con datos son exactamente los tres del catálogo, así que la
-- restricción no rechaza nada de lo existente.
do $$
declare t text;
begin
  foreach t in array array['profiles','directorio','events','content_posts','products','courses','offers','job_openings'] loop
    if exists (select 1 from information_schema.columns
                where table_schema='public' and table_name=t and column_name='sections')
       and not exists (select 1 from pg_constraint
                        where conname = t || '_sections_del_catalogo') then
      execute format(
        'alter table public.%I add constraint %I check (sections <@ array[''neurodesarrollo'',''neurodivergencias'',''afecciones'']::text[])',
        t, t || '_sections_del_catalogo');
    end if;
  end loop;
end $$;
