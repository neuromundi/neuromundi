-- ============================================================================
-- 0146 · Plan de 100 que pagan + cola por tanda con precio exacto
--
-- TRES COSAS QUE FALTABAN Y HABRÍAN ROTO LA CAMPAÑA
--
-- 1. LA COLA IGNORABA EL PLAN. `directorio_invitaciones_cola` ordena por
--    `d.nombre`. Pedir «manda la tanda 1» habría mandado los 25 primeros por
--    orden alfabético, no los 25 elegidos.
--
-- 2. EL PRECIO IBA COMO RANGO («≈ $250–$800 MXN/mes»). Un rango obliga a
--    preguntar y deja que el cobro real se sienta distinto de lo ofrecido. La
--    cola ahora devuelve el precio EXACTO de esa ficha, resuelto con
--    `registration_quote`, la misma función que usa el checkout: así el correo
--    y el cobro no pueden discrepar.
--
-- 3. FICHAS DEL PLAN SIN INVITACIÓN. Sin fila en `directorio_invitaciones` no
--    hay token y no se puede enviar. Se crean las que falten.
--
-- El plan pasa a 100 que PAGAN en cuatro tandas de 25. Los exentos salen de
-- estas tandas; quedan para el final del proyecto.
--
-- Idempotente. NO envía nada.
-- ============================================================================

create or replace function public.ficha_affiliate_type(p_provider_type text, p_profession text)
returns text language sql immutable as $$
  select case
    when p_provider_type is null then 'nonmedical_specialist'
    when p_provider_type = 'service_provider' then
      case when public.is_medical_profession(p_profession) then 'medical_specialist'
           else 'nonmedical_specialist' end
    else p_provider_type
  end;
$$;

comment on function public.ficha_affiliate_type(text, text) is
  'Tipo de afiliado (para tarifa) a partir de una ficha del directorio, que '
  'todavía no tiene perfil. Espeja public.affiliate_type.';

truncate public.directorio_plan_invitacion;

with base as (
  select d.id, d.sector, d.provider_type, d.estado, d.telefono, d.sitio_web,
         d.profession, d.fuente, btrim(d.correo) correo, d.nombre,
         lower(split_part(btrim(d.correo),'@',1)) buzon,
         lower(split_part(btrim(d.correo),'@',2)) dom
  from public.directorio d
  where d.estado_revision = 'publicado'
    and not d.baja_solicitada and d.reclamada_por is null
    and coalesce(btrim(d.correo),'') <> ''
    and not coalesce(d.correo_rebotado, false)
    and d.sector = 'privado'
),
limpio as (
  select * from base
  where buzon !~ '^(privacidad|cancelaciones|recibos|facturacion|facturas|cobranza|quejas|denuncias|aviso|avisos|asegura|legal|rh|reclutamiento|prensa|presidencia|comentarios|webmaster|noreply|no-reply)$'
),
m as (
  select *,
    dom in ('gmail.com','hotmail.com','outlook.com','yahoo.com.mx','yahoo.com',
            'live.com','live.com.mx','hotmail.es','msn.com','prodigy.net.mx') as gratuito,
    dom like '%gob%' as gubernamental
  from limpio
),
p as (
  select *,
      (case when gubernamental then -4 when gratuito then 0 else 2 end)
    + (case when fuente in ('fedma','iluminemos','vozprosaludmental') then 2 else 0 end)
    + (case when coalesce(btrim(sitio_web),'') <> '' then 1 else 0 end)
    + (case when coalesce(btrim(telefono),'') <> '' then 1 else 0 end)
    + (case when profession is not null then 1 else 0 end)
    + ((public.registration_quote(
          public.ficha_affiliate_type(provider_type, profession), 'México'
        ) ->> 'founder_annual')::numeric / 1000)::int
    as score_ingreso
  from m
  where not gubernamental
),
unica as (
  select distinct on (case when gratuito then lower(correo) else dom end) *
  from p
  order by (case when gratuito then lower(correo) else dom end), score_ingreso desc, nombre
),
top100 as (
  select id, score_ingreso,
         row_number() over (order by score_ingreso desc, estado, nombre) rn
  from unica
  order by score_ingreso desc, estado, nombre
  limit 100
)
insert into public.directorio_plan_invitacion (ficha_id, tanda, orden, score, motivo, carril)
select id, 1 + ((rn - 1) / 25)::smallint, rn, score_ingreso,
       'paga cuota; orden por ingreso esperado (ticket de fundador vence 31 oct 2026)', 'P'
from top100;

insert into public.directorio_invitaciones (directorio_id, correo)
select p.ficha_id, btrim(d.correo)
from public.directorio_plan_invitacion p
join public.directorio d on d.id = p.ficha_id
where not exists (
  select 1 from public.directorio_invitaciones i
  where i.directorio_id = p.ficha_id
    and i.cancelada_en is null and i.usada_en is null
    and i.baja_en is null and i.expira_en > now()
);

-- Cola POR TANDA. Mismas guardas que directorio_invitaciones_cola, más el
-- orden del plan y la tarifa resuelta de cada destinatario.
create or replace function public.directorio_invitaciones_cola_tanda(
  p_tanda integer, p_limit integer default 25
)
returns table (
  token text, correo text, nombre text, provider_type text, sector text,
  estado text, ciudad text, ya_contactado_8sep boolean, correo_personal boolean,
  orden integer, affiliate_type text, moneda text,
  precio_fundador numeric, precio_ordinario numeric, precio_configurado boolean
)
language sql stable security definer set search_path to 'public' as $$
  with q as (
    select i.token, i.correo, d.nombre, d.provider_type,
           coalesce(d.sector,'privado') as sector, d.estado, d.ciudad,
           exists (select 1 from public.contactados_campana_20260908 c
                   where lower(c.correo) = lower(i.correo)) as ya_contactado_8sep,
           (i.correo ~* '@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\.') as correo_personal,
           pl.orden,
           public.ficha_affiliate_type(d.provider_type, d.profession) as affiliate_type
    from public.directorio_plan_invitacion pl
    join public.directorio d on d.id = pl.ficha_id
    join public.directorio_invitaciones i on i.directorio_id = pl.ficha_id
    where pl.tanda = p_tanda
      and i.enviada_en is null and i.cancelada_en is null and i.usada_en is null
      and i.baja_en is null and i.expira_en > now()
      and i.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
      and i.correo !~* '@preview\.neuromundi\.com$'
      and d.estado_revision = 'publicado' and not d.baja_solicitada
      and d.reclamada_por is null and not coalesce(d.correo_rebotado, false)
  )
  select q.token, q.correo, q.nombre, q.provider_type, q.sector, q.estado, q.ciudad,
         q.ya_contactado_8sep, q.correo_personal, q.orden, q.affiliate_type,
         coalesce(cot ->> 'currency', 'MXN'),
         (cot ->> 'founder_annual')::numeric,
         (cot ->> 'ordinary_annual')::numeric,
         coalesce((cot ->> 'configured')::boolean, false)
  from q, lateral public.registration_quote(q.affiliate_type, 'México') as cot
  order by q.orden
  limit greatest(1, least(coalesce(p_limit, 25), 200));
$$;

revoke all on function public.directorio_invitaciones_cola_tanda(integer, integer)
  from public, anon, authenticated;
grant execute on function public.directorio_invitaciones_cola_tanda(integer, integer) to service_role;
