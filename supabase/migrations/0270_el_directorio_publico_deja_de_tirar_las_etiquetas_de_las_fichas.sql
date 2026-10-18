-- 0270: la vista directorio_publico dejaba caer seis columnas de TODA ficha que
-- viene de la tabla "directorio" (las que todavia no han sido reclamadas).
--
-- Medido el 17 de octubre de 2026, antes del cambio: la mitad de la vista que
-- corresponde a "directorio" devolvia literalmente '{}'::text[] en sections,
-- neuro_conditions, specialties, intervention_areas y product_categories, y
-- NULL en profession, para las 1,819 fichas publicadas. El dato SI estaba en la
-- tabla: 1,803 fichas con sections, 1,631 con 'neurodesarrollo', 412 con
-- specialties, 484 con intervention_areas y 689 con profession.
--
-- Consecuencia visible para el usuario: la pagina /directorio entra por omision
-- en la pestana "Neurodesarrollo", que filtra por sections, y mostraba
-- "Ningun proveedor coincide con estos filtros" aunque hubiera 1,819 fichas
-- publicadas. Es decir, el visitante de Espana, Portugal o Brasil llegaba a un
-- directorio aparentemente vacio tres dias antes de que salieran las tandas.
--
-- El cambio se hace por sustitucion de texto sobre la definicion viva de la
-- vista, no reescribiendola a mano, para no introducir diferencias silenciosas
-- en las otras ~60 columnas. Cada ancla se verifica: si no aparece exactamente
-- una vez, la migracion aborta y no toca nada.

do $mig$
declare
  v_def  text;
  v_par  text[] := array[
    '''{}''::text[] AS sections',           'd.sections AS sections',
    '''{}''::text[] AS neuro_conditions',   'd.neuro_conditions AS neuro_conditions',
    '''{}''::text[] AS specialties',        'd.specialties AS specialties',
    '''{}''::text[] AS intervention_areas', 'd.intervention_areas AS intervention_areas',
    '''{}''::text[] AS product_categories', 'd.product_categories AS product_categories',
    'NULL::text AS profession',             'd.profession AS profession'
  ];
  v_viejo text;
  v_nuevo text;
  i int;
  v_veces int;
begin
  select pg_get_viewdef('public.directorio_publico'::regclass, true) into v_def;

  i := 1;
  while i < array_length(v_par, 1) loop
    v_viejo := v_par[i];
    v_nuevo := v_par[i + 1];

    v_veces := (length(v_def) - length(replace(v_def, v_viejo, ''))) / length(v_viejo);

    if v_veces <> 1 then
      raise exception
        'La migracion 0270 esperaba encontrar % exactamente una vez en directorio_publico y lo encontro % veces. No se toco la vista.',
        v_viejo, v_veces;
    end if;

    v_def := replace(v_def, v_viejo, v_nuevo);
    i := i + 2;
  end loop;

  execute 'create or replace view public.directorio_publico as ' || v_def;
end
$mig$;

comment on view public.directorio_publico is
  'Union de profiles + directorio para el directorio abierto. Desde la 0270 las fichas no reclamadas tambien exponen sus etiquetas (sections, neuro_conditions, specialties, intervention_areas, product_categories, profession), que antes salian vacias.';
