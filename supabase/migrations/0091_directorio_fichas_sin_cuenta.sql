-- ============================================================================
-- Neuromundi · tabla de fichas del directorio sin cuenta de usuario
--
-- POR QUÉ EXISTE
--   public.profiles.id tiene llave foránea a auth.users con ON DELETE CASCADE:
--   no puede haber un perfil sin una cuenta. Para precargar establecimientos
--   que todavía no se registran habría que inventarles un correo, y no
--   queremos dato inventado en la base.
--
--   Esta tabla guarda la ficha sin cuenta. Cuando su dueño la reclama, se le
--   crea su cuenta y su perfil de verdad, y la ficha queda marcada como
--   reclamada para que no se muestre dos veces.
--
-- NO TOCA public.profiles NI auth.users.
-- ============================================================================

create table if not exists public.directorio (
  -- uuid, no texto, y por una razón concreta: el front cruza calificaciones y
  -- categorías con .in('provider_id', ids) contra columnas uuid. Un id de texto
  -- reventaría esa consulta. Con uuid, el cruce simplemente no devuelve nada
  -- para estas fichas, que es lo correcto: todavía no tienen calificaciones.
  id                uuid primary key default gen_random_uuid(),
  clee              text unique,               -- la llave del DENUE, si viene de ahí
  nombre            text not null,
  provider_type     text not null,

  estado            text,
  ciudad            text,
  direccion         text,
  colonia           text,
  cp                text,
  lat               double precision,
  lng               double precision,

  telefono          text,
  correo            text,
  sitio_web         text,
  contactabilidad   smallint not null default 0,

  especializacion   text,
  ambito            text,
  notas             text,

  -- procedencia: de dónde salió cada dato, para poder auditarlo después
  fuente            text not null default 'denue',   -- denue | curado
  fuente_url        text,
  clase_scian       text,
  fecha_verificacion date,

  -- ciclo de vida de la ficha
  estado_revision   text not null default 'borrador',  -- borrador | por_verificar | publicado
  invitada_en       timestamptz,
  reclamada_por     uuid references public.profiles(id) on delete set null,
  reclamada_en      timestamptz,
  baja_solicitada   boolean not null default false,    -- pidió que la quitáramos
  baja_motivo       text,

  creada_en         timestamptz not null default now(),
  actualizada_en    timestamptz not null default now(),

  busqueda          tsvector,

  constraint directorio_estado_revision_valido
    check (estado_revision in ('borrador','por_verificar','publicado')),
  constraint directorio_fuente_valida
    check (fuente in ('denue','curado'))
);

create index if not exists directorio_clee_idx        on public.directorio (clee);
create index if not exists directorio_estado_idx      on public.directorio (estado, ciudad);
create index if not exists directorio_tipo_idx        on public.directorio (provider_type);
create index if not exists directorio_revision_idx    on public.directorio (estado_revision);
create index if not exists directorio_reclamada_idx   on public.directorio (reclamada_por);
create index if not exists directorio_busqueda_idx    on public.directorio using gin (busqueda);
create index if not exists directorio_mapa_idx        on public.directorio (lat, lng) where lat is not null;

-- Búsqueda en español, con pesos: el nombre manda, luego dónde está.
create or replace function public.directorio_busqueda() returns trigger
language plpgsql as $$
begin
  new.busqueda :=
      setweight(to_tsvector('spanish', coalesce(new.nombre,'')), 'A')
   || setweight(to_tsvector('spanish', coalesce(new.ciudad,'') ||' '|| coalesce(new.estado,'')), 'B')
   || setweight(to_tsvector('spanish', coalesce(new.especializacion,'') ||' '|| coalesce(new.ambito,'')), 'C')
   || setweight(to_tsvector('spanish', coalesce(new.direccion,'') ||' '|| coalesce(new.colonia,'')), 'D');
  new.actualizada_en := now();
  return new;
end $$;

drop trigger if exists directorio_busqueda_trg on public.directorio;
create trigger directorio_busqueda_trg
  before insert or update on public.directorio
  for each row execute function public.directorio_busqueda();

-- ---------------------------------------------------------------------------
-- Seguridad por fila: el público solo ve fichas publicadas, no reclamadas y
-- sin baja solicitada. Una ficha reclamada desaparece de aquí porque su dueño
-- ya tiene perfil propio, y mostrarla otra vez sería duplicarla.
-- ---------------------------------------------------------------------------
alter table public.directorio enable row level security;

drop policy if exists directorio_lectura_publica on public.directorio;
create policy directorio_lectura_publica on public.directorio
  for select using (
    estado_revision = 'publicado'
    and not baja_solicitada
    and reclamada_por is null
  );

drop policy if exists directorio_admin_total on public.directorio;
create policy directorio_admin_total on public.directorio
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- La vista que consume el buscador
--
-- Une los perfiles con cuenta y las fichas sin dueño bajo los MISMOS nombres
-- de columna que el front ya usa. Así el cambio en el código es una línea:
--     from("profiles")  →  from("directorio_publico")
--
-- security_invoker: la vista respeta la seguridad por fila de cada tabla de
-- origen, no la del dueño de la vista. Sin esto, la vista sería una puerta
-- trasera a filas que la política pública oculta.
-- ---------------------------------------------------------------------------
create or replace view public.directorio_publico
with (security_invoker = on) as
  select
    p.id, 'perfil'::text as origen, null::text as clee,
    p.full_name, p.business_name, p.provider_type, p.role, p.is_published,
    p.country, p.state, p.city, p.municipality, p.address,
    p.latitude, p.longitude, p.phone, p.website, p.website_url,
    p.services_offered, p.neuro_conditions, p.avatar_url,
    p.is_verified, p.badge_level, p.neuroaffirming, p.accepts_neuromundi_id,
    false as reclamable
  from public.profiles p
  where p.role = 'provider' and p.is_published
union all
  select
    d.id, 'ficha'::text as origen, d.clee,
    d.nombre as full_name, d.nombre as business_name, d.provider_type,
    'provider'::text as role, true as is_published,
    'MX'::text as country, d.estado as state, d.ciudad as city,
    d.ciudad as municipality, d.direccion as address,
    d.lat as latitude, d.lng as longitude, d.telefono as phone,
    d.sitio_web as website, d.sitio_web as website_url,
    d.especializacion as services_offered,
    '{}'::text[] as neuro_conditions, null::text as avatar_url,
    false as is_verified, null::text as badge_level,
    false as neuroaffirming, false as accepts_neuromundi_id,
    true as reclamable
  from public.directorio d
  where d.estado_revision = 'publicado'
    and not d.baja_solicitada
    and d.reclamada_por is null;

grant select on public.directorio_publico to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------------
select origen, count(*), count(*) filter (where latitude is not null) as con_mapa
from public.directorio_publico group by 1;
