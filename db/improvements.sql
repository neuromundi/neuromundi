-- ============================================================================
-- NeuroDirectorio / Neuromundi — MEJORAS (datos fiscales + grados escolares)
-- Aplica DESPUÉS de db/phase7.sql. Idempotente. Sin Edge Functions.
--
-- Agrega a profiles los campos de facturación (variante México/CFDI e
-- internacional) y los grados académicos para escuelas. La edición la hace el
-- propio proveedor desde Configuración (RLS de UPDATE de profiles ya lo permite).
-- ============================================================================

ALTER TABLE public.profiles
  -- Facturación México (CFDI 4.0)
  ADD COLUMN IF NOT EXISTS fiscal_razon_social   TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_regimen        TEXT,   -- clave de régimen fiscal SAT
  ADD COLUMN IF NOT EXISTS fiscal_uso_cfdi        TEXT,  -- clave de uso de CFDI SAT
  ADD COLUMN IF NOT EXISTS fiscal_cp              TEXT,  -- código postal fiscal
  ADD COLUMN IF NOT EXISTS fiscal_direccion       TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_email           TEXT,
  -- Facturación internacional (genérica)
  ADD COLUMN IF NOT EXISTS fiscal_tax_id          TEXT,  -- identificación fiscal del país
  ADD COLUMN IF NOT EXISTS fiscal_country         TEXT,
  -- Escuelas: grados académicos ofrecidos
  ADD COLUMN IF NOT EXISTS school_grades          TEXT[] NOT NULL DEFAULT '{}';

-- Nota: el RFC ya existe en profiles (Fase 3). Para México se usa rfc +
-- fiscal_razon_social + fiscal_regimen + fiscal_uso_cfdi + fiscal_cp +
-- fiscal_direccion + fiscal_email. Para el resto del mundo se usa
-- fiscal_tax_id + fiscal_razon_social + fiscal_direccion + fiscal_email + fiscal_country.
