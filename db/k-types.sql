-- ============================================================================
-- k-types.sql — Habilita 5 tipos nuevos de proveedor (bloque K):
--   wellness  → Deporte y bienestar
--   tourism   → Turismo accesible
--   legal     → Servicios legales / asesoría
--   ngo       → ONG / asociación
--   caregiver → Cuidadores / asistentes personales
-- Todos reutilizan columnas existentes + provider_details (JSONB) y las áreas
-- indexables. Solo se amplía la restricción. Idempotente.
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_provider_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_provider_type_check
  CHECK (provider_type IS NULL OR provider_type IN (
    'service_provider', 'merchant', 'school', 'clinic',
    'wellness', 'tourism', 'legal', 'ngo', 'caregiver'
  ));
