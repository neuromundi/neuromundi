-- 0073_tribe_mentorship.sql
-- Tribu Neuromundi F4 — Mentoría de pares. Dos vías: ND→ND (adultos ND que guían
-- a jóvenes ND en autodescubrimiento, universidad, vida independiente) y
-- Familia→Familia (cuidadores veteranos con familias de diagnóstico reciente).
-- Formato ASÍNCRONO (sin presión de inmediatez): hilo 1:1 de mensajes. Lecturas
-- por RPC (privacidad); escrituras por RPC/RLS. Idempotente.

create table if not exists public.tribe_mentors (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  tracks     text[] not null default '{}',   -- 'nd_youth', 'family_family'
  bio        text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tribe_mentorships (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.profiles (id) on delete cascade,
  mentee_id  uuid not null references public.profiles (id) on delete cascade,
  track      text not null,
  status     text not null default 'pending' check (status in ('pending','active','declined','ended')),
  created_at timestamptz not null default now(),
  unique (mentor_id, mentee_id)
);
create index if not exists tribe_mentorships_parties_idx on public.tribe_mentorships (mentor_id, mentee_id, status);

create table if not exists public.tribe_mentor_messages (
  id            uuid primary key default gen_random_uuid(),
  mentorship_id uuid not null references public.tribe_mentorships (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists tribe_mentor_msg_idx on public.tribe_mentor_messages (mentorship_id, created_at);

alter table public.tribe_mentors         enable row level security;
alter table public.tribe_mentorships     enable row level security;
alter table public.tribe_mentor_messages enable row level security;

drop policy if exists tribe_mentors_sel on public.tribe_mentors;
create policy tribe_mentors_sel on public.tribe_mentors
  for select using (is_active = true or user_id = auth.uid() or public.is_admin());
drop policy if exists tribe_mentorships_sel on public.tribe_mentorships;
create policy tribe_mentorships_sel on public.tribe_mentorships
  for select using (mentor_id = auth.uid() or mentee_id = auth.uid() or public.is_admin());
drop policy if exists tribe_mentor_msg_sel on public.tribe_mentor_messages;
create policy tribe_mentor_msg_sel on public.tribe_mentor_messages
  for select using (
    public.is_admin() or exists (
      select 1 from public.tribe_mentorships ms
      where ms.id = tribe_mentor_messages.mentorship_id
        and (ms.mentor_id = auth.uid() or ms.mentee_id = auth.uid())
    )
  );
-- Envío de mensajes: parte de una mentoría ACTIVA y miembro activo de la Tribu.
drop policy if exists tribe_mentor_msg_ins on public.tribe_mentor_messages;
create policy tribe_mentor_msg_ins on public.tribe_mentor_messages
  for insert with check (
    author_id = auth.uid()
    and public.is_tribe_active()
    and exists (
      select 1 from public.tribe_mentorships ms
      where ms.id = tribe_mentor_messages.mentorship_id
        and ms.status = 'active'
        and (ms.mentor_id = auth.uid() or ms.mentee_id = auth.uid())
    )
  );

-- ── RPCs ────────────────────────────────────────────────────────────────────
create or replace function public.tribe_become_mentor(p_tracks text[], p_bio text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  insert into public.tribe_mentors (user_id, tracks, bio, is_active)
  values (auth.uid(), coalesce(p_tracks, '{}'), nullif(btrim(coalesce(p_bio,'')),''), true)
  on conflict (user_id) do update
    set tracks = excluded.tracks, bio = excluded.bio, is_active = true;
end; $$;
grant execute on function public.tribe_become_mentor(text[], text) to authenticated;

create or replace function public.tribe_set_mentor_active(p_active boolean)
returns void language sql security definer set search_path = public as $$
  update public.tribe_mentors set is_active = coalesce(p_active, false) where user_id = auth.uid();
$$;
grant execute on function public.tribe_set_mentor_active(boolean) to authenticated;

drop function if exists public.tribe_my_mentor();
create or replace function public.tribe_my_mentor()
returns table (tracks text[], bio text, is_active boolean)
language sql stable security definer set search_path = public as $$
  select mt.tracks, mt.bio, mt.is_active from public.tribe_mentors mt where mt.user_id = auth.uid();
$$;
grant execute on function public.tribe_my_mentor() to authenticated;

-- Directorio de mentores activos por vía, con mi estado de solicitud.
drop function if exists public.tribe_mentors_list(text);
create or replace function public.tribe_mentors_list(p_track text default null)
returns table (user_id uuid, name text, tracks text[], bio text, my_status text)
language sql stable security definer set search_path = public as $$
  select mt.user_id,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Mentor'),
         mt.tracks, mt.bio,
         (select ms.status from public.tribe_mentorships ms where ms.mentor_id = mt.user_id and ms.mentee_id = auth.uid())
  from public.tribe_mentors mt
  join public.profiles p on p.id = mt.user_id
  where mt.is_active = true
    and public.is_tribe_active()
    and mt.user_id <> auth.uid()
    and (p_track is null or p_track = '' or p_track = any(mt.tracks))
  order by mt.created_at desc;
$$;
grant execute on function public.tribe_mentors_list(text) to authenticated;

-- Solicitar mentoría a un mentor en una vía.
create or replace function public.tribe_request_mentor(p_mentor uuid, p_track text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if auth.uid() = p_mentor then raise exception 'no puedes ser tu propio mentor'; end if;
  if not exists (select 1 from public.tribe_mentors mt where mt.user_id = p_mentor and mt.is_active and p_track = any(mt.tracks)) then
    raise exception 'mentor no disponible en esa vía';
  end if;
  insert into public.tribe_mentorships (mentor_id, mentee_id, track, status)
  values (p_mentor, auth.uid(), p_track, 'pending')
  on conflict (mentor_id, mentee_id) do update
    set status = case when public.tribe_mentorships.status = 'active' then 'active' else 'pending' end,
        track = excluded.track;
end; $$;
grant execute on function public.tribe_request_mentor(uuid, text) to authenticated;

-- El mentor acepta o rechaza una solicitud.
create or replace function public.tribe_respond_mentorship(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.tribe_mentorships
     set status = case when p_accept then 'active' else 'declined' end
   where id = p_id and mentor_id = auth.uid() and status = 'pending';
  if not found then raise exception 'solicitud no encontrada'; end if;
end; $$;
grant execute on function public.tribe_respond_mentorship(uuid, boolean) to authenticated;

-- Mis mentorías (como mentor o aprendiz), con la contraparte y el rol.
drop function if exists public.tribe_my_mentorships();
create or replace function public.tribe_my_mentorships()
returns table (id uuid, role text, counterpart_name text, track text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select ms.id,
         case when ms.mentor_id = auth.uid() then 'mentor' else 'mentee' end,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Miembro'),
         ms.track, ms.status, ms.created_at
  from public.tribe_mentorships ms
  join public.profiles p on p.id = case when ms.mentor_id = auth.uid() then ms.mentee_id else ms.mentor_id end
  where ms.mentor_id = auth.uid() or ms.mentee_id = auth.uid()
  order by ms.created_at desc;
$$;
grant execute on function public.tribe_my_mentorships() to authenticated;

-- Mensajes de una mentoría (si soy parte).
drop function if exists public.tribe_mentor_messages_list(uuid);
create or replace function public.tribe_mentor_messages_list(p_mentorship uuid)
returns table (id uuid, author_id uuid, author_name text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select msg.id, msg.author_id,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Miembro'),
         msg.body, msg.created_at
  from public.tribe_mentor_messages msg
  join public.profiles p on p.id = msg.author_id
  where msg.mentorship_id = p_mentorship
    and exists (select 1 from public.tribe_mentorships ms where ms.id = p_mentorship and (ms.mentor_id = auth.uid() or ms.mentee_id = auth.uid()))
  order by msg.created_at asc;
$$;
grant execute on function public.tribe_mentor_messages_list(uuid) to authenticated;
