-- ============================================================================
-- 0109 · la cola de invitaciones distingue correo personal vs institucional
--
-- YA APLICADA EN PRODUCCIÓN el 2026-09-20 vía el conector Supabase.
--
-- Propósito: los dominios personales (gmail/hotmail/outlook/yahoo/…) suelen ser
-- el dato de un INDIVIDUO, no un buzón institucional; bajo la LFPDPPP eso exige
-- más cuidado (aviso de privacidad visible, baja inmediata, no insistir). La
-- bandera `correo_personal` permite al enviador tratarlos distinto o dejarlos
-- fuera de la primera tanda. Cambia el tipo de retorno → drop + create (42P13).
-- Idempotente.
-- ============================================================================

drop function if exists public.directorio_invitaciones_cola(integer);
create function public.directorio_invitaciones_cola(p_limit integer default 500)
returns table (
  token text, correo text, nombre text, provider_type text,
  sector text, estado text, ciudad text, ya_contactado_8sep boolean,
  correo_personal boolean)
language sql stable security definer set search_path to 'public' as $$
  select i.token, i.correo, d.nombre, d.provider_type,
         coalesce(d.sector,'privado'), d.estado, d.ciudad,
         exists (select 1 from public.contactados_campana_20260908 c
                 where lower(c.correo)=lower(i.correo)) as ya_contactado_8sep,
         (i.correo ~* '@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\.') as correo_personal
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
