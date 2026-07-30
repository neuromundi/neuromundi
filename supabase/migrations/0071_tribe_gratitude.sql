-- 0071_tribe_gratitude.sql
-- Tribu Neuromundi F2 — "Reconocimiento y Gratitud de Tribu": nunca puntajes
-- negativos, sin rankings públicos de popularidad, insignias de gratitud entre
-- pares con topes diarios y salvaguardas anti-camarillas. Los puntos suben de
-- nivel (Semilla→Raíz). El historial de quién dio a quién es PRIVADO (auditoría).
--
-- Salvaguardas (spec): presupuesto diario de fichas (5, no acumulables),
-- enfriamiento de par 24h, decaimiento por repetición (100%/50%/0%), antigüedad
-- mínima de 48h para poder OTORGAR, opción de agradecimiento anónimo, formato
-- cerrado (insignia con mensaje preseteado, sin texto libre). Idempotente.

alter table public.tribe_members
  add column if not exists points      int     not null default 0,
  add column if not exists silent_mode boolean not null default false;

create table if not exists public.tribe_gratitude (
  id           uuid primary key default gen_random_uuid(),
  giver_id     uuid not null references public.profiles (id) on delete cascade,
  receiver_id  uuid not null references public.profiles (id) on delete cascade,
  badge_key    text not null,
  points       int  not null default 0,
  forum_id     uuid references public.tribe_forums (id) on delete set null,
  is_anonymous boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists tribe_gratitude_receiver_idx on public.tribe_gratitude (receiver_id, badge_key);
create index if not exists tribe_gratitude_giver_idx on public.tribe_gratitude (giver_id, created_at);

alter table public.tribe_gratitude enable row level security;
-- Historial PRIVADO: solo lo ven quien dio, quien recibió, o el admin (auditoría).
drop policy if exists tribe_grat_select on public.tribe_gratitude;
create policy tribe_grat_select on public.tribe_gratitude
  for select using (giver_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());
-- Escritura solo por la RPC SECURITY DEFINER (sin políticas de insert/update).

-- Puntos base por insignia (formato cerrado y validado en servidor).
create or replace function public.tribe_badge_points(p_badge text)
returns int language sql immutable set search_path = public as $$
  select case p_badge
    when 'claridad_literal'       then 5
    when 'infodump_oro'           then 10
    when 'espacio_seguro'         then 10
    when 'faro_sensorial'         then 10
    when 'anticipacion_impecable' then 15
    when 'puente_empatia'         then 15
    when 'bienvenida_calida'      then 20
    else 0
  end;
$$;

-- Fichas de gratitud restantes hoy (presupuesto diario, no acumulable).
create or replace function public.tribe_tokens_left()
returns int language sql stable security definer set search_path = public as $$
  select greatest(0, 5 - (
    select count(*)::int from public.tribe_gratitude g
    where g.giver_id = auth.uid() and g.created_at >= date_trunc('day', now())
  ));
$$;
grant execute on function public.tribe_tokens_left() to authenticated;

-- Otorgar gratitud (con todas las salvaguardas). Devuelve fichas restantes.
create or replace function public.tribe_give_gratitude(
  p_receiver uuid, p_badge text, p_forum uuid default null, p_anonymous boolean default false
)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_giver uuid := auth.uid();
  v_base  int;
  v_used  int;
  v_recent int;
  v_factor numeric;
  v_eff   int;
begin
  if v_giver is null then raise exception 'no autenticado'; end if;
  if not public.is_tribe_active() then raise exception 'no eres miembro activo'; end if;
  if v_giver = p_receiver then raise exception 'no puedes agradecerte a ti'; end if;
  if not exists (select 1 from public.tribe_members m where m.user_id = p_receiver) then
    raise exception 'el destinatario no es miembro';
  end if;
  -- Antigüedad: 48h para poder OTORGAR (bloquea granjas de cuentas).
  if not exists (
    select 1 from public.tribe_members m
    where m.user_id = v_giver and m.created_at <= now() - interval '48 hours'
  ) then raise exception 'necesitas 48h de antigüedad para otorgar gratitud'; end if;

  v_base := public.tribe_badge_points(p_badge);
  if v_base = 0 then raise exception 'insignia inválida'; end if;

  -- Presupuesto diario (5 fichas).
  select count(*) into v_used from public.tribe_gratitude g
   where g.giver_id = v_giver and g.created_at >= date_trunc('day', now());
  if v_used >= 5 then raise exception 'sin fichas de gratitud hoy'; end if;

  -- Enfriamiento de par: 1 insignia al mismo miembro por 24h.
  if exists (
    select 1 from public.tribe_gratitude g
    where g.giver_id = v_giver and g.receiver_id = p_receiver and g.created_at >= now() - interval '24 hours'
  ) then raise exception 'ya agradeciste a esta persona hoy'; end if;

  -- Decaimiento por repetición en 72h: 0→100%, 1→50%, 2+→0% (solo valor simbólico).
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

-- Modo silencioso: oculta niveles/puntos visualmente sin perder acceso.
create or replace function public.tribe_set_silent(p_silent boolean)
returns void language sql security definer set search_path = public as $$
  update public.tribe_members set silent_mode = coalesce(p_silent, false) where user_id = auth.uid();
$$;
grant execute on function public.tribe_set_silent(boolean) to authenticated;

-- Impacto acumulado de un miembro: cuántas veces fue reconocido por cada insignia
-- (agregado, sin exponer quién lo dio). Respeta el modo silencioso.
drop function if exists public.tribe_impact(uuid);
create or replace function public.tribe_impact(p_user uuid)
returns table (badge_key text, n bigint, points int, silent boolean)
language sql stable security definer set search_path = public as $$
  select g.badge_key, count(*)::bigint,
         (select m.points from public.tribe_members m where m.user_id = p_user),
         coalesce((select m.silent_mode from public.tribe_members m where m.user_id = p_user), false)
  from public.tribe_gratitude g
  where g.receiver_id = p_user
  group by g.badge_key
  order by count(*) desc;
$$;
grant execute on function public.tribe_impact(uuid) to authenticated;
