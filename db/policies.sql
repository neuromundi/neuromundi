-- ============================================================================
-- NeuroDirectorio — Migración consolidada de políticas y rol admin
-- Aplica DESPUÉS de la PARTE 1 y de db/prescriptions.sql.
-- Idempotente: usa DROP ... IF EXISTS antes de cada CREATE.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- A. CORRECCIONES A LA PARTE 1
-- ────────────────────────────────────────────────────────────────────────────

-- A.1 provider_categories tenía RLS habilitado pero sin políticas (negaba todo).
DROP POLICY IF EXISTS "provider_categories_select_public" ON public.provider_categories;
CREATE POLICY "provider_categories_select_public"
  ON public.provider_categories FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "provider_categories_write_own" ON public.provider_categories;
CREATE POLICY "provider_categories_write_own"
  ON public.provider_categories FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- A.2 Bloquear el auto-escaneo (el proveedor no puede ser el padre).
DROP POLICY IF EXISTS "transactions_insert_provider" ON public.discount_transactions;
CREATE POLICY "transactions_insert_provider"
  ON public.discount_transactions FOR INSERT
  WITH CHECK (
    provider_id = auth.uid()
    AND parent_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'provider'
    )
  );

-- Red de seguridad a nivel tabla (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_scan'
  ) THEN
    ALTER TABLE public.discount_transactions
      ADD CONSTRAINT chk_no_self_scan CHECK (provider_id <> parent_id);
  END IF;
END $$;

-- A.3 Política de encuestas: quitar el NOT EXISTS ambiguo (el UNIQUE ya evita
--     duplicados) y conservar la validación de la transacción asociada.
DROP POLICY IF EXISTS "surveys_insert_associated_parent" ON public.satisfaction_surveys;
CREATE POLICY "surveys_insert_associated_parent"
  ON public.satisfaction_surveys FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.discount_transactions dt
      WHERE dt.id = transaction_id
        AND dt.parent_id = auth.uid()
        AND dt.status = 'pending'
    )
  );

-- A.4 Fijar search_path en la función de expiración (faltaba).
CREATE OR REPLACE FUNCTION public.expire_stale_transactions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discount_transactions
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$;

-- A.5 El padre puede leer las ofertas de sus propias transacciones (historial),
--     aunque ya no estén activas. Las políticas SELECT se combinan con OR.
DROP POLICY IF EXISTS "offers_select_for_my_transactions" ON public.offers;
CREATE POLICY "offers_select_for_my_transactions"
  ON public.offers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.discount_transactions dt
    WHERE dt.offer_id = offers.id AND dt.parent_id = auth.uid()
  ));

-- ────────────────────────────────────────────────────────────────────────────
-- B. VISTA PÚBLICA DE COMENTARIOS (para la pestaña "Mis Calificaciones")
--    Expone solo texto, fecha y promedio; nunca datos del padre.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.public_provider_comments AS
SELECT
  s.provider_id,
  s.comments,
  s.created_at,
  ROUND(
    (s.quality_score + s.human_treatment_score + s.accessibility_score +
     s.price_value_score + s.offer_compliance_score +
     s.sensory_adaptation_score + s.flexibility_crisis_score)::NUMERIC / 7, 1
  ) AS overall
FROM public.satisfaction_surveys s
WHERE s.comments IS NOT NULL AND length(trim(s.comments)) > 0;

GRANT SELECT ON public.public_provider_comments TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- C. ROL ADMIN (verificación y publicación de proveedores)
-- ────────────────────────────────────────────────────────────────────────────

-- Helper SECURITY DEFINER: evita recursión de RLS al consultar el rol propio.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- El admin puede leer todos los perfiles (incluye no publicados / pendientes).
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Las escrituras de moderación se hacen por RPC (acotadas a campos concretos),
-- no por una política UPDATE amplia.
CREATE OR REPLACE FUNCTION public.admin_set_verified(p_id UUID, p_value BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE public.profiles SET is_verified = p_value WHERE id = p_id AND role = 'provider';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_published(p_id UUID, p_value BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE public.profiles SET is_published = p_value WHERE id = p_id AND role = 'provider';
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin()                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(UUID, BOOLEAN)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_published(UUID, BOOLEAN)  TO authenticated;

-- Para nombrar a un admin (ejecutar manualmente con el id deseado):
--   UPDATE public.profiles SET role = 'admin' WHERE id = '<uuid>';
