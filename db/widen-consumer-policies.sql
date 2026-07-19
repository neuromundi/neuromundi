-- ============================================================================
-- NeuroDirectorio — Ampliar a consumidores (paciente + padre) las políticas y
-- funciones que aún limitaban a role = 'parent'.
-- Aplica DESPUÉS de PARTE 1, prescriptions, policies, networking y
-- patients-and-locations.sql. Idempotente.
--
-- Resumen de lo que toca:
--   1) resolve_parent_by_qr — el escaneo del QR (descuentos Y recetas) ahora
--      reconoce también a pacientes. Respeta la firma real (UUID, UUID).
--   2) presc_insert_therapist — un prestador de servicios puede recetar tanto a
--      padres como a pacientes.
--   3) Verificación de las lecturas de transacciones/encuestas de la PARTE 1
--      (ver sección 3): solo necesitan cambio si incluyen un filtro de rol.
-- ============================================================================

-- ── 0. Limpieza: sobrecarga errónea (p_token TEXT) si quedó de una versión previa
-- La firma correcta es (UUID, UUID) porque profiles.qr_token es UUID. Una versión
-- intermedia creó por error una sobrecarga (UUID, TEXT) que dejaría el RPC ambiguo.
DROP FUNCTION IF EXISTS public.resolve_parent_by_qr(UUID, TEXT);

-- ── 1. resolve_parent_by_qr: reconoce padres Y pacientes ─────────────────────
-- Mantiene la privacidad (exige token exacto, solo devuelve id y nombre) y la
-- firma original (UUID, UUID). Sustituye el filtro role = 'parent'.
CREATE OR REPLACE FUNCTION public.resolve_parent_by_qr(p_id UUID, p_token UUID)
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT pr.id, pr.full_name
  FROM public.profiles pr
  WHERE pr.id = p_id
    AND pr.qr_token = p_token
    AND pr.role IN ('parent', 'patient');
END; $$;

GRANT EXECUTE ON FUNCTION public.resolve_parent_by_qr(UUID, UUID) TO authenticated;

-- ── 2. Recetas: el destinatario puede ser padre O paciente ───────────────────
-- Reescribe presc_insert_therapist idéntica salvo el rol del destinatario.
DROP POLICY IF EXISTS "presc_insert_therapist" ON public.prescriptions;
CREATE POLICY "presc_insert_therapist"
  ON public.prescriptions FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND therapist_id <> parent_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'provider' AND provider_type = 'service_provider'
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = parent_id AND role IN ('parent', 'patient')
    )
  );

-- ── 3. Lecturas de transacciones y encuestas ────────────────────────────────
-- Ya resueltas en db/00-base-schema.sql: tanto la inserción como la LECTURA de
-- transacciones y encuestas son por identidad (parent_id = auth.uid() /
-- provider_id = auth.uid()), sin filtro de rol. Por eso los pacientes registran
-- canjes, envían encuestas y leen lo suyo sin necesitar nada más aquí.

