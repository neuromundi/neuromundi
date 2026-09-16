-- ============================================================================
-- 0097 · una ficha por organización, con varias categorías
--
-- QUÉ RESUELVE
--   El barrido del DENUE creó una ficha por ACTIVIDAD, así que una misma
--   organización quedó partida en varias fichas para poder aparecer en cada
--   categoría. Instituto Nuevo Amanecer está tres veces (ngo + school +
--   clinic); Autismo Puebla, Anda CONMiGO y otras ocho, dos veces.
--   Eso obliga a contactarlas por separado, genera invitaciones duplicadas y
--   las muestra repetidas en el directorio.
--
--   Aquí cada organización pasa a tener UNA ficha que declara TODAS sus
--   categorías, igual que profiles.sections declara varias secciones.
--
-- CÓMO
--   1. public.directorio gana `provider_types text[]`.
--      `provider_type` se conserva como categoría PRINCIPAL: la vista
--      directorio_publico lo necesita para seguir encajando en el tipo
--      Profile del front (fue justo lo que arregló la 0094).
--   2. Se consolidan 8 grupos (17 fichas → 8). Sobrevive la más completa;
--      hereda los datos que solo tenía la otra y la unión de categorías.
--   3. Se eliminan las 9 fichas absorbidas, con respaldo previo.
--
--   QUEDAN FUERA A PROPÓSITO dos organizaciones que parecían duplicadas y
--   son SUCURSALES (ver la condición de distancia en el PASO 1):
--     · AMAD — Puebla capital y San Pedro Cholula, 8.2 km aparte
--     · Nuevo Mundo en Educación Especial — Corregidora y Santiago de
--       Querétaro, 7.4 km aparte
--   Comparten teléfono, pero tienen dirección y coordenadas distintas.
--   Si algún día se quieren unir, antes hace falta que una ficha pueda
--   tener varias ubicaciones, como ya hacen los perfiles con
--   provider_locations.
--
-- NO TOCA CORREOS NI CRONS. No envía nada, no crea invitaciones, no altera
-- ningún job. Solo BORRA las invitaciones de las fichas absorbidas (a la
-- fecha: 324 creadas, 0 enviadas), para no dejarlas huérfanas.
--
-- QUÉ FALTA DESPUÉS, EN EL FRONT (no lo hace esta migración)
--   · src/hooks/useDirectory.ts — el filtro `providerTypes` hoy compara
--     contra UN solo p.provider_type. Debe pasar a comprobar intersección
--     con el arreglo, o una organización dejará de salir en su segunda
--     categoría y esta migración no habrá servido de nada.
--   · La vista directorio_publico debe exponer provider_types (abajo se
--     recrea). Para que el UNION cuadre, la rama de profiles emite
--     array[provider_type].
--   · Conviene regenerar los tipos de TypeScript de Supabase.
--
-- ORDEN OBLIGATORIO. El PASO 5 borra. Respaldo antes: Database → Backups.
-- Corre el PASO 1 y revisa la lista ANTES de seguir.
-- Idempotente: al reaplicarla no encuentra grupos y no toca ninguna fila.
-- ============================================================================


-- ── PASO 1 · qué se va a consolidar (no cambia nada) ───────────────────────
-- Solo empareja fichas de la MISMA organización con categorías DISTINTAS.
-- Exige mismo estado, los mismos dígitos en el nombre (para no juntar
-- CAM 14 con CAM 30) y mismo dominio propio o mismo teléfono. Excluye los
-- dominios compartidos por muchas entidades.
-- Deja fuera a propósito CRIAT y CREE Villahermosa: comparten conmutador y
-- dominio del DIF Tabasco pero son centros distintos (TEA vs rehabilitación).

drop view if exists public._org_grupos;

create view public._org_grupos as
with d as (
  select id, nombre, provider_type, estado, ciudad, telefono, correo, sitio_web,
         direccion, colonia, cp, lat, lng, especializacion, ambito, notas,
         split_part(lower(regexp_replace(regexp_replace(coalesce(sitio_web,''),
           '^https?://',''),'^www\.','')),'/',1)                  as dom,
         regexp_replace(coalesce(telefono,''),'[^0-9]','','g')     as tel_norm,
         translate(lower(nombre),'áéíóúñü','aeiounu')              as n,
         regexp_replace(nombre,'[^0-9]','','g')                    as digitos,
         (case when correo          is not null and correo          <> '' then 3 else 0 end)
       + (case when telefono        is not null and telefono        <> '' then 2 else 0 end)
       + (case when sitio_web       is not null and sitio_web       <> '' then 2 else 0 end)
       + (case when direccion       is not null and direccion       <> '' then 1 else 0 end)
       + (case when especializacion is not null and especializacion <> '' then 1 else 0 end)
       + (case when lat is not null and lng is not null                   then 1 else 0 end)
                                                                   as puntaje
  from public.directorio
),
compartidos as (
  select unnest(array['teleton.org','doctoralia.com.mx','psico.mx','facebook.com',
                      'instagram.com','linkedin.com','gob.mx','ueniweb.com','weebly.com']) as dom
),
pares as (
  select a.id as id_a, b.id as id_b
  from d a join d b on b.id > a.id
  where a.estado is not distinct from b.estado
    and a.digitos = b.digitos
    and similarity(a.n, b.n) >= 0.45
    and a.provider_type is distinct from b.provider_type
    and ( (a.dom <> '' and a.dom = b.dom
           and a.dom not in (select dom from compartidos)
           and a.dom not like '%.gob.mx')
       or (length(a.tel_norm) >= 8 and a.tel_norm = b.tel_norm) )
    -- MISMA SEDE. Dos fichas separadas más de 1 km son SUCURSALES, no
    -- duplicados: fusionarlas borraría una ubicación real, y `directorio`
    -- guarda un solo par de coordenadas por ficha, así que no habría dónde
    -- poner la segunda. Esto deja fuera a AMAD (Puebla capital y San Pedro
    -- Cholula, 8.2 km) y a Nuevo Mundo (Corregidora y Santiago de
    -- Querétaro, 7.4 km), que comparten teléfono pero son dos sedes.
    and ( a.lat is null or b.lat is null or a.lng is null or b.lng is null
       or 6371 * 2 * asin(sqrt(
            power(sin(radians(a.lat - b.lat)/2),2) +
            cos(radians(b.lat)) * cos(radians(a.lat)) *
            power(sin(radians(a.lng - b.lng)/2),2)
          )) <= 1 )
),
-- Componente conexo: con tres fichas (A,B,C) las tres caen en un solo grupo.
-- Sin esto, una ficha podría quedar a la vez como superviviente de una pareja
-- y como absorbida en otra, y perderse los datos que acababa de recibir.
aristas as (
  select id_a as x, id_b as y from pares
  union all
  select id_b, id_a from pares
),
grupo as (
  select x as id, least(x::text, min(y::text)) as grupo
  from aristas group by x
)
select g.grupo,
       d.id,
       d.nombre,
       d.provider_type,
       d.puntaje,
       -- sobrevive la más completa; empate por id para que sea determinista
       (d.id = (select d2.id from grupo g2 join d d2 on d2.id = g2.id
                 where g2.grupo = g.grupo
                 order by d2.puntaje desc, d2.id limit 1)) as sobrevive
from grupo g join d on d.id = g.id;

-- Revisa esto antes de continuar:
select grupo,
       count(*)                                                      as fichas,
       string_agg(provider_type, ' + ' order by provider_type)       as categorias,
       string_agg(case when sobrevive then '★ '||nombre else '  '||nombre end,
                  E'\n' order by sobrevive desc, nombre)             as fichas_del_grupo
from public._org_grupos
group by grupo
order by count(*) desc;


-- ── PASO 2 · columna de categorías múltiples ───────────────────────────────
alter table public.directorio
  add column if not exists provider_types text[];

-- Backfill: quien no tenga arreglo, arranca con su categoría actual.
update public.directorio
   set provider_types = array[provider_type]
 where provider_types is null;

alter table public.directorio
  alter column provider_types set default '{}';

create index if not exists directorio_provider_types_idx
  on public.directorio using gin (provider_types);


-- ── PASO 3 · respaldo de lo que se va a borrar ─────────────────────────────
create table if not exists public._directorio_respaldo_0097 (like public.directorio including all);
alter table public._directorio_respaldo_0097 add column if not exists respaldada_en timestamptz default now();

insert into public._directorio_respaldo_0097
select d.*, now()
from public.directorio d
where d.id in (select id from public._org_grupos where not sobrevive)
  and not exists (select 1 from public._directorio_respaldo_0097 r where r.id = d.id);


-- ── PASO 4 · consolidar en la ficha que sobrevive ──────────────────────────
-- Unión de categorías + los datos que solo tenía la absorbida.
with absorbidas as (
  select g.grupo, d.*
  from public._org_grupos g join public.directorio d on d.id = g.id
  where not g.sobrevive
),
agregado as (
  select grupo,
         array_agg(distinct provider_type)      as tipos,
         max(nullif(correo,''))                 as correo,
         max(nullif(telefono,''))               as telefono,
         max(nullif(sitio_web,''))              as sitio_web,
         max(nullif(direccion,''))              as direccion,
         max(nullif(colonia,''))                as colonia,
         max(nullif(cp,''))                     as cp,
         max(nullif(especializacion,''))        as especializacion,
         max(nullif(ambito,''))                 as ambito,
         max(lat)                               as lat,
         max(lng)                               as lng
  from absorbidas group by grupo
)
update public.directorio s
   set provider_types  = (select array_agg(distinct t)
                            from unnest(s.provider_types || a.tipos) t),
       correo          = coalesce(nullif(s.correo,''),          a.correo),
       telefono        = coalesce(nullif(s.telefono,''),        a.telefono),
       sitio_web       = coalesce(nullif(s.sitio_web,''),       a.sitio_web),
       direccion       = coalesce(nullif(s.direccion,''),       a.direccion),
       colonia         = coalesce(nullif(s.colonia,''),         a.colonia),
       cp              = coalesce(nullif(s.cp,''),              a.cp),
       especializacion = coalesce(nullif(s.especializacion,''), a.especializacion),
       ambito          = coalesce(nullif(s.ambito,''),          a.ambito),
       lat             = coalesce(s.lat, a.lat),
       lng             = coalesce(s.lng, a.lng),
       actualizada_en  = now()
  from agregado a
  join public._org_grupos g on g.grupo = a.grupo and g.sobrevive
 where s.id = g.id;


-- ── PASO 5 · eliminar las fichas absorbidas ────────────────────────────────
-- Primero sus invitaciones (ninguna enviada). NO manda ni cancela correos.
delete from public.directorio_invitaciones
 where directorio_id in (select id from public._org_grupos where not sobrevive);

delete from public.directorio
 where id in (select id from public._org_grupos where not sobrevive);


-- ── PASO 6 · la vista expone las categorías ────────────────────────────────
-- Cuerpo íntegro de la 0094 con UNA columna añadida AL FINAL de cada rama.
-- Va al final a propósito: una vista no admite reordenar ni renombrar
-- columnas (42P16), así que cualquier añadido tiene que ir después de las
-- existentes, y por eso se dropea primero.
--
-- La rama de perfiles emite array[provider_type] para que el UNION cuadre:
-- un perfil con cuenta sigue teniendo una sola categoría.

drop view if exists public.directorio_publico;

create view public.directorio_publico
with (security_invoker = on) as
  select p.*, 'perfil'::text as origen, null::text as clee, false as reclamable,
         array[p.provider_type]::text[] as provider_types
  from public.profiles p
  where p.role = 'provider' and p.is_published
union all
  select
    d.id, 'provider'::text, d.nombre,
    null::text, d.telefono, null::text,
    d.id, d.provider_type, d.nombre,
    d.sitio_web, d.direccion, d.ciudad,
    'MX'::text, false, true,
    d.lat, d.lng, d.creada_en,
    d.actualizada_en, null::date, null::text,
    null::text, d.estado, d.ciudad,
    false, d.especializacion,
    'exempt'::text, null::timestamptz,
    null::timestamptz, null::text,
    null::text, null::text,
    null::text, d.sitio_web, null::text,
    null::text, null::text, null::text,
    null::text, null::timestamptz,
    null::text, false,
    false, null::numeric,
    null::text, null::text, null::text,
    null::text, null::text,
    null::text, null::text, null::text,
    null::text, null::text, null::text,
    '{}'::text[], null::text, null::text,
    '{}'::text[], false, null::text,
    null::text, null::text, null::text,
    null::text, '{}'::text[], '{}'::text[],
    '{}'::text[], '{}'::text[],
    '{}'::jsonb, '{}'::text[],
    '{}'::text[], '{}'::text[],
    '{}'::text[], null::text,
    null::tsvector, null::text, null::bigint,
    false, null::bigint, null::timestamptz,
    0::numeric, null::boolean,
    null::timestamptz, null::timestamptz,
    null::boolean, null::timestamptz,
    false, false, false,
    '{}'::text[], '{}'::text[],
    'ficha'::text, d.clee, true,
    d.provider_types
  from public.directorio d
  where d.estado_revision = 'publicado'
    and not d.baja_solicitada
    and d.reclamada_por is null
    and not exists (
      select 1 from public.profiles p
      where p.id = d.id and p.is_published and p.role = 'provider'
    );

grant select on public.directorio_publico to anon, authenticated;

-- OJO (heredado de la 0094): el orden de las columnas de la rama de fichas
-- depende del orden de columnas de public.profiles. Si añades una columna a
-- profiles, añade su equivalente aquí, en la misma posición, o la vista
-- dejará de crearse.

select origen, count(*) from public.directorio_publico group by 1 order by 1;


-- ── PASO 7 · verificación ──────────────────────────────────────────────────
-- (a) no debe quedar ningún grupo por consolidar: 0
select count(*) as grupos_restantes
from public._org_grupos where not sobrevive;

-- (b) fichas totales y cuántas declaran más de una categoría
select count(*)                                              as fichas,
       count(*) filter (where array_length(provider_types,1) > 1) as con_varias_categorias,
       count(*) filter (where provider_types is null
                           or array_length(provider_types,1) = 0) as sin_categoria
from public.directorio;

-- (c) la categoría principal sigue dentro del arreglo en todas
select count(*) as incoherentes
from public.directorio
where not (provider_type = any(provider_types));

-- (d) nada quedó huérfano
select count(*) as invitaciones_huerfanas
from public.directorio_invitaciones i
where not exists (select 1 from public.directorio d where d.id = i.directorio_id);

-- Limpieza de la vista auxiliar (el respaldo se conserva a propósito).
-- drop view if exists public._org_grupos;
