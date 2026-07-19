-- ============================================================================
-- provider-profile.sql — Campos del perfil de PROVEEDOR comercial.
-- Reutiliza business_name (marca), bio (descripción), website (e-commerce),
-- whatsapp, rfc, dirección/geo y provider_details. Añade arreglos indexables
-- de productos para el buscador. Amplía handle_new_user. Idempotente.
--
--   product_categories : categorías de producto (indexable)
--   products_offered   : productos que ofrece (indexable, texto libre)
--   sales_channels     : canales de venta
--   shipping_coverage  : cobertura de envíos
--   price_range        : '$' | '$$' | '$$$'
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS product_categories TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS products_offered   TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sales_channels     TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shipping_coverage  TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_range        TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_product_categories ON public.profiles USING GIN (product_categories);
CREATE INDEX IF NOT EXISTS idx_profiles_products_offered   ON public.profiles USING GIN (products_offered);

-- Trigger ampliado (conserva TODO lo anterior + campos de proveedor).
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
  v_grades TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'school_grades') = 'array' THEN m->'school_grades' ELSE '[]'::jsonb END)), '{}');
  v_interests TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'interests') = 'array' THEN m->'interests' ELSE '[]'::jsonb END)), '{}');
  v_specialties TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'specialties') = 'array' THEN m->'specialties' ELSE '[]'::jsonb END)), '{}');
  v_modalities TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'modalities') = 'array' THEN m->'modalities' ELSE '[]'::jsonb END)), '{}');
  v_ages TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'age_ranges') = 'array' THEN m->'age_ranges' ELSE '[]'::jsonb END)), '{}');
  v_areas TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'intervention_areas') = 'array' THEN m->'intervention_areas' ELSE '[]'::jsonb END)), '{}');
  v_pcats TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'product_categories') = 'array' THEN m->'product_categories' ELSE '[]'::jsonb END)), '{}');
  v_products TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'products_offered') = 'array' THEN m->'products_offered' ELSE '[]'::jsonb END)), '{}');
  v_channels TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'sales_channels') = 'array' THEN m->'sales_channels' ELSE '[]'::jsonb END)), '{}');
  v_shipping TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'shipping_coverage') = 'array' THEN m->'shipping_coverage' ELSE '[]'::jsonb END)), '{}');
  v_details JSONB := CASE WHEN jsonb_typeof(m->'provider_details') = 'object' THEN m->'provider_details' ELSE '{}'::jsonb END;
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, provider_type, business_name, is_company,
    birth_date, gender, condition, country, state, municipality,
    address, phone, services_offered, latitude, longitude,
    website, instagram, tiktok, facebook, cedula_profesional,
    school_grades, account_type, life_stage, interests, comms_opt_in,
    title_prefix, profession, bio, whatsapp, booking_url, linkedin,
    specialties, modalities, age_ranges, intervention_areas, provider_details, rfc,
    product_categories, products_offered, sales_channels, shipping_coverage, price_range,
    membership_status, rules_version_accepted, rules_accepted_at
  ) VALUES (
    NEW.id, v_role,
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
    NULLIF(m->>'account_type', ''),
    NULLIF(m->>'life_stage', ''),
    v_interests,
    COALESCE((m->>'comms_opt_in')::boolean, FALSE),
    NULLIF(m->>'title_prefix', ''),
    NULLIF(m->>'profession', ''),
    NULLIF(m->>'bio', ''),
    NULLIF(m->>'whatsapp', ''),
    NULLIF(m->>'booking_url', ''),
    NULLIF(m->>'linkedin', ''),
    v_specialties, v_modalities, v_ages, v_areas, v_details,
    NULLIF(m->>'rfc', ''),
    v_pcats, v_products, v_channels, v_shipping,
    NULLIF(m->>'price_range', ''),
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
