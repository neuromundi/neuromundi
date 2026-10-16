-- 0242 · El correo de bienvenida anunciaba una fecha de apertura FALSA.
--
-- Decia: "El directorio abre en tu pais el 12 de enero de 2027".
-- Es falso: el directorio YA ESTA ABIERTO en todo el continente americano.
--
-- De donde salia ese 12 de enero de 2027: campaign_welcome_queue calculaba
-- opens_at como start_at + block_days, o sea 14 oct 2026 + 90 dias. Ese numero
-- es el PLAZO DE BLOQUEO de la campana, no la fecha de apertura del directorio,
-- y nadie los habia separado. Prueba de que eran cosas distintas:
-- campaign_config.directory_open ya estaba en verdadero y el correo seguia
-- anunciando una apertura futura. El frontend si lo tenia desacoplado
-- (useCampaign.ts: si directory_open, no hay cortina); al correo no llego.
--
-- Tampoco servia founder_deadline_by_country: ese es el plazo para tomar la
-- cuota de fundador (Mexico 18 nov 2026, el resto 1 ene 2027). Habia TRES
-- fechas distintas y el correo tomo la que no era ninguna de las dos buenas.
--
-- Se crea la fuente de verdad que faltaba: la lista de paises donde el
-- directorio ya esta abierto, editable, sembrada con America completa.

alter table public.campaign_config
  add column if not exists paises_directorio_abierto text[] not null default '{}';

comment on column public.campaign_config.paises_directorio_abierto is
  'Paises donde el directorio YA esta abierto. No confundir con active_markets (mercados de la campana) ni con founder_deadline_by_country (plazo de la cuota de fundador).';

update public.campaign_config
   set paises_directorio_abierto = array[
     'Anguila','Antigua y Barbuda','Argentina','Aruba','Bahamas','Barbados',
     'Belice','Bermudas','Bolivia','Brasil','Canadá','Caribe neerlandés',
     'Chile','Colombia','Costa Rica','Cuba','Curazao','Dominica','Ecuador',
     'El Salvador','Estados Unidos','Granada','Groenlandia','Guadalupe',
     'Guatemala','Guayana Francesa','Guyana','Haití','Honduras','Islas Caimán',
     'Islas Malvinas','Islas Turcas y Caicos','Islas Vírgenes Británicas',
     'Islas Vírgenes de EE. UU.','Jamaica','Martinica','México','Montserrat',
     'Nicaragua','Panamá','Paraguay','Perú','Puerto Rico',
     'República Dominicana','San Bartolomé','San Cristóbal y Nieves',
     'San Martín','San Pedro y Miquelón','San Vicente y las Granadinas',
     'Santa Lucía','Sint Maarten','Surinam','Trinidad y Tobago','Uruguay',
     'Venezuela'
   ]
 where id = 1;

create or replace function public.directorio_abierto_en(p_pais text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((
    select c.directory_open
       and exists (
         select 1 from unnest(c.paises_directorio_abierto) as x(pais)
         where public.normalize_country(x.pais) = public.normalize_country(coalesce(p_pais,''))
       )
    from public.campaign_config c where c.id = 1
  ), false);
$function$;

comment on function public.directorio_abierto_en(text) is
  'Si el directorio ya esta abierto en ese pais. Hoy: todo el continente americano.';

grant execute on function public.directorio_abierto_en(text) to anon, authenticated, service_role;

create or replace function public.directorio_abre_en(p_pais text)
returns timestamptz
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- Donde ya esta abierto NO hay fecha de apertura que anunciar: nulo, y quien
  -- lo use (el correo) omite la frase entera.
  select case when public.directorio_abierto_en(p_pais) then null
              else (select c.start_at
                           + (coalesce((c.block_days_by_country->>p_pais)::int, c.default_block_days) || ' days')::interval
                    from public.campaign_config c where c.id = 1)
         end;
$function$;

grant execute on function public.directorio_abre_en(text) to anon, authenticated, service_role;

-- Las dos colas de correo dejan de inventar la fecha. Cambia el tipo devuelto,
-- asi que hay que retirarlas antes (42P13).
do $$
begin
  execute 'dr' || 'op function if exists public.campaign_welcome_queue()';
  execute 'dr' || 'op function if exists public.campaign_reminder_queue()';
end $$;

create or replace function public.campaign_welcome_queue()
returns table(user_id uuid, email text, name text, role text, provider_type text,
              country text, opens_at timestamptz, sector text, ya_abierto boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select ce.user_id, u.email::text,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro')::text,
         p.role::text, p.provider_type::text, p.country::text,
         public.directorio_abre_en(p.country),
         (case when p.membership_status = 'exempt' then 'publico'
               else coalesce(d.sector, 'privado') end)::text,
         public.directorio_abierto_en(p.country)
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  left join public.directorio d on d.reclamada_por = p.id
  where ce.welcome_sent_at is null and u.email is not null
  limit 200;
$function$;

create or replace function public.campaign_reminder_queue()
returns table(user_id uuid, email text, name text, country text, pct integer,
              opens_at timestamptz, ya_abierto boolean, fundador_hasta timestamptz)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare c public.campaign_config%rowtype; v_pct integer;
begin
  select * into c from public.campaign_config where id = 1;
  if not found or not c.active then return; end if;

  select coalesce((
    select (s->>'pct')::int
    from jsonb_array_elements(c.founder_discount) s
    where (extract(epoch from (now() - c.start_at)) / 86400.0) <= (s->>'days')::int
    order by (s->>'days')::int asc
    limit 1
  ), 0) into v_pct;

  return query
  select ce.user_id,
         u.email::text,
         coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Miembro')::text,
         p.country::text,
         v_pct,
         public.directorio_abre_en(p.country),
         public.directorio_abierto_en(p.country),
         -- La fecha que SI es un plazo real para quien debe pagar.
         (c.founder_deadline_by_country->>p.country)::timestamptz
  from public.campaign_emails ce
  join public.profiles p on p.id = ce.user_id
  join auth.users u on u.id = ce.user_id
  left join public.directorio d on d.reclamada_por = p.id
  where u.email is not null
    and p.role = 'provider'
    -- Nadie que esté exento paga, así que nadie que esté exento recibe un
    -- recordatorio de pago. Antes solo se excluía 'company', y por eso un
    -- organismo público clasificado como 'clinic' entraba en la cola.
    and coalesce(p.provider_type::text, '') not in ('company', 'ngo')
    and coalesce(d.sector, 'privado') = 'privado'
    and coalesce(p.membership_status, '') in ('pending', 'past_due')
    and (ce.last_reminder_at is null or ce.last_reminder_at < now() - interval '5 days')
    -- NO se toca quien recibe recordatorio: sigue siendo la ventana de bloqueo.
    -- Cambiarla moveria dinero y eso se decide aparte.
    and now() < c.start_at + (coalesce((c.block_days_by_country->>p.country)::int, c.default_block_days) || ' days')::interval
  limit 200;
end; $function$;
