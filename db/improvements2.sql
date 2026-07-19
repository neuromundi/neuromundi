-- ============================================================================
-- NeuroDirectorio / Neuromundi — MEJORAS 2
--   A) Moderación de productos (aprobación del admin antes de ser visibles).
--   B) Grados escolares capturados desde el registro (no solo en Configuración).
-- Aplica DESPUÉS de db/improvements.sql y db/social-onboarding.sql. Idempotente.
-- ============================================================================

-- ── A. Moderación de productos ───────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Los productos que ya existían se consideran aprobados (no esconderlos).
UPDATE public.products SET status = 'approved'
  WHERE status = 'pending' AND created_at < now() - INTERVAL '1 minute';

CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- La tienda pública solo ve productos APROBADOS y activos. El vendedor ve los
-- suyos (en cualquier estado) y el admin ve todo.
DROP POLICY IF EXISTS "products_select_active" ON public.products;
CREATE POLICY "products_select_active" ON public.products FOR SELECT
  USING (
    (is_active = TRUE AND status = 'approved')
    OR vendor_id = auth.uid()
    OR public.is_admin()
  );

-- El admin puede todo (incluye cambiar el status: aprobar/rechazar).
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trigger: un producto nuevo de un proveedor entra como 'pending'; al editar su
-- contenido vuelve a 'pending' (re-moderación). El admin no se ve afectado.
CREATE OR REPLACE FUNCTION public.products_moderation_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;  -- el admin controla el status libremente
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.review_note := NULL;
    NEW.reviewed_at := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si cambió contenido visible, vuelve a moderación.
    IF NEW.name IS DISTINCT FROM OLD.name
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.price IS DISTINCT FROM OLD.price
       OR NEW.image_url IS DISTINCT FROM OLD.image_url
       OR NEW.purchase_url IS DISTINCT FROM OLD.purchase_url THEN
      NEW.status := 'pending';
      NEW.reviewed_at := NULL;
    ELSE
      -- No permitir que el vendedor se auto-apruebe cambiando solo el status.
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_moderation ON public.products;
CREATE TRIGGER trg_products_moderation
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_moderation_guard();

-- ── B. Grados escolares en el registro (handle_new_user ampliado) ────────────
-- Se reescribe la función conservando TODO lo anterior y añadiendo school_grades.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m       JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role  TEXT  := COALESCE(NULLIF(m->>'role', ''), 'parent');
  v_rules TEXT  := NULLIF(m->>'rules_version', '');
  v_grades TEXT[] := COALESCE(
    (SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'school_grades') = 'array' THEN m->'school_grades' ELSE '[]'::jsonb END
    )),
    '{}'
  );
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, provider_type, business_name, is_company,
    birth_date, gender, condition, country, state, municipality,
    address, phone, services_offered, latitude, longitude,
    website, instagram, tiktok, facebook, cedula_profesional,
    school_grades, membership_status, rules_version_accepted, rules_accepted_at
  ) VALUES (
    NEW.id,
    v_role,
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
    NULLIF(m->>'longitude', '')::double precision,
    NULLIF(m->>'website', ''),
    NULLIF(m->>'instagram', ''),
    NULLIF(m->>'tiktok', ''),
    NULLIF(m->>'facebook', ''),
    NULLIF(m->>'cedula_profesional', ''),
    v_grades,
    CASE WHEN v_role IN ('parent', 'patient') THEN 'exempt' ELSE 'pending' END,
    v_rules,
    CASE WHEN v_rules IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_rules IS NOT NULL THEN
    INSERT INTO public.user_agreements (user_id, user_type, doc_version)
    VALUES (NEW.id, v_role, v_rules);
  END IF;

  RETURN NEW;
END;
$$;
