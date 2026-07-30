-- 0072_tribe_moderators.sql
-- Tribu Neuromundi F3 — Moderadores autopostulados (con justificación + Código de
-- Ética), aprobados por el admin, con NIVELES por puntos y RESEÑAS de los miembros
-- (empatía, lenguaje inclusivo, cordialidad, conocimiento, disponibilidad). El
-- admin puede suspender total o PARCIALMENTE (escribir / evaluar / reseñar).
-- Idempotente.

-- ── Restricciones por miembro (suspensión parcial) ──────────────────────────
alter table public.tribe_members
  add column if not exists can_write    boolean not null default true,
  add column if not exists can_evaluate boolean not null default true,
  add column if not exists can_review   boolean not null default true;

-- ── Postulaciones de moderador ──────────────────────────────────────────────
create table if not exists public.tribe_moderators (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending','approved','rejected')),
  justification     text,
  ethics_accepted_at timestamptz,
  points            int not null default 0,
  created_at        timestamptz not null default now()
);
alter table public.tribe_moderators enable row level security;
drop policy if exists tribe_mod_select on public.tribe_moderators;
create policy tribe_mod_select on public.tribe_moderators
  for select using (user_id = auth.uid() or status = 'approved' or public.is_admin());

-- ── Reseñas a moderadores ───────────────────────────────────────────────────
create table if not exists public.tribe_mod_ratings (
  id                 uuid primary key default gen_random_uuid(),
  moderator_id       uuid not null references public.profiles (id) on delete cascade,
  rater_id           uuid not null references public.profiles (id) on delete cascade,
  empathy            smallint not null check (empathy between 1 and 5),
  inclusive_language smallint not null check (inclusive_language between 1 and 5),
  cordiality         smallint not null check (cordiality between 1 and 5),
  knowledge          smallint not null check (knowledge between 1 and 5),
  availability       smallint not null check (availability between 1 and 5),
  comment            text,
  is_anonymous       boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (moderator_id, rater_id)
);
alter table public.tribe_mod_ratings enable row level security;
drop policy if exists tribe_modrate_select on public.tribe_mod_ratings;
create policy tribe_modrate_select on public.tribe_mod_ratings
  for select using (rater_id = auth.uid() or public.is_admin());

-- ¿Es moderador aprobado?
create or replace function public.is_tribe_moderator(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tribe_moderators mo where mo.user_id = p_uid and mo.status = 'approved');
$$;
grant execute on function public.is_tribe_moderator(uuid) to authenticated;

-- ── RPC: postularse a moderador (acepta el Código de Ética) ─────────────────
create or replace function public.tribe_apply_moderator(p_justification text, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if not coalesce(p_accept, false) then raise exception 'debes aceptar el código de ética'; end if;
  insert into public.tribe_moderators (user_id, status, justification, ethics_accepted_at)
  values (auth.uid(), 'pending', nullif(btrim(coalesce(p_justification,'')),''), now())
  on conflict (user_id) do update
    set status = case when public.tribe_moderators.status = 'approved' then 'approved' else 'pending' end,
        justification = excluded.justification,
        ethics_accepted_at = now();
end; $$;
grant execute on function public.tribe_apply_moderator(text, boolean) to authenticated;

-- Mi estado de moderador.
drop function if exists public.tribe_my_moderator();
create or replace function public.tribe_my_moderator()
returns table (status text, points int, justification text)
language sql stable security definer set search_path = public as $$
  select mo.status, mo.points, mo.justification
  from public.tribe_moderators mo where mo.user_id = auth.uid();
$$;
grant execute on function public.tribe_my_moderator() to authenticated;

-- Directorio de moderadores aprobados con promedio y nº de reseñas.
drop function if exists public.tribe_moderators_list();
create or replace function public.tribe_moderators_list()
returns table (user_id uuid, name text, points int, avg_rating numeric, n_ratings bigint, i_rated boolean)
language sql stable security definer set search_path = public as $$
  select
    mo.user_id,
    coalesce(nullif(p.business_name,''), nullif(p.full_name,''), 'Moderador'),
    mo.points,
    coalesce((select round(avg((r.empathy+r.inclusive_language+r.cordiality+r.knowledge+r.availability)/5.0),2)
              from public.tribe_mod_ratings r where r.moderator_id = mo.user_id), 0),
    (select count(*) from public.tribe_mod_ratings r where r.moderator_id = mo.user_id),
    exists (select 1 from public.tribe_mod_ratings r where r.moderator_id = mo.user_id and r.rater_id = auth.uid())
  from public.tribe_moderators mo
  join public.profiles p on p.id = mo.user_id
  where mo.status = 'approved' and public.is_tribe_active()
  order by mo.points desc;
$$;
grant execute on function public.tribe_moderators_list() to authenticated;

-- Perfil de un moderador: promedios por dimensión.
drop function if exists public.tribe_moderator_profile(uuid);
create or replace function public.tribe_moderator_profile(p_moderator uuid)
returns table (points int, n_ratings bigint, empathy numeric, inclusive_language numeric, cordiality numeric, knowledge numeric, availability numeric)
language sql stable security definer set search_path = public as $$
  select
    (select mo.points from public.tribe_moderators mo where mo.user_id = p_moderator),
    (select count(*) from public.tribe_mod_ratings r where r.moderator_id = p_moderator),
    coalesce((select round(avg(r.empathy),2) from public.tribe_mod_ratings r where r.moderator_id = p_moderator),0),
    coalesce((select round(avg(r.inclusive_language),2) from public.tribe_mod_ratings r where r.moderator_id = p_moderator),0),
    coalesce((select round(avg(r.cordiality),2) from public.tribe_mod_ratings r where r.moderator_id = p_moderator),0),
    coalesce((select round(avg(r.knowledge),2) from public.tribe_mod_ratings r where r.moderator_id = p_moderator),0),
    coalesce((select round(avg(r.availability),2) from public.tribe_mod_ratings r where r.moderator_id = p_moderator),0);
$$;
grant execute on function public.tribe_moderator_profile(uuid) to authenticated;

-- ── RPC: calificar a un moderador (requiere can_review) ─────────────────────
create or replace function public.tribe_rate_moderator(
  p_moderator uuid, p_empathy smallint, p_inclusive smallint, p_cordiality smallint,
  p_knowledge smallint, p_availability smallint, p_comment text default null, p_anonymous boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if not exists (select 1 from public.tribe_members m where m.user_id = auth.uid() and m.can_review) then
    raise exception 'tu posibilidad de reseñar está suspendida'; end if;
  if auth.uid() = p_moderator then raise exception 'no puedes calificarte'; end if;
  if not public.is_tribe_moderator(p_moderator) then raise exception 'no es moderador'; end if;

  insert into public.tribe_mod_ratings (moderator_id, rater_id, empathy, inclusive_language, cordiality, knowledge, availability, comment, is_anonymous)
  values (p_moderator, auth.uid(), p_empathy, p_inclusive, p_cordiality, p_knowledge, p_availability,
          nullif(btrim(coalesce(p_comment,'')),''), coalesce(p_anonymous,false))
  on conflict (moderator_id, rater_id) do update
    set empathy = excluded.empathy, inclusive_language = excluded.inclusive_language,
        cordiality = excluded.cordiality, knowledge = excluded.knowledge,
        availability = excluded.availability, comment = excluded.comment,
        is_anonymous = excluded.is_anonymous, created_at = now();

  -- Puntos del moderador = suma de los promedios (1..5) de cada reseña.
  update public.tribe_moderators set points = coalesce((
    select round(sum((r.empathy+r.inclusive_language+r.cordiality+r.knowledge+r.availability)/5.0))::int
    from public.tribe_mod_ratings r where r.moderator_id = p_moderator
  ), 0) where user_id = p_moderator;
end; $$;
grant execute on function public.tribe_rate_moderator(uuid, smallint, smallint, smallint, smallint, smallint, text, boolean) to authenticated;

-- ── Admin: moderación de postulaciones ──────────────────────────────────────
drop function if exists public.admin_tribe_moderators(text);
create or replace function public.admin_tribe_moderators(p_status text default 'pending')
returns table (user_id uuid, name text, member_no bigint, status text, points int, justification text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select mo.user_id, coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'), p.member_no,
         mo.status, mo.points, mo.justification, mo.created_at
  from public.tribe_moderators mo
  join public.profiles p on p.id = mo.user_id
  where public.is_admin() and (p_status is null or mo.status = p_status)
  order by mo.created_at desc;
$$;
grant execute on function public.admin_tribe_moderators(text) to authenticated;

create or replace function public.admin_set_moderator_status(p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'estado inválido'; end if;
  update public.tribe_moderators set status = p_status where user_id = p_user;
end; $$;
grant execute on function public.admin_set_moderator_status(uuid, text) to authenticated;

-- ── Admin: suspensión total o parcial de un miembro de la Tribu ─────────────
create or replace function public.admin_set_tribe_member(
  p_user uuid, p_status text, p_can_write boolean, p_can_evaluate boolean, p_can_review boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  if p_status is not null and p_status not in ('active','muted','suspended') then raise exception 'estado inválido'; end if;
  update public.tribe_members set
    status       = coalesce(p_status, status),
    can_write    = coalesce(p_can_write, can_write),
    can_evaluate = coalesce(p_can_evaluate, can_evaluate),
    can_review   = coalesce(p_can_review, can_review)
  where user_id = p_user;
end; $$;
grant execute on function public.admin_set_tribe_member(uuid, text, boolean, boolean, boolean) to authenticated;

-- Búsqueda de un miembro de la Tribu por folio (para el admin).
drop function if exists public.admin_tribe_member_lookup(bigint);
create or replace function public.admin_tribe_member_lookup(p_member_no bigint)
returns table (user_id uuid, name text, status text, can_write boolean, can_evaluate boolean, can_review boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(nullif(p.business_name,''), nullif(p.full_name,''), '—'),
         m.status, m.can_write, m.can_evaluate, m.can_review
  from public.tribe_members m
  join public.profiles p on p.id = m.user_id
  where public.is_admin() and p.member_no = p_member_no;
$$;
grant execute on function public.admin_tribe_member_lookup(bigint) to authenticated;

-- ── Respetar restricciones en escribir y evaluar (recrea reglas de F1/F2) ───
-- Mensajes: exige can_write además de ser miembro del foro.
drop policy if exists tribe_msg_insert on public.tribe_messages;
create policy tribe_msg_insert on public.tribe_messages
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.tribe_members m where m.user_id = auth.uid() and m.status = 'active' and m.can_write)
    and exists (select 1 from public.tribe_forum_members fm where fm.forum_id = tribe_messages.forum_id and fm.user_id = auth.uid())
  );

-- Gratitud: exige can_evaluate (recrea la función de 0071 con el candado extra).
create or replace function public.tribe_give_gratitude(
  p_receiver uuid, p_badge text, p_forum uuid default null, p_anonymous boolean default false
)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_giver uuid := auth.uid();
  v_base int; v_used int; v_recent int; v_factor numeric; v_eff int;
begin
  if v_giver is null then raise exception 'no autenticado'; end if;
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if not exists (select 1 from public.tribe_members m where m.user_id = v_giver and m.can_evaluate) then
    raise exception 'tu posibilidad de evaluar está suspendida'; end if;
  if v_giver = p_receiver then raise exception 'no puedes agradecerte a ti'; end if;
  if not exists (select 1 from public.tribe_members m where m.user_id = p_receiver) then
    raise exception 'el destinatario no es miembro'; end if;
  if not exists (select 1 from public.tribe_members m where m.user_id = v_giver and m.created_at <= now() - interval '48 hours') then
    raise exception 'necesitas 48h de antigüedad para otorgar gratitud'; end if;

  v_base := public.tribe_badge_points(p_badge);
  if v_base = 0 then raise exception 'insignia inválida'; end if;

  select count(*) into v_used from public.tribe_gratitude g
   where g.giver_id = v_giver and g.created_at >= date_trunc('day', now());
  if v_used >= 5 then raise exception 'sin fichas de gratitud hoy'; end if;

  if exists (select 1 from public.tribe_gratitude g
             where g.giver_id = v_giver and g.receiver_id = p_receiver and g.created_at >= now() - interval '24 hours') then
    raise exception 'ya agradeciste a esta persona hoy'; end if;

  select count(*) into v_recent from public.tribe_gratitude g
   where g.giver_id = v_giver and g.receiver_id = p_receiver and g.created_at >= now() - interval '72 hours';
  v_factor := case when v_recent = 0 then 1 when v_recent = 1 then 0.5 else 0 end;
  v_eff := floor(v_base * v_factor)::int;

  insert into public.tribe_gratitude (giver_id, receiver_id, badge_key, points, forum_id, is_anonymous)
  values (v_giver, p_receiver, p_badge, v_eff, p_forum, coalesce(p_anonymous, false));
  update public.tribe_members set points = points + v_eff where user_id = p_receiver;

  return public.tribe_tokens_left();
end; $$;
grant execute on function public.tribe_give_gratitude(uuid, text, uuid, boolean) to authenticated;

-- Mensajes con marca de moderador del autor (recrea la de F1 añadiendo la columna).
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
    and exists (select 1 from public.tribe_forum_members fm where fm.forum_id = p_forum and fm.user_id = auth.uid())
  order by msg.created_at asc;
$$;
grant execute on function public.tribe_forum_messages(uuid) to authenticated;
