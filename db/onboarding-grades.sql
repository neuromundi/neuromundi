-- ============================================================================
-- onboarding-grades.sql — Extiende complete_onboarding para guardar los grados
-- escolares cuando el usuario social es una ESCUELA. Conserva el candado
-- anti-escalada (solo una vez, nunca admin) y todo lo demás.
--
-- Reemplaza la versión de 7 argumentos por una de 8 (añade p_school_grades).
-- Idempotente. Reejecutable.
-- ============================================================================

-- Quita la versión anterior (7 args) para evitar sobrecargas ambiguas.
DROP FUNCTION IF EXISTS public.complete_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_role          TEXT,
  p_provider_type TEXT,
  p_full_name     TEXT,
  p_country       TEXT,
  p_state         TEXT,
  p_municipality  TEXT,
  p_rules_version TEXT,
  p_school_grades TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  UUID := auth.uid();
  v_done BOOLEAN := FALSE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_role NOT IN ('patient', 'parent', 'provider') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;

  UPDATE public.profiles SET
    role          = p_role,
    provider_type = CASE WHEN p_role = 'provider' THEN NULLIF(p_provider_type, '') ELSE NULL END,
    full_name     = COALESCE(NULLIF(p_full_name, ''), full_name),
    country       = NULLIF(p_country, ''),
    state         = NULLIF(p_state, ''),
    municipality  = NULLIF(p_municipality, ''),
    -- Grados solo para escuelas; el resto queda en arreglo vacío.
    school_grades = CASE
                      WHEN p_role = 'provider' AND p_provider_type = 'school'
                        THEN COALESCE(p_school_grades, '{}')
                      ELSE '{}'
                    END,
    membership_status = CASE WHEN p_role IN ('parent', 'patient') THEN 'exempt' ELSE 'pending' END,
    rules_version_accepted = p_rules_version,
    rules_accepted_at      = now()
  WHERE id = v_uid
    AND rules_version_accepted IS NULL;   -- candado: solo si aún no se completó

  GET DIAGNOSTICS v_done = ROW_COUNT;

  IF v_done THEN
    INSERT INTO public.user_agreements (user_id, user_type, doc_version)
    VALUES (v_uid, p_role, p_rules_version)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_done;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO authenticated;
