-- ============================================================================
-- NeuroDirectorio — Marketplace de recetas (carrito recetado)
-- Requiere la PARTE 1 (profiles, categories, handle_updated_at).
-- ============================================================================

-- Estados del ciclo de vida de una receta
CREATE TYPE public.prescription_status AS ENUM
  ('draft', 'sent', 'viewed', 'ordered', 'archived');

-- ============================================================================
-- TABLA: products  (catálogo de oferentes afiliados = merchants)
-- ============================================================================
CREATE TABLE public.products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         DECIMAL(10, 2),
  currency      TEXT NOT NULL DEFAULT 'MXN',
  image_url     TEXT,
  -- Handoff: dónde concreta la compra el padre CON el proveedor afiliado.
  purchase_url  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_vendor   ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_active   ON public.products(is_active);

-- ============================================================================
-- TABLA: prescriptions  (la "receta" / carrito recetado a UN padre)
-- ============================================================================
CREATE TABLE public.prescriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  parent_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title         TEXT NOT NULL DEFAULT 'Recomendación',
  note          TEXT,
  status        public.prescription_status NOT NULL DEFAULT 'draft',
  sent_at       TIMESTAMPTZ,
  viewed_at     TIMESTAMPTZ,
  ordered_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_presc_not_self CHECK (therapist_id <> parent_id)
);

CREATE INDEX idx_presc_therapist ON public.prescriptions(therapist_id);
CREATE INDEX idx_presc_parent    ON public.prescriptions(parent_id);
CREATE INDEX idx_presc_status    ON public.prescriptions(status);

-- ============================================================================
-- TABLA: prescription_items  (productos dentro de una receta)
-- ============================================================================
CREATE TABLE public.prescription_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note                TEXT,                       -- guía de uso por producto
  unit_price_snapshot DECIMAL(10, 2),             -- precio al momento de recetar
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (prescription_id, product_id)
);

CREATE INDEX idx_presc_items_presc ON public.prescription_items(prescription_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Congela el precio del producto al añadirlo a la receta.
CREATE OR REPLACE FUNCTION public.set_item_price_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.unit_price_snapshot IS NULL THEN
    SELECT price INTO NEW.unit_price_snapshot
    FROM public.products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_item_price_snapshot
  BEFORE INSERT ON public.prescription_items
  FOR EACH ROW EXECUTE FUNCTION public.set_item_price_snapshot();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items  ENABLE ROW LEVEL SECURITY;

-- ── products ────────────────────────────────────────────────────────────────
-- Lectura pública de productos activos (catálogo).
CREATE POLICY "products_select_active"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR vendor_id = auth.uid());

-- Lectura de productos (aunque estén inactivos) que aparecen en una receta
-- de la que el usuario es parte (terapeuta o padre).
CREATE POLICY "products_select_in_my_prescriptions"
  ON public.products FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.prescription_items pi
    JOIN public.prescriptions p ON p.id = pi.prescription_id
    WHERE pi.product_id = products.id
      AND (p.parent_id = auth.uid() OR p.therapist_id = auth.uid())
  ));

-- Solo el merchant dueño gestiona sus productos.
CREATE POLICY "products_insert_vendor"
  ON public.products FOR INSERT
  WITH CHECK (
    vendor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'provider' AND provider_type = 'merchant'
    )
  );

CREATE POLICY "products_update_vendor"
  ON public.products FOR UPDATE
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "products_delete_vendor"
  ON public.products FOR DELETE
  USING (vendor_id = auth.uid());

-- ── prescriptions ─────────────────────────────────────────────────────────
-- Las leen las dos partes: terapeuta autor y padre destinatario.
CREATE POLICY "presc_select_parties"
  ON public.prescriptions FOR SELECT
  USING (therapist_id = auth.uid() OR parent_id = auth.uid());

-- Solo un service_provider crea recetas, dirigidas a un padre real.
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
      SELECT 1 FROM public.profiles WHERE id = parent_id AND role = 'parent'
    )
  );

-- El terapeuta edita/envía su receta; el padre cambia estado vía RPC (abajo).
CREATE POLICY "presc_update_therapist"
  ON public.prescriptions FOR UPDATE
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

-- Solo borrar borradores propios.
CREATE POLICY "presc_delete_therapist_draft"
  ON public.prescriptions FOR DELETE
  USING (therapist_id = auth.uid() AND status = 'draft');

-- ── prescription_items ──────────────────────────────────────────────────────
CREATE POLICY "presc_items_select_parties"
  ON public.prescription_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_id
      AND (p.therapist_id = auth.uid() OR p.parent_id = auth.uid())
  ));

-- El terapeuta solo modifica ítems mientras la receta es borrador.
CREATE POLICY "presc_items_write_therapist_draft"
  ON public.prescription_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_id AND p.therapist_id = auth.uid() AND p.status = 'draft'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = prescription_id AND p.therapist_id = auth.uid() AND p.status = 'draft'
  ));

-- ============================================================================
-- FUNCIONES (SECURITY DEFINER)
-- ============================================================================

-- Resuelve el QR de un padre devolviendo SOLO id y nombre cuando el token
-- coincide. Privacidad: no expone el perfil del padre por RLS y exige el token
-- exacto. NOTA: el escáner de descuentos debería validar también con esta
-- función (reemplazando la lectura directa de profiles, que RLS bloquea).
CREATE OR REPLACE FUNCTION public.resolve_parent_by_qr(p_id UUID, p_token UUID)
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT pr.id, pr.full_name
  FROM public.profiles pr
  WHERE pr.id = p_id AND pr.qr_token = p_token AND pr.role = 'parent';
END; $$;

-- El padre marca su receta como vista (sent → viewed).
CREATE OR REPLACE FUNCTION public.prescription_mark_viewed(p_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.prescriptions
  SET status    = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
      viewed_at = COALESCE(viewed_at, NOW())
  WHERE id = p_id AND parent_id = auth.uid();
END; $$;

-- El padre marca su receta como pedida (sent/viewed → ordered).
CREATE OR REPLACE FUNCTION public.prescription_mark_ordered(p_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.prescriptions
  SET status     = 'ordered',
      ordered_at = COALESCE(ordered_at, NOW())
  WHERE id = p_id AND parent_id = auth.uid() AND status IN ('sent', 'viewed');
END; $$;

GRANT EXECUTE ON FUNCTION public.resolve_parent_by_qr(UUID, UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.prescription_mark_viewed(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.prescription_mark_ordered(UUID)   TO authenticated;

-- Lectura pública del catálogo para anónimos (descubrimiento de productos).
GRANT SELECT ON public.products TO anon, authenticated;
