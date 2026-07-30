-- 0066_labor_inclusion.sql
-- Inclusión laboral: nuevo tipo de prestador "company" (Empresa inclusiva),
-- vacantes (job_openings) que cada empresa gestiona, y distintivos descargables
-- por tipo de miembro que el admin sube/baja (member_badges + bucket 'badges').
--
-- Idempotente: drop+add constraint, create table if not exists, create or
-- replace, drop policy if exists + create policy, insert ... on conflict.

-- ── 1) Nuevo provider_type 'company' ────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_provider_type_check;
alter table public.profiles add constraint profiles_provider_type_check
  check (provider_type is null or provider_type in (
    'service_provider', 'merchant', 'school', 'clinic',
    'wellness', 'tourism', 'legal', 'ngo', 'caregiver', 'company'
  ));

-- ── 2) Vacantes (todas las columnas OPCIONALES salvo el dueño) ───────────────
create table if not exists public.job_openings (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.profiles (id) on delete cascade,
  positions    int,                 -- número de plazas
  title        text,                -- puesto
  experience   text,                -- experiencia requerida
  education    text,                -- formación profesional requerida
  salary_text  text,                -- rango de salario (texto libre, multi-moneda)
  country      text,
  city         text,
  skills       text,                -- habilidades esperadas
  apply_email  text,                -- correo para postulaciones
  apply_url    text,                -- enlace al empleo
  note         text,                -- otro dato importante
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists job_openings_active_country_idx
  on public.job_openings (is_active, country);
create index if not exists job_openings_company_idx
  on public.job_openings (company_id);

alter table public.job_openings enable row level security;

-- Lectura: vacantes activas son públicas; el dueño y el admin ven también las suyas ocultas.
drop policy if exists "jobs_select" on public.job_openings;
create policy "jobs_select" on public.job_openings
  for select using (is_active = true or company_id = auth.uid() or public.is_admin());

-- Alta: solo para uno mismo (la empresa dueña).
drop policy if exists "jobs_insert" on public.job_openings;
create policy "jobs_insert" on public.job_openings
  for insert with check (company_id = auth.uid());

-- Edición/borrado: el dueño o el admin.
drop policy if exists "jobs_update" on public.job_openings;
create policy "jobs_update" on public.job_openings
  for update using (company_id = auth.uid() or public.is_admin())
  with check (company_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_delete" on public.job_openings;
create policy "jobs_delete" on public.job_openings
  for delete using (company_id = auth.uid() or public.is_admin());

-- Vacantes públicas con el nombre de la empresa (para la página /inclusion-laboral).
-- SECURITY DEFINER: une a profiles sin exponer el resto del perfil por RLS.
drop function if exists public.public_jobs(text);
create or replace function public.public_jobs(p_country text default null)
returns table (
  id           uuid,
  company_name text,
  company_id   uuid,
  positions    int,
  title        text,
  experience   text,
  education     text,
  salary_text  text,
  country      text,
  city         text,
  skills       text,
  apply_email  text,
  apply_url    text,
  note         text,
  created_at   timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    j.id,
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Neuromundi'),
    j.company_id,
    j.positions, j.title, j.experience, j.education, j.salary_text,
    j.country, j.city, j.skills, j.apply_email, j.apply_url, j.note, j.created_at
  from public.job_openings j
  join public.profiles p on p.id = j.company_id
  where j.is_active = true
    and (p_country is null or j.country = p_country)
  order by j.created_at desc;
$$;
grant execute on function public.public_jobs(text) to anon, authenticated;

-- Países con al menos una vacante activa (para el selector de la página).
drop function if exists public.public_jobs_countries();
create or replace function public.public_jobs_countries()
returns table (country text, n bigint)
language sql stable security definer set search_path = public as $$
  select j.country, count(*)::bigint
  from public.job_openings j
  where j.is_active = true and j.country is not null and j.country <> ''
  group by j.country
  order by j.country asc;
$$;
grant execute on function public.public_jobs_countries() to anon, authenticated;

-- ── 3) Distintivos descargables por tipo de miembro ─────────────────────────
-- El admin sube un archivo por (member_type, badge_key) al bucket 'badges' y
-- registra aquí su URL pública; los miembros de ese tipo lo descargan.
create table if not exists public.member_badges (
  id           uuid primary key default gen_random_uuid(),
  member_type  text not null,       -- families, service_provider, merchant, school, company, founder…
  badge_key    text not null,       -- p. ej. 'empresa_inclusiva', 'aliado_neuromundi'
  title        text,                -- nombre visible del distintivo
  storage_path text,                -- ruta en el bucket 'badges'
  public_url   text,                -- URL pública para descargar
  is_active    boolean not null default true,
  updated_at   timestamptz not null default now(),
  constraint member_badges_uq unique (member_type, badge_key)
);

alter table public.member_badges enable row level security;

-- Lectura pública de los distintivos activos (el miembro los descarga).
drop policy if exists "badges_select" on public.member_badges;
create policy "badges_select" on public.member_badges
  for select using (is_active = true or public.is_admin());

-- Alta/edición/borrado: solo admin.
drop policy if exists "badges_admin_ins" on public.member_badges;
create policy "badges_admin_ins" on public.member_badges
  for insert with check (public.is_admin());
drop policy if exists "badges_admin_upd" on public.member_badges;
create policy "badges_admin_upd" on public.member_badges
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "badges_admin_del" on public.member_badges;
create policy "badges_admin_del" on public.member_badges
  for delete using (public.is_admin());

-- Bucket público para los archivos de distintivo.
insert into storage.buckets (id, name, public)
values ('badges', 'badges', true)
on conflict (id) do nothing;

-- Lectura pública del bucket; escritura/borrado solo admin.
drop policy if exists "badges_bucket_read" on storage.objects;
create policy "badges_bucket_read" on storage.objects
  for select using (bucket_id = 'badges');
drop policy if exists "badges_bucket_write" on storage.objects;
create policy "badges_bucket_write" on storage.objects
  for insert with check (bucket_id = 'badges' and public.is_admin());
drop policy if exists "badges_bucket_update" on storage.objects;
create policy "badges_bucket_update" on storage.objects
  for update using (bucket_id = 'badges' and public.is_admin());
drop policy if exists "badges_bucket_delete" on storage.objects;
create policy "badges_bucket_delete" on storage.objects
  for delete using (bucket_id = 'badges' and public.is_admin());
