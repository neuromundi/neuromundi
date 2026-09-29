-- ============================================================================
-- 0138 · Clasificación del directorio: normalizar acentos y tapar huecos
--
-- EL PROBLEMA
--   La 0137 dejó 244 fichas sin clasificar. Al revisarlas, la causa principal no
--   era falta de reglas sino los ACENTOS del dato. Los patrones se escribieron
--   en ASCII y la coincidencia es literal:
--
--     'neuropsicolog'  NO casa con  'neuropsicológica'
--     'psicolog'       NO casa con  'psicológica'
--     'rehabilitacion' NO casa con  'rehabilitación'
--
--   El acento cae DENTRO de la subcadena buscada y la rompe. Funcionaban solo
--   las palabras cuyo acento queda fuera del trozo que se busca.
--
--   El segundo hueco era una frase: 53 fichas dicen «educación para necesidades
--   especiales» (la redacción del DENUE para escuelas de educación especial), y
--   ninguna regla la cubría. Una sola regla las recupera.
--
-- LA SOLUCIÓN
--   Normalizar el texto antes de comparar. No se usa unaccent() porque la
--   extensión no está instalada en este proyecto; translate() hace lo mismo,
--   es inmutable y no depende de extensiones.
--
--   Los patrones de la 0137 no hay que reescribirlos: los que llevan [óo] o
--   [íi] siguen casando con la forma sin acento.
--
-- Idempotente.
-- ============================================================================

create or replace function public.sin_acentos(p_texto text)
returns text language sql immutable parallel safe as $$
  select translate(lower(coalesce(p_texto,'')),
                   'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                   'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc');
$$;

comment on function public.sin_acentos(text) is
  'Minúsculas sin acentos, para comparar texto curado contra patrones ASCII. '
  'Se usa en clasificar_directorio(); unaccent() no está disponible aquí.';

-- ---------------------------------------------------------------------------
-- Reglas nuevas. Las que ya existían no se tocan: `on conflict` solo actualiza
-- las claves que aparecen abajo.
-- ---------------------------------------------------------------------------
insert into public.directorio_reglas_clasificacion (destino, clave, patron, prioridad) values
  -- 53 fichas: la redacción del DENUE para escuelas de educación especial.
  ('profession','educacion_especial',
   'educacion especial|escuela especial|necesidades especiales|centro de atencion multiple',65),
  ('intervention_areas','educacion_inclusiva',
   'inclusion (escolar|educativa)|educacion inclusiva|escuela inclusiva|educacion especial|integracion educativa|necesidades especiales|centro de atencion multiple',100),

  -- «rehabilitación neuromotora» no casaba con ningún patrón.
  ('profession','fisioterapia_neurologica',
   'fisioterapia neurol|neurorrehabilit|rehabilitacion neurol|neuromotor',45),
  ('intervention_areas','neurorrehabilitacion_motora',
   'neurorrehabilit|rehabilitacion neurol|neuromotor',100),

  -- Cuidados en casa y enfermería: categoría `caregiver` del directorio.
  ('profession','enfermeria_neurologica',
   'enfermer|cuidador|cuidado de pacientes|convalecient|estancia de dia',58),

  -- Derechos: amparo, pensiones y negligencia son el vocabulario real de estas
  -- fichas; 'juridico' y 'abogado' casi nunca aparecen escritos.
  ('intervention_areas','orientacion_legal_ddhh',
   'juridic|abogad|derechos humanos|orientacion legal|amparo|pension|negligencia medica|derechos de personas',100),

  -- Accesibilidad como servicio (consultoría B2B), distinta de la física.
  ('profession','accesibilidad_cognitiva','accesibilidad (cognitiva|digital)',68)
on conflict (destino, clave) do update
  set patron = excluded.patron, prioridad = excluded.prioridad;

-- ---------------------------------------------------------------------------
-- La función, ahora normalizando. Único cambio respecto a la 0137: el texto
-- pasa por sin_acentos() antes de comparar.
-- ---------------------------------------------------------------------------
create or replace function public.clasificar_directorio(p_forzar boolean default false)
returns integer
language plpgsql security definer set search_path = public as $$
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
    clasificacion_auto = true,
    actualizada_en     = now()
  where d.id in (select id from base);

  get diagnostics v_filas = row_count;
  return v_filas;
end $$;

revoke all on function public.clasificar_directorio(boolean) from public, anon, authenticated;

select public.clasificar_directorio(true) as fichas_reclasificadas;

-- ---------------------------------------------------------------------------
-- HUECOS QUE NO SE TAPAN AQUÍ, porque falta la clave en el catálogo, no la regla
--
--   · Inclusión laboral y empleo con apoyo. INTERVENTION_AREAS no tiene una
--     clave de empleo; lo más cercano es `vida_independiente`, que no es lo
--     mismo. Hay al menos 5 fichas que solo ofrecen esto.
--   · Deporte adaptado.
--   · Prótesis, órtesis y ayudas técnicas. Son `merchant` y su sitio natural es
--     `product_categories` (providerCatalog.ts), que esta función no llena.
--
-- Cualquiera de los tres se resuelve añadiendo la clave al catálogo de
-- src/data/ y luego una regla aquí. No inventar claves: si no está en el
-- catálogo, el filtro no la encuentra aunque la ficha quede marcada.
-- ---------------------------------------------------------------------------
