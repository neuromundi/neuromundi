-- ============================================================================
-- 0145 · Plan de invitación reordenado por ingresos
--
-- POR QUÉ CAMBIA EL ORDEN
--   1. Se necesitan ingresos ahora. Los exentos (social y público) no pagan
--      cuota, así que pasan a la ÚLTIMA tanda.
--   2. Hay una fecha límite que manda sobre todo lo demás: el precio de
--      Miembro Fundador para México vence el 31 de octubre de 2026
--      (campaign_config.founder_deadline_by_country). Fundador es el 50% del
--      precio ordinario: clínica 5,000 en vez de 10,000; escuela 8,000 en vez
--      de 16,000. Es la palanca comercial real, y expira.
--   3. Al reclamar, el privado queda 'pending' con 15 días para resolver.
--      Quien reclame después del ~15 de octubre ya no alcanza a decidir dentro
--      del precio de fundador. Por eso el calendario va comprimido.
--
-- EL ORDEN ES POR INGRESO ESPERADO, NO POR PROBABILIDAD
--   score_ingreso = señales de contacto + peso del ticket anual de fundador
--     escuela +4 · clínica +3 · especialista +3 · legal +2 · resto +1
--   No es «quién acepta más», es «quién deja más dinero si acepta». Con 31
--   días de plazo, maximizar probabilidad sin mirar el ticket deja dinero en
--   la mesa.
--
-- ADVERTENCIA QUE NO HAY QUE PERDER DE VISTA
--   `public.payments` tiene CERO registros: ningún cobro ha funcionado nunca
--   de extremo a extremo. Los precios están configurados y la tabla existe,
--   pero eso no es lo mismo que un pago cobrado. Conviene probar el checkout
--   con una transacción propia ANTES de mandar la tanda 1, o se gastan los
--   mejores contactos en un embudo que no cobra.
--
-- LA TANDA 0 SIGUE SIN SER LOS MEJORES, A PROPÓSITO
--   El flujo de reclamo nunca se ha ejercido en producción. Son A.C. con
--   teléfono para poder confirmar por llamada. Cuesta dos días y protege todo
--   lo demás.
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
    + (case when provider_type = 'ngo' then 1 else 0 end)
    + (case provider_type
         when 'school' then 4 when 'clinic' then 3 when 'service_provider' then 3
         when 'legal' then 2 else 1 end) as score_ingreso
  from m
),
unica as (
  select distinct on (case when gratuito or gubernamental then lower(correo) else dom end) *
  from p
  order by (case when gratuito or gubernamental then lower(correo) else dom end),
           score_ingreso desc, nombre
),
piloto as (
  select id, score_ingreso, estado, nombre,
         row_number() over (partition by estado order by score_ingreso, nombre) rn_estado
  from unica
  where sector = 'social' and provider_type = 'ngo'
    and coalesce(btrim(telefono),'') <> ''
),
piloto5 as (
  select id, score_ingreso, row_number() over (order by score_ingreso, nombre) orden
  from piloto where rn_estado = 1 limit 5
),
pagan as (
  select id, score_ingreso,
         row_number() over (order by score_ingreso desc, estado, nombre) rn
  from unica
  where sector = 'privado' and not gubernamental
    and id not in (select id from piloto5)
  order by score_ingreso desc, estado, nombre
  limit 75
),
exentos as (
  select id, score_ingreso,
         row_number() over (order by score_ingreso desc, estado, nombre) rn
  from unica
  where sector in ('social','publico') and not gubernamental
    and id not in (select id from piloto5)
  order by score_ingreso desc, estado, nombre
  limit 25
)
insert into public.directorio_plan_invitacion (ficha_id, tanda, orden, score, motivo, carril)
select id, 0, orden, score_ingreso,
       'prueba tecnica: A.C. con telefono, para confirmar por llamada que el correo llego', 'piloto'
from piloto5
union all
select id, 1 + ((rn - 1) / 25)::smallint, rn, score_ingreso,
       'PAGA cuota; ordenado por ticket anual de fundador (vence 31 oct 2026)', 'P'
from pagan
union all
select id, 4, 100 + rn, score_ingreso,
       'EXENTO de cuota; va al final por prioridad de ingresos', 'E'
from exentos;
