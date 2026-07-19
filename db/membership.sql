-- ============================================================================
-- NeuroDirectorio — Membresía / cuota de afiliación
-- Aplica DESPUÉS de los 6 archivos anteriores. Idempotente.
--
-- Modelo:
--   • Cuota ANUAL para TODOS los tipos de afiliado, variable por tipo.
--   • Cuota base en USD; el precio local se calcula por país (moneda + FX).
--   • Tras registrarse: estado 'pending' con 7 días de gracia (membership_due_at).
--     Pasada la gracia sin pago, el perfil deja de recibir consultas e interactuar.
--   • Códigos promocionales: personales (socios elegidos) y uno universal para
--     consumidores (paciente/padre) que exenta el pago.
--   • Pasarela: Stripe (suscripción anual) vía Edge Functions.
-- ============================================================================

-- ── A. Columnas de membresía en profiles ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS membership_due_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS membership_paid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS promo_code_used TEXT,
  ADD COLUMN IF NOT EXISTS dial_code TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_membership_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_status_check
  CHECK (membership_status IN ('pending', 'active', 'past_due', 'exempt'));

-- Los admins no pagan cuota.
UPDATE public.profiles SET membership_status = 'exempt' WHERE role = 'admin';

-- ── B. Configuración de cuotas (editable por el admin desde Supabase) ─────────
-- Cuota base por tipo de afiliado, en USD.
CREATE TABLE IF NOT EXISTS public.membership_fees (
  affiliate_type TEXT PRIMARY KEY
    CHECK (affiliate_type IN ('patient', 'parent', 'service_provider', 'merchant')),
  base_usd       NUMERIC(10, 2) NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Precio local por país: moneda + tipo de cambio respecto al USD.
-- amount_local = base_usd * fx_per_usd. Usa country_label en minúsculas para
-- empatar con el texto libre del registro; 'default' es el respaldo (USD).
CREATE TABLE IF NOT EXISTS public.country_pricing (
  country_label  TEXT PRIMARY KEY,          -- p. ej. 'méxico', 'estados unidos', 'default'
  currency       TEXT NOT NULL,             -- ISO 4217, p. ej. 'MXN'
  fx_per_usd     NUMERIC(14, 6) NOT NULL,   -- 1 USD = fx_per_usd unidades locales
  zero_decimal   BOOLEAN NOT NULL DEFAULT FALSE, -- monedas sin centavos (p. ej. JPY)
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Semillas base (EDITA estos valores; son de ejemplo).
INSERT INTO public.membership_fees (affiliate_type, base_usd) VALUES
  ('patient', 10.00),
  ('parent', 10.00),
  ('service_provider', 50.00),
  ('merchant', 50.00)
ON CONFLICT (affiliate_type) DO NOTHING;

INSERT INTO public.country_pricing (country_label, currency, fx_per_usd, zero_decimal) VALUES
  ('default', 'USD', 1.0, FALSE),
  ('méxico', 'MXN', 18.0, FALSE),
  ('mexico', 'MXN', 18.0, FALSE),
  ('estados unidos', 'USD', 1.0, FALSE),
  ('united states', 'USD', 1.0, FALSE)
ON CONFLICT (country_label) DO NOTHING;

-- RPC de solo lectura para que el front muestre el precio estimado al usuario.
CREATE OR REPLACE FUNCTION public.get_membership_quote(p_type TEXT, p_country TEXT)
RETURNS TABLE (currency TEXT, amount NUMERIC, base_usd NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH fee AS (
    SELECT base_usd FROM public.membership_fees
    WHERE affiliate_type = p_type AND is_active = TRUE
  ),
  cp AS (
    SELECT * FROM public.country_pricing
    WHERE is_active = TRUE AND country_label = lower(trim(COALESCE(p_country, '')))
    UNION ALL
    SELECT * FROM public.country_pricing WHERE country_label = 'default'
    LIMIT 1
  )
  SELECT cp.currency,
         ROUND(fee.base_usd * cp.fx_per_usd, CASE WHEN cp.zero_decimal THEN 0 ELSE 2 END),
         fee.base_usd
  FROM fee, cp
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_membership_quote(TEXT, TEXT) TO authenticated;

ALTER TABLE public.membership_fees  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_pricing  ENABLE ROW LEVEL SECURITY;

-- Lectura para usuarios autenticados; escritura solo admin.
DROP POLICY IF EXISTS "fees_select" ON public.membership_fees;
CREATE POLICY "fees_select" ON public.membership_fees FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "fees_admin_write" ON public.membership_fees;
CREATE POLICY "fees_admin_write" ON public.membership_fees FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pricing_select" ON public.country_pricing;
CREATE POLICY "pricing_select" ON public.country_pricing FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "pricing_admin_write" ON public.country_pricing;
CREATE POLICY "pricing_admin_write" ON public.country_pricing FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── C. Códigos promocionales ─────────────────────────────────────────────────
-- scope: 'consumer' (paciente/padre), 'provider' (prestador/proveedor), 'all'.
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code        TEXT PRIMARY KEY,
  kind        TEXT NOT NULL DEFAULT 'personal' CHECK (kind IN ('universal', 'personal')),
  scope       TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('consumer', 'provider', 'all')),
  max_uses    INTEGER,            -- NULL = ilimitado
  used_count  INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL REFERENCES public.promo_codes(code) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_promo_per_user UNIQUE (user_id)
);

ALTER TABLE public.promo_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions  ENABLE ROW LEVEL SECURITY;

-- Los códigos NO son públicos (se validan por RPC). Solo el admin los administra.
DROP POLICY IF EXISTS "promo_admin_all" ON public.promo_codes;
CREATE POLICY "promo_admin_all" ON public.promo_codes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "redemptions_select_own_or_admin" ON public.promo_redemptions;
CREATE POLICY "redemptions_select_own_or_admin" ON public.promo_redemptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Semilla: código universal para consumidores (EDITA o desactiva a tu gusto).
INSERT INTO public.promo_codes (code, kind, scope, note) VALUES
  ('NEUROMUNDI-FAMILIA', 'universal', 'consumer', 'Exención universal para pacientes y padres')
ON CONFLICT (code) DO NOTHING;

-- Canje de código: valida y, si aplica, marca al usuario como 'exempt'.
-- Devuelve jsonb { ok: bool, error?: text }.
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c      public.promo_codes%ROWTYPE;
  u_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO c FROM public.promo_codes
  WHERE lower(code) = lower(trim(p_code)) FOR UPDATE;

  IF NOT FOUND OR c.is_active = FALSE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exhausted');
  END IF;

  SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
  IF c.scope = 'consumer' AND u_role NOT IN ('parent', 'patient') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'scope');
  ELSIF c.scope = 'provider' AND u_role <> 'provider' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'scope');
  END IF;

  -- Registrar canje (uno por usuario) y exentar.
  INSERT INTO public.promo_redemptions (code, user_id)
  VALUES (c.code, auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.promo_codes SET used_count = used_count + 1 WHERE code = c.code;
  UPDATE public.profiles
  SET membership_status = 'exempt', promo_code_used = c.code
  WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(TEXT) TO authenticated;

-- ── D. Helper de membresía activa + expiración de la gracia ───────────────────
CREATE OR REPLACE FUNCTION public.is_member_active(p_id UUID)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_id AND (
      membership_status IN ('active', 'exempt')
      OR (membership_status = 'pending' AND COALESCE(membership_due_at, now()) > now())
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_member_active(UUID) TO authenticated, anon;

-- Marca como vencidos los que pasaron la gracia sin pagar (para reportes; la
-- restricción ya aplica vía is_member_active aunque no se corra). Programa con
-- pg_cron si lo deseas:  SELECT cron.schedule('expire-grace','0 3 * * *',$$SELECT public.expire_membership_grace()$$);
CREATE OR REPLACE FUNCTION public.expire_membership_grace()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET membership_status = 'past_due'
  WHERE membership_status = 'pending' AND membership_due_at < now();
$$;

-- ── E. Aplicar la restricción (recibir consultas / interactuar) ───────────────
-- Visibilidad en el directorio: publicado + miembro activo (o el propio dueño).
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT
  USING ((is_published = TRUE AND public.is_member_active(id)) OR id = auth.uid());

-- Sucursales: visibles solo si el proveedor está publicado y es miembro activo.
DROP POLICY IF EXISTS "locations_select_public" ON public.provider_locations;
CREATE POLICY "locations_select_public" ON public.provider_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = provider_id
      AND ((p.is_published = TRUE AND public.is_member_active(p.id)) OR p.id = auth.uid())
  ));

-- Canjes de descuento: ambas partes deben ser miembros activos.
DROP POLICY IF EXISTS "transactions_insert_provider" ON public.discount_transactions;
CREATE POLICY "transactions_insert_provider" ON public.discount_transactions FOR INSERT
  WITH CHECK (
    provider_id = auth.uid()
    AND parent_id <> auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provider')
    AND public.is_member_active(provider_id)
    AND public.is_member_active(parent_id)
  );

-- Recetas: el prestador y el destinatario deben ser miembros activos.
DROP POLICY IF EXISTS "presc_insert_therapist" ON public.prescriptions;
CREATE POLICY "presc_insert_therapist" ON public.prescriptions FOR INSERT
  WITH CHECK (
    therapist_id = auth.uid()
    AND therapist_id <> parent_id
    AND EXISTS (SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'provider' AND provider_type = 'service_provider')
    AND EXISTS (SELECT 1 FROM public.profiles
                WHERE id = parent_id AND role IN ('parent', 'patient'))
    AND public.is_member_active(therapist_id)
    AND public.is_member_active(parent_id)
  );

-- Networking entre proveedores: ambos deben ser miembros activos.
DROP POLICY IF EXISTS "connections_insert" ON public.provider_connections;
CREATE POLICY "connections_insert" ON public.provider_connections FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND status = 'pending'
    AND public.is_provider(auth.uid())
    AND public.is_provider(addressee_id)
    AND public.is_member_active(requester_id)
    AND public.is_member_active(addressee_id)
  );

-- ── F. Actualización de membresía desde el webhook de Stripe (service_role) ───
-- El webhook usa service_role (omite RLS), pero dejamos una función utilitaria
-- por claridad y para poder otorgar acceso controlado si se necesitara.
CREATE OR REPLACE FUNCTION public.set_membership_active(
  p_user UUID, p_customer TEXT, p_subscription TEXT, p_paid_until TIMESTAMPTZ
)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles
  SET membership_status = 'active',
      stripe_customer_id = COALESCE(p_customer, stripe_customer_id),
      stripe_subscription_id = COALESCE(p_subscription, stripe_subscription_id),
      membership_paid_until = p_paid_until
  WHERE id = p_user;
$$;
