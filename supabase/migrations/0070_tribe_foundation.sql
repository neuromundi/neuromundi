-- 0070_tribe_foundation.sql
-- Tribu Neuromundi — Fundación (F1). Inclusión social: pertenencia, participación
-- y autonomía. Miembros (pacientes, padres/tutores, especialistas) se inscriben
-- aceptando las reglas y eligen su "semáforo de energía". Clubes/foros temáticos
-- que cada quien crea (quedan PENDIENTES hasta que el admin los aprueba), con
-- unión, invitaciones y chat básico. Búsqueda por país/idioma/ciudad/tema.
--
-- Lecturas por RPC SECURITY DEFINER (respetan privacidad y simplifican RLS);
-- escrituras por RLS. Idempotente.

-- ── Tablas ──────────────────────────────────────────────────────────────────
create table if not exists public.tribe_members (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  status           text not null default 'active' check (status in ('active','muted','suspended')),
  energy           text not null default 'green' check (energy in ('green','yellow','red')),
  show_country     boolean not null default true,
  show_city        boolean not null default true,
  show_interests   boolean not null default true,
  show_diagnosis   boolean not null default false,
  rules_accepted_at timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists public.tribe_forums (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  description text,
  theme       text,
  country     text,
  city        text,
  language    text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);
create index if not exists tribe_forums_status_idx on public.tribe_forums (status, country, language);

create table if not exists public.tribe_forum_members (
  forum_id  uuid not null references public.tribe_forums (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (forum_id, user_id)
);

create table if not exists public.tribe_forum_invites (
  id         uuid primary key default gen_random_uuid(),
  forum_id   uuid not null references public.tribe_forums (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (forum_id, invitee_id)
);

create table if not exists public.tribe_messages (
  id         uuid primary key default gen_random_uuid(),
  forum_id   uuid not null references public.tribe_forums (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists tribe_messages_forum_idx on public.tribe_messages (forum_id, created_at);

alter table public.tribe_members       enable row level security;
alter table public.tribe_forums        enable row level security;
alter table public.tribe_forum_members enable row level security;
alter table public.tribe_forum_invites enable row level security;
alter table public.tribe_messages      enable row level security;

-- ── Helper: ¿miembro activo de la Tribu? ────────────────────────────────────
create or replace function public.is_tribe_active(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tribe_members m where m.user_id = p_uid and m.status = 'active');
$$;
grant execute on function public.is_tribe_active(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- tribe_members: cada quien ve/gestiona lo suyo; el admin todo (suspensiones F3).
drop policy if exists tribe_members_own on public.tribe_members;
create policy tribe_members_own on public.tribe_members
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- tribe_forums: aprobados visibles para miembros activos; el creador ve los suyos;
-- inserta cualquier miembro activo (queda 'pending'); el admin modera.
drop policy if exists tribe_forums_select on public.tribe_forums;
create policy tribe_forums_select on public.tribe_forums
  for select using (
    (status = 'approved' and public.is_tribe_active())
    or creator_id = auth.uid()
    or public.is_admin()
  );
drop policy if exists tribe_forums_insert on public.tribe_forums;
create policy tribe_forums_insert on public.tribe_forums
  for insert with check (creator_id = auth.uid() and public.is_tribe_active() and status = 'pending');
drop policy if exists tribe_forums_update on public.tribe_forums;
create policy tribe_forums_update on public.tribe_forums
  for update using (public.is_admin()) with check (public.is_admin());

-- tribe_forum_members: te unes tú a un foro aprobado; ves tus membresías.
drop policy if exists tribe_fm_select on public.tribe_forum_members;
create policy tribe_fm_select on public.tribe_forum_members
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists tribe_fm_insert on public.tribe_forum_members;
create policy tribe_fm_insert on public.tribe_forum_members
  for insert with check (
    user_id = auth.uid() and public.is_tribe_active()
    and exists (select 1 from public.tribe_forums f where f.id = forum_id and f.status = 'approved')
  );
drop policy if exists tribe_fm_delete on public.tribe_forum_members;
create policy tribe_fm_delete on public.tribe_forum_members
  for delete using (user_id = auth.uid());

-- tribe_forum_invites: invita un miembro; ve/gestiona quien invita y quien recibe.
drop policy if exists tribe_inv_select on public.tribe_forum_invites;
create policy tribe_inv_select on public.tribe_forum_invites
  for select using (inviter_id = auth.uid() or invitee_id = auth.uid() or public.is_admin());
drop policy if exists tribe_inv_insert on public.tribe_forum_invites;
create policy tribe_inv_insert on public.tribe_forum_invites
  for insert with check (inviter_id = auth.uid() and public.is_tribe_active());
drop policy if exists tribe_inv_update on public.tribe_forum_invites;
create policy tribe_inv_update on public.tribe_forum_invites
  for update using (invitee_id = auth.uid()) with check (invitee_id = auth.uid());

-- tribe_messages: leen/escriben los miembros del foro (foro aprobado). Sin editar.
drop policy if exists tribe_msg_select on public.tribe_messages;
create policy tribe_msg_select on public.tribe_messages
  for select using (
    public.is_admin() or exists (
      select 1 from public.tribe_forum_members fm
      where fm.forum_id = tribe_messages.forum_id and fm.user_id = auth.uid()
    )
  );
drop policy if exists tribe_msg_insert on public.tribe_messages;
create policy tribe_msg_insert on public.tribe_messages
  for insert with check (
    author_id = auth.uid()
    and public.is_tribe_active()
    and exists (
      select 1 from public.tribe_members m where m.user_id = auth.uid() and m.status = 'active'
    )
    and exists (
      select 1 from public.tribe_forum_members fm
      where fm.forum_id = tribe_messages.forum_id and fm.user_id = auth.uid()
    )
  );

-- ── Lecturas por RPC (privacidad + conveniencia) ────────────────────────────
-- Foros aprobados con filtros; incluye nº de miembros y si YO ya soy miembro.
drop function if exists public.tribe_forums_list(text, text, text, text);
create or replace function public.tribe_forums_list(
  p_query text default null, p_country text default null,
  p_language text default null, p_theme text default null
)
returns table (
  id uuid, title text, description text, theme text, country text, city text,
  language text, members bigint, i_member boolean, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    f.id, f.title, f.description, f.theme, f.country, f.city, f.language,
    (select count(*) from public.tribe_forum_members fm where fm.forum_id = f.id),
    exists (select 1 from public.tribe_forum_members fm where fm.forum_id = f.id and fm.user_id = auth.uid()),
    f.created_at
  from public.tribe_forums f
  where f.status = 'approved'
    and public.is_tribe_active()
    and (p_country  is null or p_country  = '' or f.country  = p_country)
    and (p_language is null or p_language = '' or f.language = p_language)
    and (p_theme    is null or p_theme    = '' or f.theme    = p_theme)
    and (p_query    is null or p_query    = '' or f.title ilike '%'||p_query||'%' or f.description ilike '%'||p_query||'%')
  order by f.created_at desc;
$$;
grant execute on function public.tribe_forums_list(text, text, text, text) to authenticated;

-- Mensajes de un foro (si soy miembro), con nombre y energía del autor.
drop function if exists public.tribe_forum_messages(uuid);
create or replace function public.tribe_forum_messages(p_forum uuid)
returns table (id uuid, author_id uuid, author_name text, author_energy text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select
    msg.id, msg.author_id,
    coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Miembro'),
    coalesce(tm.energy, 'green'),
    msg.body, msg.created_at
  from public.tribe_messages msg
  join public.profiles p on p.id = msg.author_id
  left join public.tribe_members tm on tm.user_id = msg.author_id
  where msg.forum_id = p_forum
    and exists (select 1 from public.tribe_forum_members fm where fm.forum_id = p_forum and fm.user_id = auth.uid())
  order by msg.created_at asc;
$$;
grant execute on function public.tribe_forum_messages(uuid) to authenticated;

-- Invitar a un miembro por folio (member_no). Crea la invitación pendiente.
create or replace function public.tribe_invite(p_forum uuid, p_member_no bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid;
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if not exists (select 1 from public.tribe_forums f where f.id = p_forum and f.status = 'approved') then
    raise exception 'foro no disponible';
  end if;
  select id into v_uid from public.profiles where member_no = p_member_no;
  if v_uid is null then raise exception 'folio no encontrado'; end if;
  insert into public.tribe_forum_invites (forum_id, inviter_id, invitee_id)
  values (p_forum, auth.uid(), v_uid)
  on conflict (forum_id, invitee_id) do nothing;
end; $$;
grant execute on function public.tribe_invite(uuid, bigint) to authenticated;

-- Mis invitaciones pendientes (con datos del foro).
drop function if exists public.tribe_my_invites();
create or replace function public.tribe_my_invites()
returns table (id uuid, forum_id uuid, forum_title text, inviter_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, i.forum_id, f.title,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Miembro'), i.created_at
  from public.tribe_forum_invites i
  join public.tribe_forums f on f.id = i.forum_id
  join public.profiles p on p.id = i.inviter_id
  where i.invitee_id = auth.uid() and i.status = 'pending'
  order by i.created_at desc;
$$;
grant execute on function public.tribe_my_invites() to authenticated;

-- Responder invitación: aceptar (une al foro) o rechazar.
create or replace function public.tribe_respond_invite(p_invite uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_forum uuid;
begin
  select forum_id into v_forum from public.tribe_forum_invites
   where id = p_invite and invitee_id = auth.uid() and status = 'pending';
  if v_forum is null then raise exception 'invitación no encontrada'; end if;
  update public.tribe_forum_invites set status = case when p_accept then 'accepted' else 'declined' end
   where id = p_invite;
  if p_accept and public.is_tribe_active() then
    insert into public.tribe_forum_members (forum_id, user_id) values (v_forum, auth.uid())
    on conflict do nothing;
  end if;
end; $$;
grant execute on function public.tribe_respond_invite(uuid, boolean) to authenticated;

-- ── Admin: moderación de foros ──────────────────────────────────────────────
drop function if exists public.admin_tribe_forums(text);
create or replace function public.admin_tribe_forums(p_status text default 'pending')
returns table (id uuid, title text, description text, theme text, country text, city text, language text, creator_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, f.title, f.description, f.theme, f.country, f.city, f.language,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'), f.status, f.created_at
  from public.tribe_forums f
  join public.profiles p on p.id = f.creator_id
  where public.is_admin() and (p_status is null or f.status = p_status)
  order by f.created_at desc;
$$;
grant execute on function public.admin_tribe_forums(text) to authenticated;

create or replace function public.admin_set_forum_status(p_forum uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'estado inválido'; end if;
  update public.tribe_forums set status = p_status where id = p_forum;
  -- Al aprobar, el creador queda inscrito automáticamente en su foro.
  if p_status = 'approved' then
    insert into public.tribe_forum_members (forum_id, user_id)
    select p_forum, f.creator_id from public.tribe_forums f where f.id = p_forum
    on conflict do nothing;
  end if;
end; $$;
grant execute on function public.admin_set_forum_status(uuid, text) to authenticated;
