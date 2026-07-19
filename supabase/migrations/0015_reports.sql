-- ============================================================================
-- Denuncias de la comunidad ("Denuncia").
-- ----------------------------------------------------------------------------
-- Cualquier miembro autenticado puede denunciar incumplimientos, suplantación
-- de identidad, piratería de productos u otros. Se guardan datos del denunciante
-- (su perfil) y del denunciado (número de membresía) y adjuntos (imágenes,
-- videos, documentos) en Storage. Solo el propio denunciante y el admin pueden
-- leer la denuncia; el admin gestiona el estado. Idempotente.
-- ============================================================================

create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid not null references auth.users (id) on delete cascade,
  reported_member_no  bigint,
  category            text not null,
  category_other      text,
  description         text not null,
  attachments         text[] not null default '{}',
  status              text not null default 'open',   -- open | in_review | resolved | dismissed
  admin_note          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists reports_reporter_idx on public.reports (reporter_id);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin" on public.reports
  for select using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- Lista para el admin (ordenada por más recientes).
create or replace function public.admin_reports()
returns setof public.reports
language sql stable security definer set search_path = public as $$
  select * from public.reports where public.is_admin() order by created_at desc;
$$;
grant execute on function public.admin_reports() to authenticated;

-- ── Storage: bucket privado para los adjuntos de denuncias ───────────────────
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- Subida: el usuario autenticado sube dentro de su carpeta (primer segmento = uid).
drop policy if exists "reports_upload_own" on storage.objects;
create policy "reports_upload_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

-- Lectura: el dueño de la carpeta o el admin.
drop policy if exists "reports_read_own_or_admin" on storage.objects;
create policy "reports_read_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reports'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
