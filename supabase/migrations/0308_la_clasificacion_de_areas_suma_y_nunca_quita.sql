-- ============================================================================
-- 0308 — La clasificacion de areas suma y nunca quita
--
-- Correccion de la 0307. Al mejorar el clasificador para rescatar las 15
-- fichas publicadas sin area, la funcion SUSTITUIA la lista de areas por la
-- calculada. Eso arreglo las 15, pero ESTRECHO a 219 fichas publicadas que
-- antes aparecian en las tres areas (valor que les puso la 0130) y pasaron a
-- aparecer en una sola. Una escuela de educacion especial dejaba de salir
-- cuando una madre filtraba por Neurodivergencias, aunque atienda a ninos
-- autistas.
--
-- Desde ahora la funcion SUMA: une lo calculado con lo que la ficha ya tenia.
-- Nunca le quita un area. Lo unico que hace es rellenar.
--
-- Primero restituye las tres areas a las fichas estrechadas. Se identifican
-- por ser exactamente aquellas en las que el clasificador VIEJO no encontraba
-- ninguna senal: toda esa poblacion tenia las tres. Es una reconstruccion
-- MEDIDA, no una suposicion: de las 858 fichas publicadas sin senal propia,
-- las 484 que la funcion nunca toco conservaban las tres areas exactamente, en
-- el mismo orden, sin una sola excepcion.
--
-- Comprobado despues de aplicarla: de las 169 fichas publicadas sin senal
-- propia que quedan con menos de tres areas, 166 son `seccion_auto = false`
-- (clasificadas a mano, que no se deben tocar) y las otras 3 son las unicas
-- que siguen sin area porque no hay con que clasificarlas.
-- ============================================================================

-- 1. Restitucion de las fichas estrechadas
with sin_senal_vieja as (
  select d.id
  from public.directorio d
  where d.seccion_auto
    and not (public.sin_acentos(coalesce(d.nombre,'')||' '||coalesce(d.especializacion,'')||' '||coalesce(d.clase_scian,''))
             ~ 'estimulacion temprana|atencion temprana|desarrollo infantil|neurodesarrollo|retraso del desarrollo|retraso en el desarrollo|psicomotor|psicomotric|discapacidad intelectual|sindrome de down|trisomia|lenguaje|foniatr|hitos del desarrollo')
    and not (public.sin_acentos(coalesce(d.nombre,'')||' '||coalesce(d.especializacion,'')||' '||coalesce(d.clase_scian,''))
             ~ 'autism|\mtea\M|asperger|tdah|\mtdh\M|deficit de atencion|dislexia|discalculia|disgrafia|dispraxia|tourette|altas capacidades|neurodivergen')
    and coalesce(array_length(d.neuro_conditions,1),0) = 0
)
update public.directorio d
set sections = array['neurodesarrollo','neurodivergencias','afecciones']::text[],
    actualizada_en = now()
from sin_senal_vieja s
where s.id = d.id
  and coalesce(array_length(d.sections,1),0) > 0
  and coalesce(array_length(d.sections,1),0) < 3;

-- 2. La funcion suma en vez de sustituir
create or replace function public.derivar_secciones_directorio(p_forzar boolean default false)
returns integer
language plpgsql security definer set search_path to 'public'
as $function$
declare v_filas integer;
begin
  with base as (
    select d.id, d.sections as actuales,
           public.sin_acentos(coalesce(d.nombre,'') || ' ' ||
                              coalesce(d.especializacion,'') || ' ' ||
                              coalesce(d.clase_scian,'')) as t,
           d.neuro_conditions, d.profession, d.intervention_areas
    from public.directorio d
    where p_forzar or d.seccion_auto
  ),
  flags as (
    select id, actuales,
      (coalesce(array_length(neuro_conditions,1),0) > 0) as afec,
      (t ~ 'autism|\mtea\M|asperger|tdah|\mtdh\M|deficit de atencion|dislexia|discalculia|disgrafia|dispraxia|tourette|altas capacidades|neurodivergen') as ndiv,
      (
        t ~ 'estimulacion temprana|atencion temprana|desarrollo infantil|neurodesarrollo|retraso del desarrollo|retraso en el desarrollo|psicomotor|psicomotric|discapacidad intelectual|sindrome de down|trisomia|lenguaje|foniatr|hitos del desarrollo'
        or t ~ 'necesidades especiales|educacion especial|educativa especial|inclusion educativa|educacion inclusiva'
        or t ~ 'atencion infantil|infantojuvenil|terapia infantil|ninos y adolescentes|menores|desarrollo integral|psicopedagog'
        or profession = 'educacion_especial'
        or 'educacion_inclusiva' = any(coalesce(intervention_areas, '{}'::text[]))
      ) as ndes
    from base
  ),
  computed as (
    select id, actuales,
      (array_remove(array[
        case when afec then 'afecciones' end,
        case when ndiv then 'neurodivergencias' end,
        case when (ndes or ndiv) then 'neurodesarrollo' end
      ], null))::text[] as secs
    from flags
  ),
  unidas as (
    -- SUMA: lo que ya tenia mas lo calculado, sin repetir. Nunca quita.
    select id,
      (select array_agg(distinct x) from unnest(coalesce(actuales,'{}'::text[]) || secs) as x) as secs
    from computed
    where array_length(secs,1) is not null
  )
  update public.directorio d set
    sections = u.secs,
    seccion_auto = true,
    actualizada_en = now()
  from unidas u
  where u.id = d.id
    and coalesce(d.sections,'{}'::text[]) <> u.secs;   -- solo si de verdad cambia

  get diagnostics v_filas = row_count;
  return v_filas;
end $function$;

revoke all on function public.derivar_secciones_directorio(boolean) from public, anon, authenticated;

select public.derivar_secciones_directorio(false);
