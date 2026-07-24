-- ============================================================================
-- 0051 — Métricas de perfil para el prestador (vistas y clics a contacto)
--
-- El prestador no tenía forma de saber cuánta gente ve su perfil ni cuántos
-- pulsan un botón de contacto. Esta migración registra esos eventos y expone un
-- resumen SOLO para el prestador dueño.
--
-- Anti-inflado: no se cuenta cuando el propio prestador se ve; y para usuarios
-- con sesión se deduplica por (perfil, tipo, día) — un mismo miembro cuenta una
-- vez al día. Las visitas anónimas se cuentan sin deduplicar (no hay a quién
-- atribuirlas), lo que da una cifra directional, suficiente para el objetivo.
--
-- Idempotente. Aplicar después de la 0050.
-- ============================================================================

create table if not exists public.profile_events (
  id           uuid primary key default gen_random_uuid(),
  provider_id  uuid not null references public.profiles(id) on delete cascade,
  kind         text not null check (kind in ('view', 'contact')),
  viewer_id    uuid references public.profiles(id) on delete set null,
  day          date not null default current_date,
  created_at   timestamptz not null default now()
);

create index if not exists idx_profile_events_provider
  on public.profile_events (provider_id, kind, created_at);

-- Deduplica al miembro con sesión: una fila por (perfil, tipo, viewer, día).
-- El índice parcial no aplica a las filas anónimas (viewer_id nulo).
create unique index if not exists uq_profile_event_daily
  on public.profile_events (provider_id, kind, viewer_id, day)
  where viewer_id is not null;

alter table public.profile_events enable row level security;

-- El prestador ve SUS eventos. La escritura es siempre por RPC (security
-- definer), así que no hay política de insert: nadie mete filas a mano.
drop policy if exists profile_events_owner on public.profile_events;
create policy profile_events_owner on public.profile_events
  for select using (provider_id = auth.uid());

-- ── Registrar un evento (cualquiera, con o sin sesión) ──────────────────────
drop function if exists public.track_profile_event(uuid, text);
create or replace function public.track_profile_event(p_provider_id uuid, p_kind text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_viewer uuid := auth.uid();
begin
  if p_provider_id is null or p_kind not in ('view', 'contact') then
    return;
  end if;
  -- No se cuenta la autovisita del propio prestador.
  if v_viewer is not null and v_viewer = p_provider_id then
    return;
  end if;
  insert into public.profile_events (provider_id, kind, viewer_id, day)
  values (p_provider_id, p_kind, v_viewer, current_date)
  on conflict do nothing;  -- dedupe diario para miembros con sesión
end;
$$;

grant execute on function public.track_profile_event(uuid, text) to anon, authenticated;

-- ── Resumen para el prestador dueño ─────────────────────────────────────────
drop function if exists public.provider_metrics();
create or replace function public.provider_metrics()
returns table (
  views_total integer,
  views_30d integer,
  contacts_total integer,
  contacts_30d integer
)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where e.kind = 'view')::int,
    count(*) filter (where e.kind = 'view' and e.created_at >= now() - interval '30 days')::int,
    count(*) filter (where e.kind = 'contact')::int,
    count(*) filter (where e.kind = 'contact' and e.created_at >= now() - interval '30 days')::int
  from public.profile_events e
  where e.provider_id = auth.uid();
$$;

grant execute on function public.provider_metrics() to authenticated;
