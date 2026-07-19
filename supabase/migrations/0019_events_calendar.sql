-- ============================================================================
-- Eventos (curados por el admin) + Calendario personal del usuario
-- ----------------------------------------------------------------------------
-- events: eventos presenciales (país/ciudad/lugar) o en línea (enlace),
--   publicados por la administración. Lectura pública de los publicados.
-- calendar_entries: agenda personal de cada usuario (eventos guardados, citas,
--   terapias, entradas propias). Cada quien gestiona SOLO las suyas.
-- Idempotente.
-- ============================================================================

-- 1) Eventos ------------------------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     text,
  is_online    boolean not null default false,
  online_url   text,
  country      text,
  city         text,
  venue        text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  cover_url    text,
  created_by   uuid references auth.users(id) on delete set null,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists events_country_starts_idx on public.events (country, starts_at);
create index if not exists events_starts_idx on public.events (starts_at);

alter table public.events enable row level security;

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select using (is_published = true);

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.trg_events_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch on public.events;
create trigger events_touch
  before update on public.events
  for each row execute function public.trg_events_touch();

-- 2) Calendario personal ------------------------------------------------------
create table if not exists public.calendar_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text,
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  location        text,
  online_url      text,
  kind            text not null default 'personal',   -- event | appointment | therapy | personal
  source_event_id uuid references public.events(id) on delete set null,
  color           text,
  created_at      timestamptz not null default now()
);

create index if not exists calendar_entries_user_idx on public.calendar_entries (user_id, starts_at);
-- Evita guardar el mismo evento dos veces en el calendario del usuario.
create unique index if not exists calendar_entries_user_event_uk
  on public.calendar_entries (user_id, source_event_id)
  where source_event_id is not null;

alter table public.calendar_entries enable row level security;

drop policy if exists "calendar_select_own" on public.calendar_entries;
create policy "calendar_select_own" on public.calendar_entries
  for select using (auth.uid() = user_id);

drop policy if exists "calendar_insert_own" on public.calendar_entries;
create policy "calendar_insert_own" on public.calendar_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_update_own" on public.calendar_entries;
create policy "calendar_update_own" on public.calendar_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar_delete_own" on public.calendar_entries;
create policy "calendar_delete_own" on public.calendar_entries
  for delete using (auth.uid() = user_id);
