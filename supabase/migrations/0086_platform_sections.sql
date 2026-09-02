-- 0086_platform_sections.sql
-- Ampliación del alcance de la plataforma a TRES secciones:
--   * neurodesarrollo
--   * neurodivergencias
--   * afecciones  (afecciones neurológicas)
-- Los prestadores declaran a cuáles secciones pertenecen (1 a 3) y, para la
-- sección de afecciones, qué afecciones neurológicas atienden. Idempotente.

alter table public.profiles
  add column if not exists sections text[] not null default '{}';

alter table public.profiles
  add column if not exists neuro_conditions text[] not null default '{}';

-- Backfill: los prestadores ya existentes cubrían el alcance original
-- (neurodesarrollo + neurodivergencias). Solo toca filas con sections vacío,
-- para no pisar lo que el prestador haya configurado luego.
update public.profiles
   set sections = array['neurodesarrollo', 'neurodivergencias']
 where role = 'provider'
   and (sections is null or cardinality(sections) = 0);

-- Índices GIN: filtrar por sección o por afección en el directorio sin escaneo
-- completo (el operador de arreglos && / @> usa el GIN).
create index if not exists idx_profiles_sections
  on public.profiles using gin (sections);

create index if not exists idx_profiles_neuro_conditions
  on public.profiles using gin (neuro_conditions);

-- handle_new_user ampliado: el alta por CORREO pasa los metadatos a este trigger;
-- ahora también lee `sections` y `neuro_conditions` (arreglos JSON) para el alta
-- de prestadores. Reproduce el cuerpo vigente + los dos arreglos nuevos.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  m       JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role  TEXT  := COALESCE(NULLIF(m->>'role', ''), 'parent');
  v_rules TEXT  := NULLIF(m->>'rules_version', '');
  v_grades TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'school_grades') = 'array' THEN m->'school_grades' ELSE '[]'::jsonb END)), '{}');
  v_interests TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'interests') = 'array' THEN m->'interests' ELSE '[]'::jsonb END)), '{}');
  v_specialties TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'specialties') = 'array' THEN m->'specialties' ELSE '[]'::jsonb END)), '{}');
  v_modalities TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'modalities') = 'array' THEN m->'modalities' ELSE '[]'::jsonb END)), '{}');
  v_ages TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'age_ranges') = 'array' THEN m->'age_ranges' ELSE '[]'::jsonb END)), '{}');
  v_areas TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'intervention_areas') = 'array' THEN m->'intervention_areas' ELSE '[]'::jsonb END)), '{}');
  v_sections TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'sections') = 'array' THEN m->'sections' ELSE '[]'::jsonb END)), '{}');
  v_conditions TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'neuro_conditions') = 'array' THEN m->'neuro_conditions' ELSE '[]'::jsonb END)), '{}');
  v_details JSONB := CASE WHEN jsonb_typeof(m->'provider_details') = 'object' THEN m->'provider_details' ELSE '{}'::jsonb END;
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, provider_type, business_name, is_company,
    birth_date, gender, condition, country, state, municipality,
    address, phone, services_offered, latitude, longitude,
    website, instagram, tiktok, facebook, cedula_profesional,
    school_grades, account_type, life_stage, interests, comms_opt_in,
    title_prefix, profession, bio, whatsapp, booking_url, linkedin,
    specialties, modalities, age_ranges, intervention_areas, provider_details, rfc,
    sections, neuro_conditions,
    membership_status, rules_version_accepted, rules_accepted_at
  ) VALUES (
    NEW.id, v_role,
    COALESCE(NULLIF(m->>'full_name', ''), ''),
    NULLIF(m->>'provider_type', ''),
    NULLIF(m->>'business_name', ''),
    COALESCE((m->>'is_company')::boolean, FALSE),
    NULLIF(m->>'birth_date', '')::date,
    NULLIF(m->>'gender', ''),
    NULLIF(m->>'condition', ''),
    NULLIF(m->>'country', ''),
    NULLIF(m->>'state', ''),
    NULLIF(m->>'municipality', ''),
    NULLIF(m->>'address', ''),
    NULLIF(m->>'phone', ''),
    NULLIF(m->>'services_offered', ''),
    NULLIF(m->>'latitude', '')::double precision,
    NULLIF(m->>'longitude', '')::double precision,
    NULLIF(m->>'website', ''),
    NULLIF(m->>'instagram', ''),
    NULLIF(m->>'tiktok', ''),
    NULLIF(m->>'facebook', ''),
    NULLIF(m->>'cedula_profesional', ''),
    v_grades,
    NULLIF(m->>'account_type', ''),
    NULLIF(m->>'life_stage', ''),
    v_interests,
    COALESCE((m->>'comms_opt_in')::boolean, FALSE),
    NULLIF(m->>'title_prefix', ''),
    NULLIF(m->>'profession', ''),
    NULLIF(m->>'bio', ''),
    NULLIF(m->>'whatsapp', ''),
    NULLIF(m->>'booking_url', ''),
    NULLIF(m->>'linkedin', ''),
    v_specialties, v_modalities, v_ages, v_areas, v_details,
    NULLIF(m->>'rfc', ''),
    v_sections, v_conditions,
    CASE WHEN v_role IN ('parent', 'patient') THEN 'exempt' ELSE 'pending' END,
    v_rules,
    CASE WHEN v_rules IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_rules IS NOT NULL THEN
    INSERT INTO public.user_agreements (user_id, user_type, doc_version)
    VALUES (NEW.id, v_role, v_rules);
  END IF;

  RETURN NEW;
END;
$$;
