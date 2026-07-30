-- 0074_tribe_events.sql
-- Tribu Neuromundi F5 — Eventos con GUÍA DE ANTICIPACIÓN obligatoria (Social
-- Story): todo evento debe anticipar qué pasará, cómo es el lugar, la expectativa
-- de ruido y si habrá SALA DE CALMA (quiet room). Puntos automáticos: +20 por
-- publicar un evento con su guía, +15 por aportar un reporte de accesibilidad
-- sensorial. Idempotente.

create table if not exists public.tribe_events (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  description  text not null,               -- qué va a pasar (agenda)
  starts_at    timestamptz not null,
  location     text,                        -- dirección o lugar
  is_online    boolean not null default false,
  city         text,
  country      text,
  noise        text not null,               -- expectativa de ruido
  quiet_room   boolean not null default false,
  sensory_tips text,                        -- recomendaciones sensoriales
  status       text not null default 'active' check (status in ('active','cancelled')),
  created_at   timestamptz not null default now()
);
create index if not exists tribe_events_when_idx on public.tribe_events (status, starts_at);

create table if not exists public.tribe_event_rsvps (
  event_id  uuid not null references public.tribe_events (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.tribe_event_sensory (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.tribe_events (id) on delete cascade,
  reviewer_id    uuid not null references public.profiles (id) on delete cascade,
  noise_level    smallint check (noise_level between 1 and 5),
  quiet_room_used boolean,
  comfort        smallint check (comfort between 1 and 5),
  notes          text,
  created_at     timestamptz not null default now(),
  unique (event_id, reviewer_id)
);

alter table public.tribe_events        enable row level security;
alter table public.tribe_event_rsvps   enable row level security;
alter table public.tribe_event_sensory enable row level security;

drop policy if exists tribe_events_sel on public.tribe_events;
create policy tribe_events_sel on public.tribe_events
  for select using ((status = 'active' and public.is_tribe_active()) or creator_id = auth.uid() or public.is_admin());
drop policy if exists tribe_events_upd on public.tribe_events;
create policy tribe_events_upd on public.tribe_events
  for update using (creator_id = auth.uid() or public.is_admin()) with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists tribe_rsvp_sel on public.tribe_event_rsvps;
create policy tribe_rsvp_sel on public.tribe_event_rsvps
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists tribe_rsvp_ins on public.tribe_event_rsvps;
create policy tribe_rsvp_ins on public.tribe_event_rsvps
  for insert with check (user_id = auth.uid() and public.is_tribe_active());
drop policy if exists tribe_rsvp_del on public.tribe_event_rsvps;
create policy tribe_rsvp_del on public.tribe_event_rsvps
  for delete using (user_id = auth.uid());

drop policy if exists tribe_sensory_sel on public.tribe_event_sensory;
create policy tribe_sensory_sel on public.tribe_event_sensory
  for select using (public.is_tribe_active() or public.is_admin());

-- ── Crear evento (guía de anticipación obligatoria) → +20 al creador ────────
create or replace function public.tribe_create_event(
  p_title text, p_description text, p_starts_at timestamptz, p_location text,
  p_is_online boolean, p_city text, p_country text, p_noise text,
  p_quiet_room boolean, p_sensory_tips text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if not exists (select 1 from public.tribe_members m where m.user_id = auth.uid() and m.can_write) then
    raise exception 'tu posibilidad de publicar está suspendida'; end if;
  -- Guía de anticipación obligatoria: sin estos campos, no se publica.
  if coalesce(btrim(p_title),'') = '' or coalesce(btrim(p_description),'') = '' or coalesce(btrim(p_noise),'') = '' or p_starts_at is null then
    raise exception 'falta la guía de anticipación (qué pasará, ruido, fecha)';
  end if;

  insert into public.tribe_events (creator_id, title, description, starts_at, location, is_online, city, country, noise, quiet_room, sensory_tips)
  values (auth.uid(), btrim(p_title), btrim(p_description), p_starts_at, nullif(btrim(coalesce(p_location,'')),''),
          coalesce(p_is_online,false), nullif(btrim(coalesce(p_city,'')),''), nullif(btrim(coalesce(p_country,'')),''),
          btrim(p_noise), coalesce(p_quiet_room,false), nullif(btrim(coalesce(p_sensory_tips,'')),''))
  returning id into v_id;

  -- Punto automático por publicar con guía de anticipación.
  update public.tribe_members set points = points + 20 where user_id = auth.uid();

  -- El creador queda inscrito.
  insert into public.tribe_event_rsvps (event_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return v_id;
end; $$;
grant execute on function public.tribe_create_event(text, text, timestamptz, text, boolean, text, text, text, boolean, text) to authenticated;

-- Cancelar evento (creador o admin).
create or replace function public.tribe_cancel_event(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.tribe_events set status = 'cancelled'
   where id = p_event and (creator_id = auth.uid() or public.is_admin());
  if not found then raise exception 'evento no encontrado'; end if;
end; $$;
grant execute on function public.tribe_cancel_event(uuid) to authenticated;

-- Asistencia (RSVP) on/off.
create or replace function public.tribe_event_rsvp(p_event uuid, p_going boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_going then
    insert into public.tribe_event_rsvps (event_id, user_id) values (p_event, auth.uid()) on conflict do nothing;
  else
    delete from public.tribe_event_rsvps where event_id = p_event and user_id = auth.uid();
  end if;
end; $$;
grant execute on function public.tribe_event_rsvp(uuid, boolean) to authenticated;

-- Reporte de accesibilidad sensorial → +15 (una vez por evento).
create or replace function public.tribe_event_sensory_report(
  p_event uuid, p_noise smallint, p_quiet_used boolean, p_comfort smallint, p_notes text
)
returns void language plpgsql security definer set search_path = public as $$
declare v_existed boolean;
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  select exists (select 1 from public.tribe_event_sensory s where s.event_id = p_event and s.reviewer_id = auth.uid())
    into v_existed;
  insert into public.tribe_event_sensory (event_id, reviewer_id, noise_level, quiet_room_used, comfort, notes)
  values (p_event, auth.uid(), p_noise, p_quiet_used, p_comfort, nullif(btrim(coalesce(p_notes,'')),''))
  on conflict (event_id, reviewer_id) do update
    set noise_level = excluded.noise_level, quiet_room_used = excluded.quiet_room_used,
        comfort = excluded.comfort, notes = excluded.notes;
  -- Otorga +15 solo la PRIMERA vez que este miembro reporta este evento.
  if not v_existed then
    update public.tribe_members set points = points + 15 where user_id = auth.uid();
  end if;
end; $$;
grant execute on function public.tribe_event_sensory_report(uuid, smallint, boolean, smallint, text) to authenticated;

-- Listado de eventos activos (próximos primero) con asistentes y mi estado.
drop function if exists public.tribe_events_list(text);
create or replace function public.tribe_events_list(p_country text default null)
returns table (
  id uuid, title text, description text, starts_at timestamptz, location text, is_online boolean,
  city text, country text, noise text, quiet_room boolean, sensory_tips text,
  creator_name text, going bigint, i_going boolean, i_reported boolean, is_past boolean
)
language sql stable security definer set search_path = public as $$
  select
    e.id, e.title, e.description, e.starts_at, e.location, e.is_online, e.city, e.country,
    e.noise, e.quiet_room, e.sensory_tips,
    coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Miembro'),
    (select count(*) from public.tribe_event_rsvps r where r.event_id = e.id),
    exists (select 1 from public.tribe_event_rsvps r where r.event_id = e.id and r.user_id = auth.uid()),
    exists (select 1 from public.tribe_event_sensory s where s.event_id = e.id and s.reviewer_id = auth.uid()),
    (e.starts_at < now())
  from public.tribe_events e
  join public.profiles p on p.id = e.creator_id
  where e.status = 'active'
    and public.is_tribe_active()
    and (p_country is null or p_country = '' or e.country = p_country)
  order by e.starts_at asc;
$$;
grant execute on function public.tribe_events_list(text) to authenticated;
