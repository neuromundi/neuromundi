-- 0222 — Los tres asuntos menores de la auditoria. Menores en impacto, no en
-- descuido: los tres dejan salir datos a quien no tiene cuenta.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. El padron de fundadores era legible por cualquiera
--
-- La politica de lectura era literalmente `true` y la tabla esta concedida a
-- anon: un GET anonimo devolvia el padron entero con el identificador de cada
-- fundador, su tipo, su pais y su fecha de gracia. El muro de fundadores es
-- publico a proposito, pero el muro son los PERFILES PUBLICADOS, no la lista
-- interna de quien tomo cada lugar.
--
-- Queda legible: el propio renglon, los de perfiles ya publicados (que es lo
-- que alimenta el muro y los distintivos), y todo para el administrador.
drop policy if exists founder_members_lectura on public.founder_members;
drop policy if exists founder_members_select on public.founder_members;
create policy founder_members_lectura on public.founder_members
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.profiles p
                where p.id = founder_members.user_id and p.is_published)
  );

-- El contador de lugares restantes necesita ver TODO el padron, y la pantalla
-- lo consultaba contando filas directamente — con la politica de arriba ya no
-- podria. Se expone como funcion, que cuenta sin revelar quien es quien.
create or replace function public.founder_cupo_usado(p_country text, p_kind text)
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  select count(*)::int
  from public.founder_members fm
  join public.profiles p on p.id = fm.user_id
  where fm.kind = p_kind
    and coalesce(p.is_internal, false) = false
    and p.country = p_country;
$fn$;
grant execute on function public.founder_cupo_usado(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Cualquiera podia inyectar eventos en la analitica
--
-- La politica de insercion era `true` para el rol public: sin cuenta, sin
-- limite y sin relacion con nadie. Quien quisiera podia envenenar las
-- metricas con las que se toman decisiones. Ahora cada evento queda atado a
-- quien lo manda: o es anonimo de verdad (user_id nulo) o es el suyo propio.
drop policy if exists analytics_insert on public.analytics_events;
drop policy if exists analytics_events_insert on public.analytics_events;
create policy analytics_events_insert on public.analytics_events
  for insert with check (user_id is null or user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Enumeracion de proveedores por numero de miembro
--
-- booking_provider_name(p_member_no) es anon y member_no es secuencial: con un
-- bucle de 1 a N se obtenia el nombre o la razon social de TODOS los
-- proveedores, publicados o no. Sirve para la pantalla de reserva, que solo
-- necesita los publicados.
create or replace function public.booking_provider_name(p_member_no bigint)
returns text
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(business_name, full_name)
  from public.profiles
  where member_no = p_member_no
    and role = 'provider'
    and is_published;
$fn$;
