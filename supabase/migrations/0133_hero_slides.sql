-- 0133_hero_slides.sql
-- Carrusel de la portada editable por el admin: escenas con imagen (subida al
-- bucket público 'hero') y captions por idioma (jsonb {lang: texto}, con respaldo
-- al español). Si NO hay escenas activas, el front usa las 15 por defecto.
-- Idempotente (mismo patrón que el bucket 'badges' de 0066).

create table if not exists public.hero_slides (
  id         uuid primary key default gen_random_uuid(),
  image_url  text not null,
  captions   jsonb not null default '{}'::jsonb,   -- { "es": "...", "en": "...", ... }
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

-- Lectura pública de las escenas activas; el admin ve todas.
drop policy if exists "hero_select" on public.hero_slides;
create policy "hero_select" on public.hero_slides
  for select using (is_active = true or public.is_admin());
drop policy if exists "hero_admin_ins" on public.hero_slides;
create policy "hero_admin_ins" on public.hero_slides
  for insert with check (public.is_admin());
drop policy if exists "hero_admin_upd" on public.hero_slides;
create policy "hero_admin_upd" on public.hero_slides
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "hero_admin_del" on public.hero_slides;
create policy "hero_admin_del" on public.hero_slides
  for delete using (public.is_admin());

create index if not exists idx_hero_slides_order on public.hero_slides (is_active, sort_order);

-- Bucket público para las imágenes del carrusel.
insert into storage.buckets (id, name, public)
values ('hero', 'hero', true)
on conflict (id) do nothing;

-- Lectura pública del bucket; escritura/borrado solo admin.
drop policy if exists "hero_bucket_read" on storage.objects;
create policy "hero_bucket_read" on storage.objects
  for select using (bucket_id = 'hero');
drop policy if exists "hero_bucket_write" on storage.objects;
create policy "hero_bucket_write" on storage.objects
  for insert with check (bucket_id = 'hero' and public.is_admin());
drop policy if exists "hero_bucket_update" on storage.objects;
create policy "hero_bucket_update" on storage.objects
  for update using (bucket_id = 'hero' and public.is_admin());
drop policy if exists "hero_bucket_delete" on storage.objects;
create policy "hero_bucket_delete" on storage.objects
  for delete using (bucket_id = 'hero' and public.is_admin());
