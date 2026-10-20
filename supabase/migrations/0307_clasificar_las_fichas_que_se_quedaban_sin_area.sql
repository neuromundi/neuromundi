-- ============================================================================
-- 0307 — Las fichas publicadas que no aparecian en ningun filtro
--
-- Quince fichas PUBLICADAS no tenian ninguna seccion asignada, asi que no
-- salian en ningun filtro del directorio: publicadas y a la vez invisibles.
-- El clasificador de la 0140 solo miraba el texto del nombre, la
-- especializacion y la clase SCIAN, y no reconocia como neurodesarrollo ni a
-- las escuelas de educacion especial (que SI lo declaran en datos
-- estructurados) ni a las clinicas de atencion infantil.
--
-- Agrega dos cosas:
--   1. Senales ESTRUCTURADAS, mas fiables que el texto: la profesion
--      `educacion_especial` y el area `educacion_inclusiva`.
--   2. Las formas en que realmente estan escritas las fichas: "necesidades
--      especiales", "educacion especial", "atencion infantil",
--      "infantojuvenil", "ninos y adolescentes", "terapia infantil",
--      "desarrollo integral", "psicopedagog".
--
-- OJO: esta version SUSTITUIA la lista de areas, y eso estrecho a 219 fichas
-- publicadas que antes aparecian en las tres. La 0308 lo corrige y restituye.
-- Se conserva este archivo para que la historia quede completa.
-- ============================================================================

create or replace function public.derivar_secciones_directorio(p_forzar boolean default false)
returns integer
language plpgsql security definer set search_path to 'public'
as $function$
declare v_filas integer;
begin
  with base as (
    select d.id,
           public.sin_acentos(coalesce(d.nombre,'') || ' ' ||
                              coalesce(d.especializacion,'') || ' ' ||
                              coalesce(d.clase_scian,'')) as t,
           d.neuro_conditions, d.profession, d.intervention_areas
    from public.directorio d
    where p_forzar or d.seccion_auto
  ),
  flags as (
    select id,
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
    select id,
      (array_remove(array[
        case when afec then 'afecciones' end,
        case when ndiv then 'neurodivergencias' end,
        case when (ndes or ndiv) then 'neurodesarrollo' end
      ], null))::text[] as secs
    from flags
  )
  update public.directorio d set
    sections = c.secs,
    seccion_auto = true,
    actualizada_en = now()
  from computed c
  where c.id = d.id
    and array_length(c.secs,1) is not null;

  get diagnostics v_filas = row_count;
  return v_filas;
end $function$;

revoke all on function public.derivar_secciones_directorio(boolean) from public, anon, authenticated;
