-- ============================================================================
-- 0059 — Subcategoría de producto en la Tienda
--
-- La Tienda ya clasificaba por categoría (`store_category`). Ahora se añade una
-- SUBCATEGORÍA opcional (`store_subcategory`) para una clasificación más fina.
-- El valor es una clave canónica del catálogo (se localiza en el front por i18n).
--
-- Idempotente. Aplicar después de la 0058.
-- ============================================================================

alter table public.products add column if not exists store_subcategory text;
