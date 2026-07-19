-- ============================================================================
-- NeuroDirectorio / Neuromundi — FASE 1
-- Aplica DESPUÉS de db/membership.sql (es el 8º archivo). Idempotente.
--
-- Incluye:
--   • Familias gratis: pacientes y padres quedan 'exempt' al registrarse.
--   • Redes sociales y sitio web para profesionales/proveedores.
--   • Cédula profesional (se captura en el registro; útil sobre todo en México).
--   • Aceptación del reglamento + descargo: se registra en public.user_agreements.
-- ============================================================================

-- ── A. Columnas nuevas en profiles ───────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS tiktok TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS cedula_profesional TEXT,
  ADD COLUMN IF NOT EXISTS rules_version_accepted TEXT,
  ADD COLUMN IF NOT EXISTS rules_accepted_at TIMESTAMPTZ;

-- ── B. Tabla de aceptaciones (reglamento + descargo) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_type   TEXT NOT NULL,
  doc_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_agreements_user ON public.user_agreements(user_id);

ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agreements_select_own_or_admin" ON public.user_agreements;
CREATE POLICY "agreements_select_own_or_admin" ON public.user_agreements FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- La inserción la hace el trigger handle_new_user (SECURITY DEFINER), por lo que
-- no se necesita una política de INSERT para el usuario.

-- ── C. handle_new_user ampliado ──────────────────────────────────────────────
-- Conserva toda la lógica previa y añade: redes/web, cédula, exención de
-- familias y registro de la aceptación del reglamento.
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
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, provider_type, business_name, is_company,
    birth_date, gender, condition, country, state, municipality,
    address, phone, services_offered, latitude, longitude,
    website, instagram, tiktok, facebook, cedula_profesional,
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
    -- Familias (paciente/padre) quedan exentas de cuota; el resto, 'pending'.
    CASE WHEN v_role IN ('parent', 'patient') THEN 'exempt' ELSE 'pending' END,
    v_rules,
    CASE WHEN v_rules IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Registro de la aceptación del reglamento + descargo.
  IF v_rules IS NOT NULL THEN
    INSERT INTO public.user_agreements (user_id, user_type, doc_version)
    VALUES (NEW.id, v_role, v_rules);
  END IF;

  RETURN NEW;
END;
$$;

-- ── D. Familias existentes: exentas de cuota ─────────────────────────────────
UPDATE public.profiles
SET membership_status = 'exempt'
WHERE role IN ('parent', 'patient') AND membership_status <> 'exempt';
