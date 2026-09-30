-- ============================================================================
-- 0160 · Reclamar la ficha hereda su clasificación
--
-- EL DAÑO, MEDIDO
--   728 de 728 fichas publicadas tienen `sections`. CERO perfiles la tienen.
--
--   Al reclamar, la ficha sale del directorio y el perfil ocupa su lugar — pero
--   nace sin secciones, sin especialidades y sin condiciones. Y el directorio
--   filtra por eso: `useDirectory` descarta a quien no tenga la sección activa
--   («if (section && !p.sections.includes(section)) return false»).
--
--   Resultado: la persona figura en el listado sin filtros y DESAPARECE de toda
--   navegación por sección, que es como se recorre el directorio de verdad. Es
--   el mismo problema que la 0158 resolvió para la visibilidad, una capa más
--   abajo: quien responde a la invitación se vuelve inencontrable.
--
--   La 0150 ya copiaba `provider_type` y `profession` para que el precio
--   cotizado y el cobrado coincidieran. Esto copia el resto de la clasificación
--   curada, que es la que hace que a la persona la encuentren.
--
-- SÓLO SI EL PERFIL ESTÁ VACÍO
--   Nunca se pisa lo que la persona ya declaró: se rellena el hueco, no se
--   sustituye su criterio por el nuestro.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
  from public.directorio_invitaciones i
  where i.token = p_token
    and i.usada_en is null
    and i.baja_en is null
    and i.cancelada_en is null
    and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set reclamada_por = p_perfil, reclamada_en = now(), actualizada_en = now()
   where id = v_ficha;

  update public.directorio_invitaciones set usada_en = now() where token = p_token;

  -- Clasificación heredada de la ficha. `provider_type` y `profession` deciden
  -- el PRECIO (el correo cotizó con ellos); el resto decide si a la persona la
  -- ENCUENTRAN. Todo con coalesce: sólo se rellena lo que el perfil no trae.
  update public.profiles p
     set provider_type      = coalesce(p.provider_type, d.provider_type),
         profession         = coalesce(p.profession, d.profession),
         sections           = case when coalesce(array_length(p.sections, 1), 0) = 0
                                   then coalesce(d.sections, '{}') else p.sections end,
         neuro_conditions   = case when coalesce(array_length(p.neuro_conditions, 1), 0) = 0
                                   then coalesce(d.neuro_conditions, '{}') else p.neuro_conditions end,
         specialties        = case when coalesce(array_length(p.specialties, 1), 0) = 0
                                   then coalesce(d.specialties, '{}') else p.specialties end,
         intervention_areas = case when coalesce(array_length(p.intervention_areas, 1), 0) = 0
                                   then coalesce(d.intervention_areas, '{}') else p.intervention_areas end,
         product_categories = case when coalesce(array_length(p.product_categories, 1), 0) = 0
                                   then coalesce(d.product_categories, '{}') else p.product_categories end,
         services_offered   = coalesce(nullif(btrim(coalesce(p.services_offered, '')), ''), d.especializacion)
    from public.directorio d
   where d.id = v_ficha
     and p.id = p_perfil;

  -- PUBLICAR. Sin esto la ficha sale del directorio y el perfil no entra, así
  -- que quien reclama desaparece (medido: 729 → 728).
  update public.profiles
     set is_published = true
   where id = p_perfil
     and suspended_at is null;

  return true;
end $$;
