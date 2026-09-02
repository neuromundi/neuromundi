-- 0088_neurocamps_events_mentors.sql
-- Neurocamps por sección — parte 2: eventos y mentoría filtran y se crean por
-- sección (las columnas `section` ya existen desde 0087). NULL = general/todos.
-- Idempotente (drop + recreate de las firmas que cambian).

-- ── Eventos: crear con sección ───────────────────────────────────────────────
drop function if exists public.tribe_create_event(text, text, timestamptz, text, boolean, text, text, text, boolean, text);
create or replace function public.tribe_create_event(
  p_title text, p_description text, p_starts_at timestamptz, p_location text,
  p_is_online boolean, p_city text, p_country text, p_noise text,
  p_quiet_room boolean, p_sensory_tips text, p_section text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if not exists (select 1 from public.tribe_members m where m.user_id = auth.uid() and m.can_write) then
    raise exception 'tu posibilidad de publicar está suspendida'; end if;
  if coalesce(btrim(p_title),'') = '' or coalesce(btrim(p_description),'') = '' or coalesce(btrim(p_noise),'') = '' or p_starts_at is null then
    raise exception 'falta la guía de anticipación (qué pasará, ruido, fecha)';
  end if;
  if p_section is not null and p_section <> '' and p_section not in ('neurodesarrollo','neurodivergencias','afecciones') then
    raise exception 'sección inválida';
  end if;

  insert into public.tribe_events (creator_id, title, description, starts_at, location, is_online, city, country, noise, quiet_room, sensory_tips, section)
  values (auth.uid(), btrim(p_title), btrim(p_description), p_starts_at, nullif(btrim(coalesce(p_location,'')),''),
          coalesce(p_is_online,false), nullif(btrim(coalesce(p_city,'')),''), nullif(btrim(coalesce(p_country,'')),''),
          btrim(p_noise), coalesce(p_quiet_room,false), nullif(btrim(coalesce(p_sensory_tips,'')),''), nullif(p_section,''))
  returning id into v_id;

  update public.tribe_members set points = points + 20 where user_id = auth.uid();
  insert into public.tribe_event_rsvps (event_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return v_id;
end; $$;
grant execute on function public.tribe_create_event(text, text, timestamptz, text, boolean, text, text, text, boolean, text, text) to authenticated;

-- ── Eventos: listado por sección ─────────────────────────────────────────────
drop function if exists public.tribe_events_list(text);
create or replace function public.tribe_events_list(p_country text default null, p_section text default null)
returns table (
  id uuid, title text, description text, starts_at timestamptz, location text, is_online boolean,
  city text, country text, noise text, quiet_room boolean, sensory_tips text, section text,
  creator_name text, going bigint, i_going boolean, i_reported boolean, is_past boolean
)
language sql stable security definer set search_path = public as $$
  select
    e.id, e.title, e.description, e.starts_at, e.location, e.is_online, e.city, e.country,
    e.noise, e.quiet_room, e.sensory_tips, e.section,
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
    and (p_section is null or p_section = '' or e.section is null or e.section = p_section)
  order by e.starts_at asc;
$$;
grant execute on function public.tribe_events_list(text, text) to authenticated;

-- ── Mentoría: ofrecerse como mentor con sección ──────────────────────────────
drop function if exists public.tribe_become_mentor(text[], text);
create or replace function public.tribe_become_mentor(p_tracks text[], p_bio text, p_section text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if p_section is not null and p_section <> '' and p_section not in ('neurodesarrollo','neurodivergencias','afecciones') then
    raise exception 'sección inválida';
  end if;
  insert into public.tribe_mentors (user_id, tracks, bio, is_active, section)
  values (auth.uid(), coalesce(p_tracks, '{}'), nullif(btrim(coalesce(p_bio,'')),''), true, nullif(p_section,''))
  on conflict (user_id) do update
    set tracks = excluded.tracks, bio = excluded.bio, is_active = true, section = excluded.section;
end; $$;
grant execute on function public.tribe_become_mentor(text[], text, text) to authenticated;

-- ── Mentoría: mi perfil (incluye sección) ────────────────────────────────────
drop function if exists public.tribe_my_mentor();
create or replace function public.tribe_my_mentor()
returns table (tracks text[], bio text, is_active boolean, section text)
language sql stable security definer set search_path = public as $$
  select mt.tracks, mt.bio, mt.is_active, mt.section from public.tribe_mentors mt where mt.user_id = auth.uid();
$$;
grant execute on function public.tribe_my_mentor() to authenticated;

-- ── Mentoría: directorio por sección ─────────────────────────────────────────
drop function if exists public.tribe_mentors_list(text);
create or replace function public.tribe_mentors_list(p_track text default null, p_section text default null)
returns table (user_id uuid, name text, tracks text[], bio text, section text, my_status text)
language sql stable security definer set search_path = public as $$
  select mt.user_id,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Mentor'),
         mt.tracks, mt.bio, mt.section,
         (select ms.status from public.tribe_mentorships ms where ms.mentor_id = mt.user_id and ms.mentee_id = auth.uid())
  from public.tribe_mentors mt
  join public.profiles p on p.id = mt.user_id
  where mt.is_active = true
    and public.is_tribe_active()
    and mt.user_id <> auth.uid()
    and (p_track is null or p_track = '' or p_track = any(mt.tracks))
    and (p_section is null or p_section = '' or mt.section is null or mt.section = p_section)
  order by mt.created_at desc;
$$;
grant execute on function public.tribe_mentors_list(text, text) to authenticated;
