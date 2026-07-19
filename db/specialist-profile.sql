-- ============================================================================
-- specialist-profile.sql — Campos del perfil de ESPECIALISTA.
-- Columnas indexables (para buscador/directorio) como arreglos + detalles en
-- JSONB. Amplía handle_new_user para leerlos del metadata. Idempotente.
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title_prefix       TEXT;         -- Dr., Lic., Mtro.…
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profession         TEXT;         -- título principal
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio                TEXT;         -- enfoque terapéutico
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp           TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS booking_url        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin           TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialties        TEXT[] DEFAULT '{}';   -- indexable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS modalities         TEXT[] DEFAULT '{}';   -- indexable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_ranges         TEXT[] DEFAULT '{}';   -- indexable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intervention_areas TEXT[] DEFAULT '{}';   -- indexable
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_details   JSONB  DEFAULT '{}';   -- benef., certificaciones, "otro", etc.

-- Índices para búsquedas por especialidad/área/modalidad/edad.
CREATE INDEX IF NOT EXISTS idx_profiles_specialties        ON public.profiles USING GIN (specialties);
CREATE INDEX IF NOT EXISTS idx_profiles_intervention_areas ON public.profiles USING GIN (intervention_areas);
CREATE INDEX IF NOT EXISTS idx_profiles_modalities         ON public.profiles USING GIN (modalities);
CREATE INDEX IF NOT EXISTS idx_profiles_age_ranges         ON public.profiles USING GIN (age_ranges);

-- Trigger ampliado (conserva TODO lo anterior + campos de especialista).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
