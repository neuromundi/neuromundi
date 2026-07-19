-- ============================================================================
-- NeuroDirectorio / Neuromundi — FASE 6 (Tienda + afiliados + inclusión escolar)
-- Aplica DESPUÉS de db/phase5.sql (es el 13º archivo). Idempotente.
-- ============================================================================

-- ── A. Nuevo tipo de proveedor: escuela (inclusión escolar) ──────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_provider_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_provider_type_check
  CHECK (provider_type IS NULL OR provider_type IN ('service_provider', 'merchant', 'school'));

-- ── B. Afiliados (especialistas que recomiendan y ganan comisión) ────────────
CREATE TABLE IF NOT EXISTS public.affiliate_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code           TEXT NOT NULL UNIQUE,
  commission_pct NUMERIC(5, 2) NOT NULL DEFAULT 10 CHECK (commission_pct BETWEEN 0 AND 100),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_affiliate_provider UNIQUE (provider_id)
);

ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_owner_all" ON public.affiliate_codes;
CREATE POLICY "affiliate_owner_all" ON public.affiliate_codes FOR ALL
  USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid() AND public.is_provider(auth.uid()));

-- Resolver un código → afiliado + comisión (para aplicarlo en el checkout).
CREATE OR REPLACE FUNCTION public.resolve_affiliate(p_code TEXT)
RETURNS TABLE (provider_id UUID, commission_pct NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT provider_id, commission_pct FROM public.affiliate_codes
  WHERE code = upper(trim(p_code)) AND is_active = TRUE
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_affiliate(TEXT) TO authenticated, anon;

-- ── C. Pedidos de la mini-tienda transaccional ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES public.products(id) ON DELETE SET NULL,
  buyer_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vendor_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliate_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_name      TEXT NOT NULL,
  amount_cents      INTEGER NOT NULL,
  currency          TEXT NOT NULL,
  commission_cents  INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  buyer_name        TEXT,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON public.orders(affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Lo ven el comprador, el vendedor y el afiliado; lo escribe el webhook (service_role).
DROP POLICY IF EXISTS "orders_select_parties" ON public.orders;
CREATE POLICY "orders_select_parties" ON public.orders FOR SELECT
  USING (buyer_id = auth.uid() OR vendor_id = auth.uid() OR affiliate_id = auth.uid());

-- Resumen de ganancias del afiliado (solo pedidos pagados).
CREATE OR REPLACE VIEW public.affiliate_earnings AS
  SELECT affiliate_id,
         COUNT(*)::int AS sales,
         SUM(commission_cents)::bigint AS commission_cents_total,
         currency
  FROM public.orders
  WHERE status = 'paid' AND affiliate_id IS NOT NULL
  GROUP BY affiliate_id, currency;
GRANT SELECT ON public.affiliate_earnings TO authenticated;
