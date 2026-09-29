-- ============================================================================
-- 0139 — Cerrar los huecos de clasificación del directorio
--
-- El mayor cúmulo de las 132 fichas sin clasificar son COMERCIOS de ortopedia y
-- movilidad (sillas de ruedas, órtesis, prótesis, andaderas, férulas…), cuyo
-- "servicio" real es una CATEGORÍA DE PRODUCTO. La función 0137/0138 no llenaba
-- `product_categories`, así que ninguna regla podía clasificarlos. También faltaban
-- claves para inclusión laboral y deporte adaptado (áreas de intervención).
--
-- Esta migración:
--   1. Añade `directorio.product_categories` (la columna que faltaba).
--   2. Recrea `clasificar_directorio` para que también llene product_categories.
--   3. Expone product_categories real de las fichas en `directorio_publico`.
--   4. Inserta reglas nuevas (patrones SIN acentos, minúsculas: el texto llega
--      normalizado por sin_acentos()).
--   5. Re-clasifica.
--
-- Idempotente.
-- ============================================================================

alter table public.directorio add column if not exists product_categories text[] not null default '{}';

-- El CHECK de `destino` no contemplaba product_categories; se amplía.
alter table public.directorio_reglas_clasificacion
  drop constraint if exists directorio_reglas_clasificacion_destino_check;
alter table public.directorio_reglas_clasificacion
  add constraint directorio_reglas_clasificacion_destino_check
  check (destino = any (array['profession','specialties','intervention_areas','neuro_conditions','product_categories']));

-- 2 · Función: añade el manejo de product_categories (misma mecánica que las
--     otras listas; product_categories también es multivaluado).
create or replace function public.clasificar_directorio(p_forzar boolean default false)
returns integer
language plpgsql security definer set search_path to 'public'
as $function$
declare v_filas integer;
begin
  with base as (
    select d.id,
           public.sin_acentos(coalesce(d.nombre,'') || ' ' ||
                              coalesce(d.especializacion,'') || ' ' ||
                              coalesce(d.clase_scian,'')) as t
    from public.directorio d
    where p_forzar or d.clasificacion_auto or (
      d.profession is null and d.specialties = '{}'
      and d.intervention_areas = '{}' and d.neuro_conditions = '{}'
      and d.product_categories = '{}'
    )
  ),
  aciertos as (
    select b.id, r.destino, r.clave, r.prioridad
    from base b join public.directorio_reglas_clasificacion r on b.t ~ r.patron
  ),
  prof as (
    select distinct on (id) id, clave
    from aciertos where destino = 'profession'
    order by id, prioridad, clave
  ),
  listas as (
    select id, destino, array_agg(distinct clave order by clave) as claves
    from aciertos where destino <> 'profession'
    group by id, destino
  )
  update public.directorio d set
    profession         = coalesce((select clave from prof where prof.id = d.id), d.profession),
    specialties        = coalesce((select claves from listas l
                                    where l.id = d.id and l.destino='specialties'), '{}'),
    intervention_areas = coalesce((select claves from listas l
                                    where l.id = d.id and l.destino='intervention_areas'), '{}'),
    neuro_conditions   = coalesce((select claves from listas l
                                    where l.id = d.id and l.destino='neuro_conditions'), '{}'),
    product_categories = coalesce((select claves from listas l
                                    where l.id = d.id and l.destino='product_categories'), '{}'),
    clasificacion_auto = true,
    actualizada_en     = now()
  where d.id in (select id from base);

  get diagnostics v_filas = row_count;
  return v_filas;
end $function$;

-- 3 · Vista: la rama de fichas expone el product_categories real (antes '{}').
--     Reemplazo quirúrgico sobre la definición viva (mismo método que 0131/0132).
--     `'{}'::text[] AS product_categories` es único en la vista (la rama de
--     perfiles usa p.product_categories, sin AS).
do $$
declare v text;
begin
  v := pg_get_viewdef('public.directorio_publico'::regclass);
  v := replace(v, '''{}''::text[] AS product_categories',
                  'COALESCE(d.product_categories, ''{}''::text[]) AS product_categories');
  execute 'create or replace view public.directorio_publico as ' || v;
end $$;

-- 4 · Reglas nuevas (patrones en minúsculas y SIN acentos).
insert into public.directorio_reglas_clasificacion (destino, clave, patron, prioridad) values
  ('product_categories', 'ayudas_tecnicas',
   'silla de ruedas|sillas de ruedas|ortopedi|ortesis|protesis|ayuda tecnica|ayudas tecnicas|andadera|muleta|ferula|aparato ortoped|calzado ortoped|baston|grua de traslado', 100),
  ('intervention_areas', 'inclusion_laboral',
   'inclusion laboral|empleo con apoyo|empleo inclusiv|insercion laboral|integracion laboral|bolsa de trabajo|empleabilidad', 100),
  ('intervention_areas', 'deporte_adaptado',
   'deporte adaptado|deporte inclusiv|actividad fisica adaptada|paralimpic', 100)
on conflict do nothing;

-- 5 · Re-clasificar (solo automáticas + sin clasificar; respeta correcciones
--     manuales con clasificacion_auto=false).
select public.clasificar_directorio(false);
