-- ============================================================================
-- Kit de Herramientas — tablas de progreso y de especialistas sugeridos.
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Progreso de lectura por persona (qué módulos del Kit ha leído).
-- ---------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id   uuid        not null references auth.users (id) on delete cascade,
  module_id text        not null,
  read_at   timestamptz not null default now(),
  primary key (user_id, module_id)
);

alter table public.user_progress enable row level security;

-- Cada persona solo ve y edita su propio avance.
drop policy if exists "progress_select_own" on public.user_progress;
create policy "progress_select_own" on public.user_progress
  for select using (auth.uid() = user_id);

drop policy if exists "progress_upsert_own" on public.user_progress;
create policy "progress_upsert_own" on public.user_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.user_progress;
create policy "progress_update_own" on public.user_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.user_progress;
create policy "progress_delete_own" on public.user_progress
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2) Especialistas sugeridos por módulo (A–E).
--    Lectura pública; la escritura queda para la service_role / panel admin.
-- ---------------------------------------------------------------------------
create table if not exists public.specialists (
  id          uuid        primary key default gen_random_uuid(),
  full_name   text,
  specialty   text,
  module_type text        not null,
  city        text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create index if not exists specialists_module_type_idx
  on public.specialists (module_type);

alter table public.specialists enable row level security;

-- Cualquiera puede leer las sugerencias (la app decide a quién mostrarlas).
drop policy if exists "specialists_read_all" on public.specialists;
create policy "specialists_read_all" on public.specialists
  for select using (true);

-- Nota: no se crean políticas de escritura pública a propósito. Alta y edición
-- se realizan con la service_role (seed) o desde un panel administrativo.
