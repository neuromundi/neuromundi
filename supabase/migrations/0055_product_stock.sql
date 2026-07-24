-- ============================================================================
-- 0055 — Inventario de productos (stock)
--
-- La tienda no llevaba control de existencias. Se añade `stock`:
--   · NULL  = sin control (catálogo ilimitado, comportamiento actual).
--   · 0..n  = unidades disponibles.
--
-- El checkout de producto (create-product-checkout) rechaza si stock = 0; el
-- webhook DESCUENTA una unidad cuando el pago se confirma. Idempotente.
-- Aplicar después de la 0054.
-- ============================================================================

alter table public.products
  add column if not exists stock integer;

alter table public.products drop constraint if exists products_stock_nonneg;
alter table public.products add constraint products_stock_nonneg
  check (stock is null or stock >= 0);

-- Descuento atómico de una unidad (lo llama el webhook al confirmarse el pago).
-- Solo descuenta si hay control de stock y queda al menos una unidad; así nunca
-- baja de cero ni afecta a los productos sin control.
drop function if exists public.decrement_stock(uuid);
create or replace function public.decrement_stock(p_product_id uuid)
returns void
language sql security definer set search_path = public as $$
  update public.products
     set stock = stock - 1
   where id = p_product_id and stock is not null and stock > 0;
$$;

-- La invoca el webhook con service_role; no la exponemos a usuarios.
revoke all on function public.decrement_stock(uuid) from public, anon, authenticated;
