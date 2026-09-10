-- ============================================================================
-- 0101 · Consistencia de cancelada_en / baja_en en las funciones del token
--        de invitación del directorio (auditoría profunda 2026-09-10)
--
-- En 0096 se endureció `ficha_por_token` para ignorar invitaciones canceladas
-- (cancelada_en, p. ej. por rebote de correo). Pero sus dos hermanas quedaron
-- con el cuerpo de 0093 y NO filtran `cancelada_en`:
--
--   · marcar_ficha_reclamada: filtra usada_en/baja_en/expira, pero NO
--     cancelada_en → un token de una invitación cancelada aún puede RECLAMAR
--     la ficha.
--   · solicitar_baja_ficha: filtra solo usada_en/expira → NO cancelada_en ni
--     siquiera baja_en → un token cancelado (o ya usado para baja) aún puede
--     disparar baja.
--
-- Ambas son SECURITY DEFINER y su única barrera es el token; una invitación
-- cancelada perdió la confianza en ese buzón y no debe seguir operando.
-- Este es el patrón "al corregir un fallo, busca sus hermanas" (como
-- admin_badge_inputs / my_badge_inputs): 0096 arregló una, faltaban dos.
--
-- La firma NO cambia, así que basta `create or replace` (sin 42P13).
-- Idempotente.
-- ============================================================================

create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
  from public.directorio_invitaciones i
  where i.token = p_token
    and i.usada_en is null
    and i.baja_en is null
    and i.cancelada_en is null      -- 0101: ignora invitaciones canceladas
    and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set reclamada_por = p_perfil, reclamada_en = now(), actualizada_en = now()
   where id = v_ficha;

  update public.directorio_invitaciones set usada_en = now() where token = p_token;
  return true;
end $function$;

create or replace function public.solicitar_baja_ficha(p_token text, p_motivo text default null::text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
  from public.directorio_invitaciones i
  where i.token = p_token
    and i.usada_en is null
    and i.baja_en is null            -- 0101: no reoperar una baja ya solicitada
    and i.cancelada_en is null       -- 0101: ignora invitaciones canceladas
    and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set baja_solicitada = true,
         baja_motivo     = left(coalesce(p_motivo, ''), 500),
         estado_revision = 'borrador',
         actualizada_en  = now()
   where id = v_ficha;

  update public.directorio_invitaciones
     set baja_en = now()
   where directorio_id = v_ficha and baja_en is null;

  return true;
end $function$;
