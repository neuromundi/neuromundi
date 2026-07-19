-- ============================================================================
-- Miembros Fundadores + Analítica (tracking de conversión)
-- ----------------------------------------------------------------------------
-- 1) analytics_events: eventos ligeros (p. ej. clics/cierres del popup de
--    Fundador) para medir conversión. Inserta cualquiera (incl. anónimos);
--    la lectura queda para administradores.
-- 2) founder_members: programa de "Miembro Fundador" con cupos por país:
--      - Familias/pacientes: primeros 500 por país.
--      - Profesionales y prestadores de servicios: primeros 100 por país.
-- Idempotente.
-- ============================================================================

-- ── 1) Analítica ────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  event      text not null,
  props      jsonb not null default '{}'::jsonb,
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_event_idx on public.analytics_events (event, created_at);

alter table public.analytics_events enable row level security;

-- Cualquiera puede REGISTRAR un evento (incluye visitantes anónimos).
drop policy if exists "analytics_insert_any" on public.analytics_events;
create policy "analytics_insert_any" on public.analytics_events
  for insert with check (true);

-- Solo administradores pueden LEER la analítica.
drop policy if exists "analytics_select_admin" on public.analytics_events;
create policy "analytics_select_admin" on public.analytics_events
  for select using (public.is_admin());

-- ── 2) Miembros Fundadores ──────────────────────────────────────────────────
create table if not exists public.founder_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('families', 'professionals', 'providers')),
  country    text,
  created_at timestamptz not null default now()
);
create index if not exists founder_members_country_kind_idx
  on public.founder_members (country, kind);

alter table public.founder_members enable row level security;

-- Lectura pública (el distintivo "Soy Fundador" se muestra en perfiles).
drop policy if exists "founder_select_all" on public.founder_members;
create policy "founder_select_all" on public.founder_members
  for select using (true);

-- Cupo por tipo de perfil.
create or replace function public.founder_capacity(p_kind text)
returns integer language sql immutable as $$
  select case when p_kind = 'families' then 500 else 100 end;
$$;

-- Reclama un cupo de fundador para el usuario actual, si aún hay disponibilidad
-- en su país y tipo. Devuelve true si quedó registrado como fundador.
create or replace function public.claim_founder_slot(p_kind text, p_country text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_count integer;
begin
  if v_uid is null then return false; end if;
  if p_kind not in ('families', 'professionals', 'providers') then return false; end if;

  -- ¿Ya es fundador?
  if exists (select 1 from public.founder_members where user_id = v_uid) then
    return true;
  end if;

  -- ¿Hay cupo en su país y tipo?
  select count(*) into v_count
  from public.founder_members
  where kind = p_kind and country is not distinct from p_country;

  if v_count >= public.founder_capacity(p_kind) then
    return false;
  end if;

  insert into public.founder_members (user_id, kind, country)
  values (v_uid, p_kind, p_country)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

revoke all on function public.claim_founder_slot(text, text) from public, anon;
grant execute on function public.claim_founder_slot(text, text) to authenticated;

-- Cupos usados por país y tipo (para el panel admin / la landing de fundadores).
create or replace view public.founder_counts
  with (security_invoker = off) as
  select country, kind, count(*)::int as used,
         public.founder_capacity(kind) as capacity
  from public.founder_members
  group by country, kind;

grant select on public.founder_counts to anon, authenticated;

-- ¿El usuario es fundador? (helper para la app.)
create or replace function public.is_founder(p_id uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.founder_members where user_id = p_id);
$$;
