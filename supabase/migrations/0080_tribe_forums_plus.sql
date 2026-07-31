-- 0080_tribe_forums_plus.sql
-- Foros de Tribu ampliados:
--   · El creador elige los PAÍSES a los que llega el aviso de creación.
--   · Al crear, el creador recibe un mensaje (queda pendiente de aprobación +
--     asignación de moderador + reglas + código de ética) → notif 'forum_pending'.
--   · Moderadores aprobados pueden POSTULARSE a moderar un foro (con o sin
--     convocatoria del admin); el admin/asesor aprueba (tribe_forum_moderators).
--   · Moderador del foro (o admin/asesor) puede CERRAR el foro en cualquier momento.
--   · Al APROBARSE el foro se avisa a la comunidad por los países elegidos,
--     respetando la preferencia de push de foros y el interés por país del miembro.
--   · Preferencias del usuario: activar/desactivar el push de foros y elegir países.
-- Idempotente. Aplicar tras 0079.

-- ── A. tribe_forums: países a notificar + estado 'closed' ─────────────────────
alter table public.tribe_forums add column if not exists notify_countries text[];
alter table public.tribe_forums drop constraint if exists tribe_forums_status_check;
alter table public.tribe_forums
  add constraint tribe_forums_status_check check (status in ('pending','approved','rejected','closed'));

-- ── B. Preferencias de push de foros por usuario ─────────────────────────────
create table if not exists public.tribe_forum_prefs (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  countries    text[],           -- NULL/vacío = todos los países
  updated_at   timestamptz not null default now()
);
alter table public.tribe_forum_prefs enable row level security;
drop policy if exists tfp_own on public.tribe_forum_prefs;
create policy tfp_own on public.tribe_forum_prefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.tribe_forum_prefs_get()
returns table (push_enabled boolean, countries text[])
language sql stable security definer set search_path = public as $$
  select coalesce((select push_enabled from public.tribe_forum_prefs where user_id = auth.uid()), true),
         (select countries from public.tribe_forum_prefs where user_id = auth.uid());
$$;
grant execute on function public.tribe_forum_prefs_get() to authenticated;

create or replace function public.tribe_forum_prefs_set(p_push boolean, p_countries text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  insert into public.tribe_forum_prefs (user_id, push_enabled, countries, updated_at)
  values (auth.uid(), coalesce(p_push, true),
          case when p_countries is null or array_length(p_countries,1) is null then null else p_countries end, now())
  on conflict (user_id) do update
    set push_enabled = excluded.push_enabled, countries = excluded.countries, updated_at = now();
end; $$;
grant execute on function public.tribe_forum_prefs_set(boolean, text[]) to authenticated;

-- ── C. Moderadores por foro (postulación + aprobación) ───────────────────────
create table if not exists public.tribe_forum_moderators (
  id         uuid primary key default gen_random_uuid(),
  forum_id   uuid not null references public.tribe_forums(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (forum_id, user_id)
);
alter table public.tribe_forum_moderators enable row level security;
drop policy if exists tfm_read on public.tribe_forum_moderators;
create policy tfm_read on public.tribe_forum_moderators for select
  using (user_id = auth.uid() or public.is_admin_or_advisor());
-- Las escrituras van SOLO por RPC (SECURITY DEFINER); sin policy de insert/update.

-- Postularse a moderar un foro (requiere ser moderador global aprobado).
create or replace function public.tribe_apply_forum_moderator(p_forum uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if not exists (select 1 from public.tribe_moderators m where m.user_id = auth.uid() and m.status = 'approved') then
    raise exception 'no eres moderador aprobado';
  end if;
  insert into public.tribe_forum_moderators (forum_id, user_id, status)
  values (p_forum, auth.uid(), 'pending')
  on conflict (forum_id, user_id) do nothing;
end; $$;
grant execute on function public.tribe_apply_forum_moderator(uuid) to authenticated;

-- Admin/asesor: postulaciones de moderador (por foro y/o estado).
create or replace function public.admin_forum_moderators(p_forum uuid default null, p_status text default null)
returns table (id uuid, forum_id uuid, forum_title text, user_id uuid, name text, member_no bigint, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select fm.id, fm.forum_id, f.title, fm.user_id,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'), p.member_no, fm.status, fm.created_at
  from public.tribe_forum_moderators fm
  join public.tribe_forums f on f.id = fm.forum_id
  join public.profiles p on p.id = fm.user_id
  where public.is_admin_or_advisor()
    and (p_forum is null or fm.forum_id = p_forum)
    and (p_status is null or fm.status = p_status)
  order by fm.created_at desc;
$$;
grant execute on function public.admin_forum_moderators(uuid, text) to authenticated;

create or replace function public.admin_set_forum_moderator(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_forum uuid; v_user uuid;
begin
  if not public.is_admin_or_advisor() then raise exception 'no autorizado'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'estado inválido'; end if;
  update public.tribe_forum_moderators set status = p_status where id = p_id
    returning forum_id, user_id into v_forum, v_user;
  if p_status = 'approved' and v_user is not null then
    insert into public.tribe_forum_members (forum_id, user_id) values (v_forum, v_user) on conflict do nothing;
    insert into public.notifications (user_id, type, title, body, data)
    values (v_user, 'forum_mod_approved', 'Moderación aprobada', '', jsonb_build_object('forum_id', v_forum));
  end if;
end; $$;
grant execute on function public.admin_set_forum_moderator(uuid, text) to authenticated;

-- ── D. Crear foro (mensaje al creador + autopostulación de moderador) ─────────
create or replace function public.tribe_create_forum(
  p_title text, p_description text, p_theme text, p_country text, p_city text,
  p_language text, p_notify_countries text[], p_apply_moderator boolean default false
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'no autenticado'; end if;
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if length(coalesce(trim(p_title), '')) < 3 then raise exception 'título muy corto'; end if;

  insert into public.tribe_forums (creator_id, title, description, theme, country, city, language, notify_countries, status)
  values (v_uid, trim(p_title), nullif(p_description, ''), nullif(p_theme, ''), nullif(p_country, ''), nullif(p_city, ''),
          nullif(p_language, ''),
          case when p_notify_countries is null or array_length(p_notify_countries, 1) is null then null else p_notify_countries end,
          'pending')
  returning id into v_id;

  -- Mensaje explicativo al creador (aprobación + moderador + reglas + ética).
  insert into public.notifications (user_id, type, title, body, data)
  values (v_uid, 'forum_pending', 'Foro en revisión', '', jsonb_build_object('forum_id', v_id, 'title', trim(p_title)));

  -- Autopostulación como moderador (solo si ya es moderador aprobado).
  if coalesce(p_apply_moderator, false)
     and exists (select 1 from public.tribe_moderators m where m.user_id = v_uid and m.status = 'approved') then
    insert into public.tribe_forum_moderators (forum_id, user_id, status)
    values (v_id, v_uid, 'pending')
    on conflict (forum_id, user_id) do nothing;
  end if;

  return v_id;
end; $$;
grant execute on function public.tribe_create_forum(text, text, text, text, text, text, text[], boolean) to authenticated;

-- ── E. Aprobación del foro + aviso a la comunidad por países ─────────────────
create or replace function public.admin_set_forum_status(p_forum uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare f public.tribe_forums%rowtype;
begin
  if not public.is_admin_or_advisor() then raise exception 'no autorizado'; end if;
  if p_status not in ('pending','approved','rejected','closed') then raise exception 'estado inválido'; end if;
  update public.tribe_forums set status = p_status where id = p_forum returning * into f;

  if p_status = 'approved' then
    -- El creador queda inscrito y recibe aviso de aprobación.
    insert into public.tribe_forum_members (forum_id, user_id) values (p_forum, f.creator_id) on conflict do nothing;
    insert into public.notifications (user_id, type, title, body, data)
    values (f.creator_id, 'forum_approved', 'Foro aprobado', '', jsonb_build_object('forum_id', f.id, 'title', f.title));

    -- Aviso a la comunidad por los países elegidos por el creador, respetando la
    -- preferencia de push de foros y el interés por país de cada miembro.
    insert into public.notifications (user_id, type, title, body, data)
    select m.user_id, 'forum_new', 'Nuevo foro en la Tribu', coalesce(f.title, ''),
           jsonb_build_object('forum_id', f.id, 'title', f.title, 'country', f.country, 'theme', f.theme)
    from public.tribe_members m
    join public.profiles p on p.id = m.user_id
    left join public.tribe_forum_prefs tp on tp.user_id = m.user_id
    where m.status = 'active'
      and m.user_id <> f.creator_id
      and coalesce(tp.push_enabled, true) = true
      and (f.notify_countries is null or array_length(f.notify_countries, 1) is null or p.country = any (f.notify_countries))
      and (tp.countries is null or array_length(tp.countries, 1) is null or f.country = any (tp.countries));
  end if;
end; $$;
grant execute on function public.admin_set_forum_status(uuid, text) to authenticated;

-- ── F. Cerrar foro (moderador aprobado del foro, o admin/asesor) ─────────────
create or replace function public.tribe_close_forum(p_forum uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if not (public.is_admin_or_advisor()
          or exists (select 1 from public.tribe_forum_moderators fm
                     where fm.forum_id = p_forum and fm.user_id = auth.uid() and fm.status = 'approved')) then
    raise exception 'no autorizado';
  end if;
  update public.tribe_forums set status = 'closed' where id = p_forum;
end; $$;
grant execute on function public.tribe_close_forum(uuid) to authenticated;

-- ¿Soy moderador APROBADO de este foro? (para mostrar el botón de cerrar)
create or replace function public.tribe_am_i_forum_moderator(p_forum uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tribe_forum_moderators fm
    where fm.forum_id = p_forum and fm.user_id = auth.uid() and fm.status = 'approved'
  );
$$;
grant execute on function public.tribe_am_i_forum_moderator(uuid) to authenticated;

-- ── G. Convocatoria de moderadores (admin/asesor) ────────────────────────────
create or replace function public.tribe_forum_call_moderators(p_forum uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if not public.is_admin_or_advisor() then raise exception 'no autorizado'; end if;
  select title into v_title from public.tribe_forums where id = p_forum;
  insert into public.notifications (user_id, type, title, body, data)
  select m.user_id, 'forum_mod_call', 'Convocatoria de moderación', coalesce(v_title, ''),
         jsonb_build_object('forum_id', p_forum, 'title', v_title)
  from public.tribe_moderators m
  where m.status = 'approved';
end; $$;
grant execute on function public.tribe_forum_call_moderators(uuid) to authenticated;

-- ── H. Clasificación de los tipos nuevos (para preferencias de push) ─────────
create or replace function public.notif_category(p_type text)
returns text
language sql immutable set search_path = public as $$
  select case
    when p_type like 'appt_%' or p_type in ('booking_request', 'waitlist_slot') then 'citas'
    when p_type in ('direct_message', 'admin_message', 'account_costo') then 'mensajes'
    when p_type in ('post_achievement', 'badge', 'waitlist_join', 'referral_use', 'referral_reward', 'directory_match', 'suspension_reminder', 'topic_job', 'topic_venue',
                    'forum_new', 'forum_pending', 'forum_approved', 'forum_mod_call', 'forum_mod_approved') then 'comunidad'
    when p_type in ('commission_paid', 'donation_thanks') then 'transacciones'
    when p_type = 'campaign' then 'campanas'
    else 'otras'
  end;
$$;
