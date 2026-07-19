-- ============================================================================
-- NeuroDirectorio — PARTE 1: Esquema base
-- Crea las tablas, columnas, RLS, vista de calificaciones (EVS) y triggers
-- sobre los que se apoyan el resto de migraciones.
--
-- ORDEN DE APLICACIÓN EN SUPABASE:
--   1) db/00-base-schema.sql        ← ESTE archivo (primero)
--   2) db/prescriptions.sql
--   3) db/policies.sql
--   4) db/networking.sql
--   5) db/patients-and-locations.sql
--   6) db/widen-consumer-policies.sql
--
-- Reconstruido para coincidir EXACTAMENTE con el contrato de tipos del front
-- (src/types/database.ts). Idempotente donde es seguro (IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- gen_random_uuid() (en Supabase suele estar en el esquema "extensions").
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Utilidad: mantener updated_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- ════════════════════════════════════════════════════════════════════════════
-- TABLA: profiles  (extiende a auth.users)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'parent',
  full_name     TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  phone         TEXT,
  bio           TEXT,
  qr_token      UUID NOT NULL DEFAULT gen_random_uuid(),
  provider_type TEXT,
  business_name TEXT,
  website_url   TEXT,
  address       TEXT,
  city          TEXT,
  country       TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- El nombre del CHECK debe ser exactamente este: patients-and-locations.sql
  -- lo elimina y lo recrea para añadir el rol 'patient'.
  CONSTRAINT profiles_role_check CHECK (role IN ('parent', 'provider', 'admin')),
  CONSTRAINT profiles_provider_type_check
    CHECK (provider_type IS NULL OR provider_type IN ('service_provider', 'merchant')),
  CONSTRAINT profiles_qr_token_unique UNIQUE (qr_token)
);

CREATE INDEX IF NOT EXISTS idx_profiles_role      ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_published ON public.profiles(is_published);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Evita la escalada de privilegios: nadie (salvo un admin) puede cambiarse a sí
-- mismo el rol ni el estado de verificación. `is_published` SÍ lo controla el
-- proveedor desde Ajustes, así que no se bloquea aquí.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_adm BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO is_adm FROM public.profiles WHERE id = auth.uid();
  IF COALESCE(is_adm, FALSE) = FALSE THEN
    NEW.role        := OLD.role;
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- ════════════════════════════════════════════════════════════════════════════
-- TABLA: categories  +  join provider_categories
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.categories (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  icon_name   TEXT,
  color_hex   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_categories (
  provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_provcat_provider ON public.provider_categories(provider_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLA: offers
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  discount_type     TEXT NOT NULL DEFAULT 'percentage'
                      CHECK (discount_type IN ('percentage', 'fixed', 'freebie')),
  discount_value    DECIMAL(10, 2),
  terms             TEXT,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  max_redemptions   INTEGER,
  redemptions_count INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('active', 'paused', 'expired', 'draft')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offers_provider ON public.offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_offers_status   ON public.offers(status);

DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.offers;
CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- TABLA: discount_transactions  (un canje de una oferta por un consumidor)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.discount_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id      UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  provider_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'completed', 'expired', 'disputed')),
  scanned_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scanned_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_provider ON public.discount_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_tx_parent   ON public.discount_transactions(parent_id);
CREATE INDEX IF NOT EXISTS idx_tx_offer    ON public.discount_transactions(offer_id);
CREATE INDEX IF NOT EXISTS idx_tx_status   ON public.discount_transactions(status);

-- Al registrar un canje, sube el contador de la oferta.
CREATE OR REPLACE FUNCTION public.bump_offer_redemptions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.offers
  SET redemptions_count = redemptions_count + 1
  WHERE id = NEW.offer_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_redemptions ON public.discount_transactions;
CREATE TRIGGER trg_bump_redemptions
  AFTER INSERT ON public.discount_transactions
  FOR EACH ROW EXECUTE FUNCTION public.bump_offer_redemptions();

-- ════════════════════════════════════════════════════════════════════════════
-- TABLA: satisfaction_surveys  (encuesta EVS, inmutable)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id            UUID NOT NULL REFERENCES public.discount_transactions(id) ON DELETE CASCADE,
  parent_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quality_score             SMALLINT NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  human_treatment_score     SMALLINT NOT NULL CHECK (human_treatment_score BETWEEN 1 AND 5),
  accessibility_score       SMALLINT NOT NULL CHECK (accessibility_score BETWEEN 1 AND 5),
  price_value_score         SMALLINT NOT NULL CHECK (price_value_score BETWEEN 1 AND 5),
  offer_compliance_score    SMALLINT NOT NULL CHECK (offer_compliance_score BETWEEN 1 AND 5),
  sensory_adaptation_score  SMALLINT NOT NULL CHECK (sensory_adaptation_score BETWEEN 1 AND 5),
  flexibility_crisis_score  SMALLINT NOT NULL CHECK (flexibility_crisis_score BETWEEN 1 AND 5),
  facilities_score          SMALLINT CHECK (facilities_score BETWEEN 1 AND 5),
  professionalism_score     SMALLINT CHECK (professionalism_score BETWEEN 1 AND 5),
  comments                  TEXT,
  is_anonymous              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Una encuesta por transacción.
  CONSTRAINT uq_survey_transaction UNIQUE (transaction_id)
);
CREATE INDEX IF NOT EXISTS idx_survey_provider ON public.satisfaction_surveys(provider_id);
CREATE INDEX IF NOT EXISTS idx_survey_parent   ON public.satisfaction_surveys(parent_id);

-- Al enviar la encuesta, la transacción asociada pasa a 'completed'.
CREATE OR REPLACE FUNCTION public.complete_transaction_on_survey()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.discount_transactions
  SET status = 'completed', completed_at = now()
  WHERE id = NEW.transaction_id AND status = 'pending';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_complete_on_survey ON public.satisfaction_surveys;
CREATE TRIGGER trg_complete_on_survey
  AFTER INSERT ON public.satisfaction_surveys
  FOR EACH ROW EXECUTE FUNCTION public.complete_transaction_on_survey();

-- ════════════════════════════════════════════════════════════════════════════
-- ALTA DE USUARIO: crea el perfil al registrarse (base; se amplía después).
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'parent'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
-- VISTA: public_provider_ratings  (agregados EVS por proveedor, sin PII)
--   El EVS es el promedio de las 7 dimensiones núcleo.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.public_provider_ratings AS
SELECT
  s.provider_id,
  p.business_name,
  p.provider_type,
  p.city,
  COUNT(*)                          AS total_reviews,
  ROUND(AVG(s.quality_score), 2)            AS avg_quality,
  ROUND(AVG(s.human_treatment_score), 2)    AS avg_human_treatment,
  ROUND(AVG(s.accessibility_score), 2)      AS avg_accessibility,
  ROUND(AVG(s.price_value_score), 2)        AS avg_price_value,
  ROUND(AVG(s.offer_compliance_score), 2)   AS avg_offer_compliance,
  ROUND(AVG(s.sensory_adaptation_score), 2) AS avg_sensory_adaptation,
  ROUND(AVG(s.flexibility_crisis_score), 2) AS avg_flexibility_crisis,
  ROUND(AVG(s.facilities_score), 2)         AS avg_facilities,
  ROUND(AVG(s.professionalism_score), 2)    AS avg_professionalism,
  ROUND(AVG(
    (s.quality_score + s.human_treatment_score + s.accessibility_score +
     s.price_value_score + s.offer_compliance_score +
     s.sensory_adaptation_score + s.flexibility_crisis_score)::NUMERIC / 7
  ), 1) AS evs_score
FROM public.satisfaction_surveys s
JOIN public.profiles p ON p.id = s.provider_id
GROUP BY s.provider_id, p.business_name, p.provider_type, p.city;

GRANT SELECT ON public.public_provider_ratings TO anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_categories   ENABLE ROW LEVEL SECURITY; -- políticas en policies.sql
ALTER TABLE public.offers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_surveys  ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Lectura: perfiles de proveedores publicados (directorio) + el propio.
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT
  USING (is_published = TRUE OR id = auth.uid());

-- Cada quien edita su propio perfil (sin poder cambiarse el rol a admin: las
-- columnas sensibles is_verified/is_published solo las toca el admin por RPC).
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── categories ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories FOR SELECT
  USING (TRUE);

-- ── offers ───────────────────────────────────────────────────────────────────
-- Lectura: ofertas activas (cualquiera) o las propias del proveedor.
-- (policies.sql añade además la lectura de ofertas de mis transacciones, vía OR.)
DROP POLICY IF EXISTS "offers_select_active_or_own" ON public.offers;
CREATE POLICY "offers_select_active_or_own" ON public.offers FOR SELECT
  USING (status = 'active' OR provider_id = auth.uid());

-- El proveedor administra sus ofertas.
DROP POLICY IF EXISTS "offers_write_own" ON public.offers;
CREATE POLICY "offers_write_own" ON public.offers FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ── discount_transactions ────────────────────────────────────────────────────
-- LECTURA (la que preguntabas): por identidad. El consumidor lee SUS canjes y el
-- proveedor los suyos. Al ser por identidad, sirve igual para padres y pacientes.
DROP POLICY IF EXISTS "transactions_select_parties" ON public.discount_transactions;
CREATE POLICY "transactions_select_parties" ON public.discount_transactions FOR SELECT
  USING (parent_id = auth.uid() OR provider_id = auth.uid());

-- Inserción base (policies.sql la refina con anti-auto-escaneo + rol provider).
DROP POLICY IF EXISTS "transactions_insert_provider" ON public.discount_transactions;
CREATE POLICY "transactions_insert_provider" ON public.discount_transactions FOR INSERT
  WITH CHECK (provider_id = auth.uid());

-- El proveedor actualiza el estado de sus transacciones (completar/disputar).
DROP POLICY IF EXISTS "transactions_update_provider" ON public.discount_transactions;
CREATE POLICY "transactions_update_provider" ON public.discount_transactions FOR UPDATE
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ── satisfaction_surveys ──────────────────────────────────────────────────────
-- LECTURA (la que preguntabas): el autor lee sus propias encuestas. Por identidad,
-- vale para padres y pacientes. Los proveedores ven solo agregados/comentarios
-- por las vistas SECURITY DEFINER (sin PII), nunca la tabla cruda.
DROP POLICY IF EXISTS "surveys_select_own" ON public.satisfaction_surveys;
CREATE POLICY "surveys_select_own" ON public.satisfaction_surveys FOR SELECT
  USING (parent_id = auth.uid());

-- Inserción base (policies.sql la refina exigiendo transacción 'pending' propia).
DROP POLICY IF EXISTS "surveys_insert_associated_parent" ON public.satisfaction_surveys;
CREATE POLICY "surveys_insert_associated_parent" ON public.satisfaction_surveys FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.discount_transactions dt
      WHERE dt.id = transaction_id AND dt.parent_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- SEMILLA: categorías iniciales (idempotente por slug).
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.categories (slug, name, icon_name, color_hex, sort_order) VALUES
  ('terapias',     'Terapias',                'Activity',     '#0ea5e9', 1),
  ('educacion',    'Educación',               'GraduationCap','#8b5cf6', 2),
  ('salud',        'Salud',                   'HeartPulse',   '#ef4444', 3),
  ('recreacion',   'Recreación y ocio',       'Smile',        '#f59e0b', 4),
  ('alimentacion', 'Alimentación',            'Utensils',     '#22c55e', 5),
  ('productos',    'Productos y materiales',  'Package',      '#14b8a6', 6),
  ('servicios',    'Servicios profesionales', 'Briefcase',    '#6366f1', 7)
ON CONFLICT (slug) DO NOTHING;
