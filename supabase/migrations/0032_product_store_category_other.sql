-- ============================================================================
-- Clasificación "Otro" en productos con especificación obligatoria
-- ----------------------------------------------------------------------------
-- Cuando el oferente elige store_category = 'otro', debe escribir la
-- clasificación que propone. Se guarda en store_category_other y la tienda la
-- muestra en lugar de la etiqueta genérica "Otro". Regla reforzada en la base
-- para que no quede vacía aunque se inserte por API. Idempotente.
-- ============================================================================

alter table public.products
  add column if not exists store_category_other text;

-- Normaliza vacíos a NULL antes de imponer la regla.
update public.products
  set store_category_other = null
  where store_category_other is not null and btrim(store_category_other) = '';

alter table public.products
  drop constraint if exists products_store_category_other_ck;

alter table public.products
  add constraint products_store_category_other_ck
  check (
    store_category is distinct from 'otro'
    or (store_category_other is not null and btrim(store_category_other) <> '')
  ) not valid;

-- 'not valid' evita fallar por filas históricas; se valida lo nuevo desde ya.
