-- ============================================================================
-- clinic-profile.sql — Habilita el tipo de proveedor 'clinic'.
-- La clínica reutiliza columnas existentes (business_name, bio, website,
-- whatsapp, rfc, dirección/geo, specialties[], age_ranges[], modalities[]) y
-- guarda lo específico (servicios, cédulas del director, permisos, beneficio)
-- en provider_details (JSONB). Solo hay que ampliar la restricción. Idempotente.
-- ============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_provider_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_provider_type_check
  CHECK (provider_type IS NULL OR provider_type IN ('service_provider', 'merchant', 'school', 'clinic'));
