-- ============================================================================
-- Reseñas de producto (confianza en la tienda)
-- ----------------------------------------------------------------------------
-- Cualquier persona registrada puede dejar UNA reseña por producto (1–5 + texto
-- opcional). El público ve las reseñas y el promedio agregado. El autor puede
-- editar/eliminar la suya; el admin modera todo.
-- Idempotente.
-- ============================================================================

create table if not exists public.product_reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, reviewer_id)
);

create index if not exists product_reviews_product_idx
  on public.product_reviews (product_id, created_at desc);

alter table public.product_reviews enable row level security;

-- Lectura pública de reseñas (para mostrar promedio y comentarios).
drop policy if exists "product_reviews_public_read" on public.product_reviews;
create policy "product_reviews_public_read" on public.product_reviews
  for select using (true);

-- Cada persona gestiona SU reseña.
drop policy if exists "product_reviews_insert_own" on public.product_reviews;
create policy "product_reviews_insert_own" on public.product_reviews
  for insert with check (auth.uid() = reviewer_id);

drop policy if exists "product_reviews_update_own" on public.product_reviews;
create policy "product_reviews_update_own" on public.product_reviews
  for update using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);

drop policy if exists "product_reviews_delete_own" on public.product_reviews;
create policy "product_reviews_delete_own" on public.product_reviews
  for delete using (auth.uid() = reviewer_id);

drop policy if exists "product_reviews_admin_all" on public.product_reviews;
create policy "product_reviews_admin_all" on public.product_reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- updated_at automático al editar la reseña.
create or replace function public.trg_product_reviews_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists product_reviews_touch on public.product_reviews;
create trigger product_reviews_touch
  before update on public.product_reviews
  for each row execute function public.trg_product_reviews_touch();

-- Vista agregada (promedio + total) para las tarjetas de la tienda.
create or replace view public.public_product_ratings as
  select
    product_id,
    round(avg(rating)::numeric, 2) as avg_rating,
    count(*)                       as review_count
  from public.product_reviews
  group by product_id;

grant select on public.public_product_ratings to anon, authenticated;
