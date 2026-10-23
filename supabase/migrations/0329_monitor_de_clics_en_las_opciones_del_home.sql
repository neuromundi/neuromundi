-- MONITOR DE CLICS EN LAS OPCIONES DEL HOME (22 oct 2026).
--
-- Mide qué opciones de la portada usa la gente: cada clic en una opción con
-- `data-home-track` (o en el selector de país) registra una fila. Sirve para
-- saber qué llama la atención en el home y desde qué país, dato que hoy no
-- existe en la plataforma (Google manda ~13 clics en total; esto es telemetría
-- propia, sin cookies ni terceros).
--
-- A diferencia de `profile_events` (0051), aquí NO se deduplica: un clic es una
-- acción intencional y repetirla es informacion real. El selector de país
-- (countryStore) aporta la dimensión `country`.
create table if not exists public.home_events (
  id         uuid primary key default gen_random_uuid(),
  option     text not null,
  country    text,
  user_id    uuid references public.profiles(id) on delete set null,
  day        date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_home_events_option  on public.home_events (option, created_at);
create index if not exists idx_home_events_country on public.home_events (country);
create index if not exists idx_home_events_day     on public.home_events (day);

alter table public.home_events enable row level security;

-- Es una bitácora de telemetría: solo el admin la lee desde el cliente. Las
-- altas entran por la RPC `security definer` de abajo, no por insert directo.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'home_events'
       and policyname = 'home_events_admin_lee'
  ) then
    create policy home_events_admin_lee on public.home_events
      for select using (public.is_admin());
  end if;
end $$;

-- Regla 0 del proyecto: GRANT explícito en la misma migración que crea la
-- tabla. anon/authenticated NO reciben insert directo: escriben por la RPC.
grant select on public.home_events to authenticated;
grant select, insert, update, delete on public.home_events to service_role;

-- Registra un clic. Validación laxa (basta que llegue una opción no vacía);
-- el nombre de opción se recorta a 80 chars por si llega algo largo.
create or replace function public.track_home_event(p_option text, p_country text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_option text := nullif(btrim(coalesce(p_option, '')), '');
begin
  if v_option is null then
    return;
  end if;
  insert into public.home_events (option, country, user_id)
  values (left(v_option, 80), nullif(btrim(coalesce(p_country, '')), ''), auth.uid());
end $$;

revoke all on function public.track_home_event(text, text) from public;
grant execute on function public.track_home_event(text, text) to anon, authenticated;

-- Reporte para el panel: ranking por opción (total + últimos 30 días),
-- desglose por país y tendencia diaria de 30 días. Un solo JSON.
create or replace function public.admin_home_clicks()
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result json;
begin
  if not public.is_admin() then
    raise exception 'no autorizado';
  end if;
  select json_build_object(
    'by_option', coalesce((
      select json_agg(x) from (
        select e.option,
               count(*) as total,
               count(*) filter (where e.created_at > now() - interval '30 days') as total_30d
          from public.home_events e
         group by e.option
         order by count(*) desc
      ) x), '[]'::json),
    'by_country', coalesce((
      select json_agg(x) from (
        select coalesce(e.country, 'sin país') as country, count(*) as total
          from public.home_events e
         group by coalesce(e.country, 'sin país')
         order by count(*) desc
      ) x), '[]'::json),
    'trend_30d', coalesce((
      select json_agg(x) from (
        select e.day, count(*) as total
          from public.home_events e
         where e.day > current_date - 30
         group by e.day
         order by e.day
      ) x), '[]'::json),
    'total',     (select count(*) from public.home_events),
    'total_30d', (select count(*) from public.home_events where created_at > now() - interval '30 days')
  ) into result;
  return result;
end $$;

revoke all on function public.admin_home_clicks() from public;
grant execute on function public.admin_home_clicks() to authenticated;
