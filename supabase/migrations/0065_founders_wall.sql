-- 0065_founders_wall.sql
-- Muro de fundadores CURADO por país.
--
-- El sistema ya detecta fundadores (founder_members, autodetección por país y
-- grupo). Aquí se añade la CURACIÓN: el admin decide cuáles se muestran en el
-- muro público (/donantes), su orden y cuáles destacar, por país. La privacidad
-- queda a salvo: solo aparece quien el admin publica explícitamente.
--
-- Idempotente: add column if not exists, create or replace, drop antes de
-- recrear cuando cambia la firma/tipo de retorno.

-- ── 1) Columnas de curación ─────────────────────────────────────────────────
alter table public.founder_members
  add column if not exists wall_published boolean not null default false,
  add column if not exists wall_featured  boolean not null default false,
  add column if not exists wall_order     int     not null default 0;

create index if not exists founder_members_wall_idx
  on public.founder_members (wall_published, country);

-- ── 2) Muro público: solo fundadores publicados ─────────────────────────────
-- Une a profiles para el nombre visible y el folio (member_no → NM-000123 en el
-- front). Filtro por país opcional (nombre canónico ES, igual que allies).
drop function if exists public.founders_wall(text);
create or replace function public.founders_wall(p_country text default null)
returns table (
  display_name text,
  member_no    bigint,
  kind         text,
  country      text,
  featured     boolean,
  is_company   boolean
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Neuromundi'),
    p.member_no,
    f.kind,
    f.country,
    f.wall_featured,
    coalesce(p.is_company, false)
  from public.founder_members f
  join public.profiles p on p.id = f.user_id
  where f.wall_published = true
    and (p_country is null or f.country = p_country)
  order by f.wall_featured desc, f.wall_order asc, p.member_no asc nulls last;
$$;
grant execute on function public.founders_wall(text) to anon, authenticated;

-- Países que ya tienen fundadores publicados (alimenta el selector del muro).
drop function if exists public.founders_wall_countries();
create or replace function public.founders_wall_countries()
returns table (country text, n bigint)
language sql stable security definer set search_path = public as $$
  select f.country, count(*)::bigint
  from public.founder_members f
  where f.wall_published = true
    and f.country is not null
    and f.country <> ''
  group by f.country
  order by f.country asc;
$$;
grant execute on function public.founders_wall_countries() to anon, authenticated;

-- ── 3) Admin: listado curable (publicados o no) ─────────────────────────────
-- Gate por is_admin() dentro del WHERE: un no-admin recibe conjunto vacío.
drop function if exists public.admin_founders(text);
create or replace function public.admin_founders(p_country text default null)
returns table (
  user_id        uuid,
  display_name   text,
  member_no      bigint,
  kind           text,
  country        text,
  wall_published boolean,
  wall_featured  boolean,
  wall_order     int
)
language sql stable security definer set search_path = public as $$
  select
    f.user_id,
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), '—'),
    p.member_no,
    f.kind,
    f.country,
    f.wall_published,
    f.wall_featured,
    f.wall_order
  from public.founder_members f
  join public.profiles p on p.id = f.user_id
  where public.is_admin()
    and (p_country is null or f.country = p_country)
  order by f.wall_featured desc, f.wall_order asc, p.member_no asc nulls last;
$$;
grant execute on function public.admin_founders(text) to authenticated;

-- ── 4) Admin: curar a un fundador (publicar/quitar, destacar, ordenar) ───────
create or replace function public.admin_set_founder_wall(
  p_user      uuid,
  p_published boolean,
  p_featured  boolean,
  p_order     int
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'solo administradores';
  end if;
  update public.founder_members f
     set wall_published = coalesce(p_published, f.wall_published),
         wall_featured  = coalesce(p_featured,  f.wall_featured),
         wall_order     = coalesce(p_order,     f.wall_order)
   where f.user_id = p_user;
end;
$$;
grant execute on function public.admin_set_founder_wall(uuid, boolean, boolean, int) to authenticated;
