-- ============================================================================
-- 0102 · rescatar invitaciones perdidas por el regex de correo roto +
--         clasificar el sector faltante de fichas con correo
--
-- YA APLICADA EN PRODUCCIÓN el 2026-09-19 vía el conector Supabase.
--
-- CONTEXTO
--   0093 y 0095 crearon las invitaciones filtrando el correo con
--     '^[^@\s]+@[^@\s.]+\.[a-z]{2,}$'
--   Ese `[^@\s.]+` (excluye el punto) RECHAZA los dominios mexicanos
--   multinivel: .com.mx, .org.mx, .gob.mx, .edu.mx, .net.mx. La 0096 corrigió
--   la restricción CHECK de directorio_invitaciones a '[^@\s]+' pero NO volvió
--   a generar las invitaciones que la creación había descartado.
--
--   Resultado medido (2026-09-19): 47 fichas con correo VÁLIDO (ONG, DIF,
--   comisiones de derechos humanos, clínicas) quedaron sin invitación viva y
--   se habrían excluido en silencio de la campaña de invitación a Neuromundi.
--
-- QUÉ HACE
--   1. Crea las invitaciones faltantes con el regex CORRECTO y respetando TODAS
--      las guardas: correo válido, no inventado, ficha publicada, sin baja
--      solicitada, no reclamada, correo no rebotado y sin otra invitación viva.
--   2. Clasifica el `sector` faltante de las fichas CON correo (reaplicando las
--      heurísticas de 0096); lo que no encaje en publico/social queda 'privado'.
--      Así ningún organismo público queda sin clasificar y, por el
--      coalesce(sector,'privado') de la cola, recibe un encuadre de pago
--      indebido (el error del 2026-09-08).
--
-- NO ENVÍA NADA: enviada_en queda NULL y no hay cron de envío activo.
-- Idempotente: se puede volver a correr sin duplicar (not exists + on conflict).
-- ============================================================================

insert into public.directorio_invitaciones (directorio_id, correo)
select d.id, lower(d.correo)
from public.directorio d
where d.correo is not null
  and d.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'          -- regex CORRECTO (multinivel)
  and d.correo !~* '@preview\.neuromundi\.com$'
  and d.estado_revision = 'publicado'
  and not d.baja_solicitada
  and d.reclamada_por is null
  and not coalesce(d.correo_rebotado, false)               -- no reescribir a buzones muertos
  and not exists (
    select 1 from public.directorio_invitaciones i
    where i.directorio_id = d.id
      and i.usada_en is null and i.baja_en is null and i.cancelada_en is null
  )
on conflict do nothing;

update public.directorio set sector = 'publico'
 where sector is null and correo is not null
   and (nombre ~* '\m(DIF|USAER|CAPEP|CAIC)\M'
     or nombre ~* 'CENTRO DE ATENCION MULTIPLE|\mCAM\M'
     or nombre ~* 'SECRETAR|GOBIERNO|MUNICIPAL|ESTATAL|COMISION (ESTATAL|NACIONAL)|DERECHOS HUMANOS|SISTEMA PARA EL DESARROLLO INTEGRAL|INSTITUTO NACIONAL|PROCURADUR|AYUNTAMIENTO'
     or correo ~* '(\.gob\.mx|\.edu\.mx)$');
update public.directorio set sector = 'social'
 where sector is null and correo is not null
   and (nombre ~* '\mA\.? ?C\.?\M|I\.?A\.?P|FUNDACI|ASOCIACI|TELET[OÓ]N|\mCRIT\M'
     or correo ~* '\.org(\.mx)?$');
update public.directorio set sector = 'privado'
 where sector is null and correo is not null;

-- Comprobación (solo lectura):
--   select count(*) from public.directorio_invitaciones;                 -- 371
--   select count(*) from public.directorio_invitaciones where enviada_en is not null; -- 0
