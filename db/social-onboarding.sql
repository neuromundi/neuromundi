-- ============================================================================
-- NeuroDirectorio / Neuromundi — LOGIN SOCIAL (completar perfil)
-- Aplica DESPUÉS de db/improvements.sql. Idempotente.
--
-- Quien entra con Google/Facebook/Apple no eligió su tipo de usuario ni aceptó el
-- reglamento (el trigger lo deja como 'parent' por defecto). Este RPC permite
-- completar el perfil UNA sola vez, de forma segura:
--   - Solo el propio usuario (auth.uid()).
--   - Rol limitado a patient/parent/provider (NUNCA admin → evita escalada).
--   - Solo aplica si aún no había aceptado el reglamento (candado anti-reuso).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_role          TEXT,
  p_provider_type TEXT,
  p_full_name     TEXT,
  p_country       TEXT,
  p_state         TEXT,
  p_municipality  TEXT,
  p_rules_version TEXT
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

GRANT EXECUTE ON FUNCTION public.complete_onboarding(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
