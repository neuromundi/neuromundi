-- ============================================================================
-- 0140 — Derivar `sections` de las fichas para que el filtro por sección separe
--
-- Problema: la 0130 puso casi todas las fichas en las TRES secciones, así que el
-- selector de sección no discriminaba nada.
--
-- Ahora que existe la clasificación (0137–0139), se puede derivar la sección real:
--   · afecciones      = la ficha tiene alguna condición neurológica (neuro_conditions).
--   · neurodivergencias = marcadores de neurodivergencia (TEA, TDAH, dislexia…).
--   · neurodesarrollo = marcadores de desarrollo (estimulación temprana, lenguaje,
--                       discapacidad intelectual, Down…) O cualquier neurodivergencia
--                       (las neurodivergencias son de origen del neurodesarrollo, así
--                       que TEA/TDAH pertenecen también a neurodesarrollo).
--
-- CONSERVADOR: solo SOBRESCRIBE cuando logra determinar al menos una sección. Si
-- la ficha no da ninguna señal (p. ej. un comercio de ortopedia genérico), se deja
-- su valor actual intacto — nunca se vacía.
--
-- `seccion_auto` protege las correcciones manuales (ponlo en false y la función no
-- la vuelve a tocar). Esta derivación es una decisión de PRODUCTO: los patrones son
-- ajustables; reejecutar `derivar_secciones_directorio(true)` recalcula todo.
--
-- Idempotente.
-- ============================================================================

alter table public.directorio add column if not exists seccion_auto boolean not null default true;

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
           d.neuro_conditions
    from public.directorio d
    where p_forzar or d.seccion_auto
  ),
  flags as (
    select id,
      (coalesce(array_length(neuro_conditions,1),0) > 0) as afec,
      (t ~ 'autism|\mtea\M|asperger|tdah|\mtdh\M|deficit de atencion|dislexia|discalculia|disgrafia|dispraxia|tourette|altas capacidades|neurodivergen') as ndiv,
      (t ~ 'estimulacion temprana|atencion temprana|desarrollo infantil|neurodesarrollo|retraso del desarrollo|retraso en el desarrollo|psicomotor|psicomotric|discapacidad intelectual|sindrome de down|trisomia|lenguaje|foniatr|hitos del desarrollo') as ndes
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
    and array_length(c.secs,1) is not null;  -- solo si se determinó algo

  get diagnostics v_filas = row_count;
  return v_filas;
end $function$;

revoke all on function public.derivar_secciones_directorio(boolean) from public, anon, authenticated;

select public.derivar_secciones_directorio(false);
