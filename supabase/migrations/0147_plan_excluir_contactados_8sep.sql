-- ============================================================================
-- 0147 · Sacar del plan a quienes ya recibieron el correo del 8 de septiembre
--
-- LO QUE SE ENCONTRÓ AL LEER LA FUNCIÓN DESPLEGADA (v19)
--   `segmentOf()` manda a los ya contactados al texto 'ya_privado', que abre
--   con «Hace unos días te invitamos a completar tu perfil». Dos problemas:
--
--   1. No fueron unos días: fue el 8 de septiembre, hace 22.
--
--   2. Y es el de fondo: lo que recibieron ese día NO fue una invitación. La
--      tabla `contactados_campana_20260908` guarda el asunto real, uno solo
--      para sus 100 filas: «¡Bienvenido a Neuromundi, Miembro Fundador!».
--      Se les dio la bienvenida COMO miembros fundadores. Mandarles ahora un
--      correo con una cuota anual se lee como un cambio de trato: primero se
--      les dijo que ya eran fundadores, ahora se les cobra por serlo.
--
--      La rama 'ya_publico_social' sí se disculpa por ese malentendido, pero
--      solo aplica a las organizaciones exentas. Para las de paga no hay
--      ninguna frase que reconozca el correo anterior.
--
-- LA DECISIÓN
--   27 de las 100 estaban en esa lista. Salen del plan y se reponen con los
--   siguientes del mismo orden: hay 129 privados sin contacto previo, así que
--   los 100 se completan sin bajar la calidad.
--
--   Los 27 NO se descartan: necesitan un correo propio que reconozca lo que se
--   les dijo el 8 de septiembre antes de hablarles de una cuota. Eso se escribe
--   aparte y se envía después, no en estas cuatro tandas.
--
-- Idempotente. NO envía nada.
-- ============================================================================

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
    and not exists (
      select 1 from public.contactados_campana_20260908 c
      where lower(c.correo) = lower(btrim(d.correo))
    )
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
       'paga cuota; sin contacto previo; orden por ingreso esperado (fundador vence 31 oct 2026)', 'P'
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
