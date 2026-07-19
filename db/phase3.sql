-- ============================================================================
-- NeuroDirectorio / Neuromundi — FASE 3 (Pagos: Stripe Connect)
-- Aplica DESPUÉS de db/phase2.sql (es el 10º archivo). Idempotente.
--
-- Modelo: la app es un PUENTE. El prestador conecta su cuenta de Stripe (Connect
-- Express) y recibe el 100% del cobro mediante "destination charges". La app
-- guarda un registro de pagos para el reporte diario con RFC del pagador.
-- ============================================================================

-- ── A. Columnas de pago en profiles ──────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,            -- cuenta conectada del prestador
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepts_payments BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consultation_amount NUMERIC(10, 2), -- precio por consulta (moneda local)
  ADD COLUMN IF NOT EXISTS consultation_currency TEXT,
  ADD COLUMN IF NOT EXISTS rfc TEXT;                           -- RFC del pagador (para facturación)

-- ── B. Registro de pagos (lo actualiza el webhook con service_role) ──────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payer_id              UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id        UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  kind                  TEXT NOT NULL DEFAULT 'consultation'
                        CHECK (kind IN ('consultation', 'therapy')),
  amount_cents          INTEGER NOT NULL,
  currency              TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payer_name            TEXT,
  payer_rfc             TEXT,
  stripe_session_id     TEXT,
  stripe_payment_intent TEXT,
  stripe_subscription_id TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at               TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON public.payments(provider_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Lo ven el prestador y el pagador; la escritura la hace el webhook (service_role).
DROP POLICY IF EXISTS "payments_select_parties" ON public.payments;
CREATE POLICY "payments_select_parties" ON public.payments FOR SELECT
  USING (provider_id = auth.uid() OR payer_id = auth.uid());

-- ── C. Reporte diario de facturación (RFC de los pagadores) ──────────────────
-- Devuelve los pagos cobrados de un prestador en una fecha, para que su contador
-- emita las facturas. SECURITY DEFINER + filtro por prestador autenticado.
CREATE OR REPLACE FUNCTION public.daily_billing_report(p_date DATE)
RETURNS TABLE (
  payer_name TEXT, payer_rfc TEXT, amount NUMERIC, currency TEXT, kind TEXT, paid_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT payer_name, payer_rfc, (amount_cents::numeric / 100), currency, kind, paid_at
  FROM public.payments
  WHERE provider_id = auth.uid()
    AND status = 'paid'
    AND paid_at::date = p_date
  ORDER BY paid_at;
$$;
GRANT EXECUTE ON FUNCTION public.daily_billing_report(DATE) TO authenticated;
