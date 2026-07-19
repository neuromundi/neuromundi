-- ============================================================================
-- Denuncias de NO miembros (anónimas para externos a la comunidad).
-- ----------------------------------------------------------------------------
-- Permite que personas sin cuenta presenten denuncias, aportando un correo de
-- contacto obligatorio y un nombre opcional. Los miembros siguen denunciando
-- autenticados. Toda denuncia es anónima frente al denunciado. Requiere 0015.
-- Idempotente.
-- ============================================================================

alter table public.reports alter column reporter_id drop not null;
alter table public.reports add column if not exists reporter_email text;
alter table public.reports add column if not exists reporter_name text;
alter table public.reports add column if not exists is_member boolean not null default true;

-- Denuncia de NO miembro (anónima): sin sesión, sin reporter_id, con correo.
drop policy if exists "reports_insert_anon" on public.reports;
create policy "reports_insert_anon" on public.reports
  for insert to anon
  with check (reporter_id is null and coalesce(reporter_email, '') <> '');

-- Storage: los no miembros suben en la carpeta 'anon/…'.
drop policy if exists "reports_upload_anon" on storage.objects;
create policy "reports_upload_anon" on storage.objects
  for insert to anon
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = 'anon');
