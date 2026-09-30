-- ============================================================================
-- 0144 · Plan de invitación: versión vigente
--
-- Puebla `directorio_plan_invitacion` con 105 fichas: 5 de prueba técnica y
-- 100 repartidas en cuatro tandas de 25, cada una con dos carriles.
--
-- EL SCORE ES UNA HIPÓTESIS, NO UNA MEDICIÓN
--   Nadie ha recibido nunca una invitación, así que no hay tasa de aceptación
--   observada contra la cual calibrar. Los pesos salen de razonar sobre el
--   dato, no de resultados:
--
--     dominio propio      +2   el buzón es de la organización, no personal
--     correo .gob         -4   un organismo no «reclama» una ficha
--     ya listada en otro directorio (fedma, iluminemos, vozprosaludmental)
--                         +2   única señal de PREFERENCIA REVELADA que existe:
--                              ya aceptaron aparecer en un directorio ajeno
--     tiene sitio         +1
--     tiene teléfono      +1   permite seguimiento fuera del correo
--     ficha clasificada   +1   su ficha se ve completa y sale en los filtros
--     es asociación       +1
--
--   La tanda 1 existe para calibrar el score, no para confirmarlo.
--
-- LOS DOS CARRILES VAN EN LA MISMA TANDA, A PROPÓSITO
--   A (15/tanda) social y público: exentos de cuota, el único costo de
--     reclamar es su tiempo.
--   B (10/tanda) privado con dominio propio: a los 15 días de reclamar se les
--     muestra la cuota. Son los que podrían pagar.
--   Si se mandara primero todo A y después todo B, no se podría separar
--   «mejoró el mensaje» de «cambió la lista».
--
-- LA TANDA 0 NO SON LOS MEJORES, TAMBIÉN A PROPÓSITO
--   El flujo de reclamo nunca se ha ejercido en producción: cero invitaciones
--   enviadas, cero reclamos. Si algo está roto, la tanda 0 lo descubre. Por eso
--   son A.C. pequeñas CON TELÉFONO: se puede llamar y confirmar si el correo
--   llegó, si cayó en spam y si el enlace funcionó. No se gastan los mejores
--   contactos en una prueba técnica.
--
-- EXCLUSIONES
--   · Buzones operativos (privacidad@, cancelaciones@, recibos@, presidencia@…):
--     no deciden, y en un buzón de privacidad o quejas invitan a que lo marquen
--     como spam. Tres CRIT Teletón entraban por cancelaciones@ y recibos@.
--   · Organismos públicos de derechos humanos (provider_type='legal' y
--     sector='publico'): no venden un servicio ni tienen a quién asignarle una
--     cuenta. Siguen publicados en el directorio, que es donde sirven.
--   · Una sola ficha por dominio propio: mandar dos enlaces de reclamo a la
--     misma organización en la primera campaña confunde.
--
-- Idempotente: vuelve a calcular el plan desde cero. NO envía nada.
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
    and not (d.provider_type = 'legal' and d.sector = 'publico')
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
    + (case when provider_type = 'ngo' then 1 else 0 end) as score_contacto
  from m
),
unica as (
  select distinct on (case when gratuito or gubernamental then lower(correo) else dom end) *
  from p
  order by (case when gratuito or gubernamental then lower(correo) else dom end),
           score_contacto desc, nombre
),
piloto as (
  select id, score_contacto, estado, nombre,
         row_number() over (partition by estado order by score_contacto desc, nombre) rn_estado
  from unica
  where sector = 'social' and provider_type = 'ngo'
    and coalesce(btrim(telefono),'') <> '' and score_contacto between 2 and 4
),
piloto5 as (
  select id, score_contacto, row_number() over (order by score_contacto desc, nombre) orden
  from piloto where rn_estado = 1 limit 5
),
carril_a as (
  select id, score_contacto,
         row_number() over (order by score_contacto desc, estado, nombre) rn
  from unica
  where sector in ('social','publico') and not gubernamental
    and id not in (select id from piloto5)
  order by score_contacto desc, estado, nombre
  limit 60
),
carril_b as (
  select id, score_contacto,
         row_number() over (order by score_contacto desc, estado, nombre) rn
  from unica
  where sector = 'privado' and not gratuito and not gubernamental
    and id not in (select id from piloto5)
  order by score_contacto desc, estado, nombre
  limit 40
)
insert into public.directorio_plan_invitacion (ficha_id, tanda, orden, score, motivo, carril)
select id, 0, orden, score_contacto,
       'prueba tecnica: A.C. pequena con telefono, para confirmar por llamada que el correo llego', 'piloto'
from piloto5
union all
-- Intercalados: la tanda 1 no se lleva a los mejores.
select id, 1 + ((rn - 1) % 4)::smallint, rn, score_contacto,
       'carril A: exento de cuota, alta probabilidad de reclamo', 'A'
from carril_a
union all
select id, 1 + ((rn - 1) % 4)::smallint, 100 + rn, score_contacto,
       'carril B: privado con dominio propio, es quien podria pagar membresia', 'B'
from carril_b;
