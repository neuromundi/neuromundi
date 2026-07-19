-- ============================================================================
-- NeuroDirectorio — Pacientes, datos de registro ampliados y sucursales
-- Aplica DESPUÉS de PARTE 1, prescriptions.sql, policies.sql y networking.sql.
-- Idempotente.
-- ============================================================================

-- ── A. Rol 'patient' ─────────────────────────────────────────────────────────
-- Ampliar el CHECK de role para admitir pacientes (consumidores como los padres).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('patient', 'parent', 'provider', 'admin'));

-- Helper: ¿es un consumidor (paciente o padre)? Usado por las políticas de
-- descuentos, listas, recetas, etc. SECURITY DEFINER evita recursión de RLS.
CREATE OR REPLACE FUNCTION public.is_consumer(p_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id AND role IN ('parent', 'patient'));
$$;
GRANT EXECUTE ON FUNCTION public.is_consumer(UUID) TO authenticated;

-- ── B. Nuevas columnas de perfil ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date    DATE,
  ADD COLUMN IF NOT EXISTS gender        TEXT,
  ADD COLUMN IF NOT EXISTS condition     TEXT,   -- neurodivergencia / padecimiento (propio o del hijo/a)
  ADD COLUMN IF NOT EXISTS state         TEXT,   -- estado / provincia
  ADD COLUMN IF NOT EXISTS municipality  TEXT,   -- municipalidad / alcaldía
  ADD COLUMN IF NOT EXISTS is_company    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS services_offered TEXT; -- servicios o productos que ofrece (texto libre)

-- ── C. Sucursales / ubicaciones del proveedor ────────────────────────────────
-- Un proveedor (servicios o productos) puede tener varias sucursales, cada una
-- con dirección, coordenadas, teléfonos y horarios propios para el mapa.
CREATE TABLE IF NOT EXISTS public.provider_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label         TEXT,              -- ej. "Sucursal Centro"
  address       TEXT NOT NULL,     -- calle y número
  country       TEXT,
  state         TEXT,
  municipality  TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  phone         TEXT,              -- teléfono(s) de contacto de la sucursal
  hours         TEXT,              -- horarios de funcionamiento (texto libre)
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_locations_provider ON public.provider_locations(provider_id);

ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;

-- Lectura pública (para ubicar en el mapa a proveedores publicados).
DROP POLICY IF EXISTS "locations_select_public" ON public.provider_locations;
CREATE POLICY "locations_select_public" ON public.provider_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = provider_id AND (p.is_published = TRUE OR p.id = auth.uid())
    )
  );

-- El proveedor administra sus propias sucursales.
DROP POLICY IF EXISTS "locations_write_own" ON public.provider_locations;
CREATE POLICY "locations_write_own" ON public.provider_locations FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid() AND public.is_provider(auth.uid()));

-- ── D. handle_new_user ampliado ──────────────────────────────────────────────
-- Crea el perfil con todos los metadatos enviados en el registro.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, provider_type, business_name, is_company,
    birth_date, gender, condition, country, state, municipality,
    address, phone, services_offered, latitude, longitude
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(m->>'role', ''), 'parent'),
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
    NULLIF(m->>'longitude', '')::double precision
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── E. Ampliar a consumidores (paciente + padre) lo que ya controlamos ───────
-- El RPC resolve_parent_by_qr y las políticas de recetas se amplían en la
-- migración dedicada db/widen-consumer-policies.sql (que respeta la firma real
-- (UUID, UUID) del qr_token). NO redefinas aquí ese RPC para no crear una
-- sobrecarga ambigua.

-- Listas: permitir que también los pacientes creen y administren listas.
DROP POLICY IF EXISTS "lists_owner_all" ON public.parent_lists;
CREATE POLICY "lists_owner_all" ON public.parent_lists FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND public.is_consumer(auth.uid()));

-- NOTA: El resto de la ampliación a consumidores vive en
-- db/widen-consumer-policies.sql (RPC del QR + destinatario de recetas, y la
-- verificación de las lecturas de transacciones/encuestas de la PARTE 1).
