-- 0079_advisor.sql
-- Perfil ASESOR: explorador + moderador de Tribu.
--   · Marca `profiles.is_advisor`. NO cambia el rol (parent/provider/admin siguen
--     siendo los válidos por constraint); es una capacidad extra.
--   · Puede NAVEGAR todas las secciones sin el portero de cuota (front) y usar la
--     MODERACIÓN de Tribu igual que el admin (foros, moderadores, miembros y ahora
--     mensajes), además de leer las MÉTRICAS.
--   · NO puede acciones financieras ni administrativas (cuotas, pagos, cuentas,
--     verificar/publicar perfiles, productos, distintivos, fundadores).
--   · Lo asigna el administrador desde el panel.
-- Idempotente.

-- ── A. Columna + helper ──────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_advisor boolean not null default false;

create or replace function public.is_advisor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_advisor from public.profiles where id = auth.uid()), false);
$$;
revoke all on function public.is_advisor() from public;
grant execute on function public.is_advisor() to authenticated;

-- Admin/asesor combinados: azúcar para las funciones abiertas al asesor.
create or replace function public.is_admin_or_advisor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.is_advisor();
$$;
revoke all on function public.is_admin_or_advisor() from public;
grant execute on function public.is_admin_or_advisor() to authenticated;

-- ── B. Asignación desde el panel (solo admin) ────────────────────────────────
-- Se opera por FOLIO (member_no), que es lo que ve/busca el admin en el panel.
create or replace function public.admin_set_advisor(p_member_no bigint, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  update public.profiles set is_advisor = coalesce(p_on, false) where member_no = p_member_no;
end; $$;
grant execute on function public.admin_set_advisor(bigint, boolean) to authenticated;

create or replace function public.admin_list_advisors()
returns table (user_id uuid, name text, email text, member_no bigint)
language sql stable security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'),
         u.email, p.member_no
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin() and p.is_advisor
  order by p.full_name;
$$;
grant execute on function public.admin_list_advisors() to authenticated;

-- ── C. Moderación de Tribu abierta también al asesor ─────────────────────────
-- Se recrean las funciones de 0070/0072 cambiando is_admin() → is_admin_or_advisor().
create or replace function public.admin_tribe_forums(p_status text default 'pending')
returns table (id uuid, title text, description text, theme text, country text, city text, language text, creator_name text, status text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, f.title, f.description, f.theme, f.country, f.city, f.language,
         coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'), f.status, f.created_at
  from public.tribe_forums f
  join public.profiles p on p.id = f.creator_id
  where public.is_admin_or_advisor() and (p_status is null or f.status = p_status)
  order by f.created_at desc;
$$;
grant execute on function public.admin_tribe_forums(text) to authenticated;

create or replace function public.admin_set_forum_status(p_forum uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_or_advisor() then raise exception 'no autorizado'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'estado inválido'; end if;
  update public.tribe_forums set status = p_status where id = p_forum;
  if p_status = 'approved' then
    insert into public.tribe_forum_members (forum_id, user_id)
    select p_forum, f.creator_id from public.tribe_forums f where f.id = p_forum
    on conflict do nothing;
  end if;
end; $$;
grant execute on function public.admin_set_forum_status(uuid, text) to authenticated;

create or replace function public.admin_tribe_moderators(p_status text default 'pending')
returns table (user_id uuid, name text, member_no bigint, status text, points int, justification text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select mo.user_id, coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'), p.member_no,
         mo.status, mo.points, mo.justification, mo.created_at
  from public.tribe_moderators mo
  join public.profiles p on p.id = mo.user_id
  where public.is_admin_or_advisor() and (p_status is null or mo.status = p_status)
  order by mo.created_at desc;
$$;
grant execute on function public.admin_tribe_moderators(text) to authenticated;

create or replace function public.admin_set_moderator_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_or_advisor() then raise exception 'no autorizado'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'estado inválido'; end if;
  update public.tribe_moderators set status = p_status where user_id = p_user;
end; $$;
grant execute on function public.admin_set_moderator_status(uuid, text) to authenticated;

create or replace function public.admin_set_tribe_member(
  p_user uuid, p_status text, p_can_write boolean, p_can_evaluate boolean, p_can_review boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_or_advisor() then raise exception 'no autorizado'; end if;
  if p_status is not null and p_status not in ('active','muted','suspended') then raise exception 'estado inválido'; end if;
  update public.tribe_members set
    status       = coalesce(p_status, status),
    can_write    = coalesce(p_can_write, can_write),
    can_evaluate = coalesce(p_can_evaluate, can_evaluate),
    can_review   = coalesce(p_can_review, can_review)
  where user_id = p_user;
end; $$;
grant execute on function public.admin_set_tribe_member(uuid, text, boolean, boolean, boolean) to authenticated;

drop function if exists public.admin_tribe_member_lookup(bigint);
create or replace function public.admin_tribe_member_lookup(p_member_no bigint)
returns table (user_id uuid, name text, status text, can_write boolean, can_evaluate boolean, can_review boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'),
         m.status, m.can_write, m.can_evaluate, m.can_review
  from public.tribe_members m
  join public.profiles p on p.id = m.user_id
  where public.is_admin_or_advisor() and p.member_no = p_member_no;
$$;
grant execute on function public.admin_tribe_member_lookup(bigint) to authenticated;

-- ── D. Moderación de MENSAJES de cualquier foro ──────────────────────────────
-- Lectura: admin/asesor pueden leer los mensajes de CUALQUIER foro (sin ser
-- miembros). Se recrea tribe_forum_messages (0072) añadiendo ese atajo.
drop function if exists public.tribe_forum_messages(uuid);
create or replace function public.tribe_forum_messages(p_forum uuid)
returns table (id uuid, author_id uuid, author_name text, author_energy text, author_is_mod boolean, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select
    msg.id, msg.author_id,
    coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Miembro'),
    coalesce(tm.energy, 'green'),
    public.is_tribe_moderator(msg.author_id),
    msg.body, msg.created_at
  from public.tribe_messages msg
  join public.profiles p on p.id = msg.author_id
  left join public.tribe_members tm on tm.user_id = msg.author_id
  where msg.forum_id = p_forum
    and (
      public.is_admin_or_advisor()
      or exists (select 1 from public.tribe_forum_members fm where fm.forum_id = p_forum and fm.user_id = auth.uid())
    )
  order by msg.created_at asc;
$$;
grant execute on function public.tribe_forum_messages(uuid) to authenticated;

-- Borrado de un mensaje abusivo (admin/asesor).
create or replace function public.tribe_delete_message(p_msg uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_or_advisor() then raise exception 'no autorizado'; end if;
  delete from public.tribe_messages where id = p_msg;
end; $$;
grant execute on function public.tribe_delete_message(uuid) to authenticated;

-- ── E. Anti-escalada: is_advisor solo lo fija el admin ───────────────────────
-- Se recrea protect_profile_columns (0061) añadiendo el candado de is_advisor,
-- para que un usuario NO pueda auto-otorgarse el perfil de asesor en un UPDATE de
-- su propio perfil (RLS permite editar la fila propia). Igual que role/is_verified.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_adm boolean;
begin
  select (role = 'admin') into is_adm from public.profiles where id = auth.uid();
  if coalesce(is_adm, false) = false then
    if old.rules_version_accepted is not null then
      new.role := old.role;
    end if;
    new.is_verified := old.is_verified;
    new.is_advisor  := old.is_advisor;   -- privilegio: solo admin (vía admin_set_advisor)
  end if;
  return new;
end;
$$;
