-- ============================================================================
-- patient-adult.sql — Consolida el registro de paciente/adulto independiente.
-- Añade a profiles los campos del flujo "Para mí (soy adulto)" y amplía el
-- trigger handle_new_user para leerlos del metadata. Idempotente y reejecutable.
--
--   account_type : 'padre_tutor' | 'adulto_independiente'  (NULL para no-consumidores)
--   life_stage   : 'young_adult' | 'adult' | 'adult_plus'
--   interests    : áreas de interés (TEXT[])
--   comms_opt_in : consentimiento OPCIONAL de comunicaciones
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS life_stage   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests    TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS comms_opt_in BOOLEAN DEFAULT FALSE;

-- Trigger ampliado (conserva TODO lo anterior + los nuevos campos del adulto).
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
  v_grades TEXT[] := COALESCE(
    (SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'school_grades') = 'array' THEN m->'school_grades' ELSE '[]'::jsonb END
    )),
    '{}'
  );
  v_interests TEXT[] := COALESCE(
    (SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'interests') = 'array' THEN m->'interests' ELSE '[]'::jsonb END
    )),
    '{}'
  );
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, provider_type, business_name, is_company,
    birth_date, gender, condition, country, state, municipality,
    address, phone, services_offered, latitude, longitude,
    website, instagram, tiktok, facebook, cedula_profesional,
    school_grades, account_type, life_stage, interests, comms_opt_in,
    membership_status, rules_version_accepted, rules_accepted_at
  ) VALUES (
    NEW.id,
    v_role,
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
