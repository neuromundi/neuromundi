-- ============================================================================
-- 0108 · campaña de invitaciones: reclasificar 1 ficha pública + flag ya_contactado
--
-- YA APLICADA EN PRODUCCIÓN el 2026-09-19 vía el conector Supabase.
--
-- MIG-B: "Espacio de Atención Autista" (correo institutodelamujer@tangancicuaro.gob.mx)
--   es un organismo público municipal; estaba en sector='privado' y por el
--   coalesce(sector,'privado') de la cola habría recibido encuadre con oferta
--   de pago. Se corrige SOLO esa ficha. (La ficha "CUIDADO DE NIÑOS CRIT" —
--   correo personal msn.com — quedó PENDIENTE de revisión a propósito: el
--   nombre casó con el patrón CRIT pero no hay señal de que sea pública.)
--
-- MIG-A: `directorio_invitaciones_cola` gana la columna `ya_contactado_8sep`
--   (join con contactados_campana_20260908), para que la Edge Function
--   `enviar-invitaciones` pueda SEGMENTAR las tandas y elegir el mensaje:
--     · nuevos (no contactados)            → primera invitación
--     · ya contactados + público/social    → mensaje CORRECTIVO (sin pago)
--     · ya contactados + privado           → seguimiento suave
--   Cambia el tipo de retorno → drop + create (evita 42P13). Idempotente.
-- ============================================================================

update public.directorio set sector='publico', actualizada_en=now()
 where lower(correo)='institutodelamujer@tangancicuaro.gob.mx'
   and sector is distinct from 'publico';

drop function if exists public.directorio_invitaciones_cola(integer);
create function public.directorio_invitaciones_cola(p_limit integer default 500)
returns table (
  token text, correo text, nombre text, provider_type text,
  sector text, estado text, ciudad text, ya_contactado_8sep boolean)
language sql stable security definer set search_path to 'public' as $$
  select i.token, i.correo, d.nombre, d.provider_type,
         coalesce(d.sector,'privado'), d.estado, d.ciudad,
         exists (select 1 from public.contactados_campana_20260908 c
                 where lower(c.correo)=lower(i.correo)) as ya_contactado_8sep
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.enviada_en is null and i.cancelada_en is null and i.usada_en is null
    and i.baja_en is null and i.expira_en > now()
    and i.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
    and i.correo !~* '@preview\.neuromundi\.com$'
    and d.estado_revision='publicado' and not d.baja_solicitada
    and d.reclamada_por is null and not coalesce(d.correo_rebotado,false)
  order by d.nombre
  limit greatest(1, least(coalesce(p_limit,500),1000));
$$;
revoke all on function public.directorio_invitaciones_cola(integer) from public, anon, authenticated;
grant execute on function public.directorio_invitaciones_cola(integer) to service_role;
