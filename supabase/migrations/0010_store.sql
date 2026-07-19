-- ============================================================================
-- Tienda Neuromundi — taxonomía de neurodesarrollo, destacados y acceso para
-- todos los perfiles (con aprobación del admin)
-- ----------------------------------------------------------------------------
-- Neuromundi NO cobra comisión por las ventas ni promueve su comercialización:
-- la operación es responsabilidad exclusiva de quien ofrece y de quien adquiere.
-- El producto enlaza a la compra externa (products.purchase_url).
-- Idempotente.
-- ============================================================================

-- 1) Clasificación propia de la tienda (neurodesarrollo/neurodiversidad) y
--    destacados (promociones).
alter table public.products add column if not exists store_category text;
alter table public.products add column if not exists is_featured boolean not null default false;
create index if not exists products_store_category_idx on public.products (store_category);
create index if not exists products_featured_idx on public.products (is_featured) where is_featured;

-- 2) RLS: cualquier persona registrada puede tener su tienda (gestionar SUS
--    productos). El público ve los aprobados y activos. El admin gestiona todo.
alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (is_active = true and status = 'approved');

drop policy if exists "products_select_own" on public.products;
create policy "products_select_own" on public.products
  for select using (auth.uid() = vendor_id);

drop policy if exists "products_insert_own" on public.products;
create policy "products_insert_own" on public.products
  for insert with check (auth.uid() = vendor_id);

drop policy if exists "products_update_own" on public.products;
create policy "products_update_own" on public.products
  for update using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

drop policy if exists "products_delete_own" on public.products;
create policy "products_delete_own" on public.products
  for delete using (auth.uid() = vendor_id);

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Tienda corporativa del admin: los productos creados por un administrador se
--    aprueban automáticamente (no requieren revisión). El resto entra 'pending'.
create or replace function public.trg_products_admin_autoapprove()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    new.status := 'approved';
  end if;
  return new;
end;
$$;

drop trigger if exists products_admin_autoapprove on public.products;
create trigger products_admin_autoapprove
  before insert on public.products
  for each row execute function public.trg_products_admin_autoapprove();
