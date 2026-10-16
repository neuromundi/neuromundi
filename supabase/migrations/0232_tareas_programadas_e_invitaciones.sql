-- 0232 · Tres tareas programadas que el proyecto daba por hechas y no existían,
-- más la red de seguridad de la caducidad de las invitaciones.
-- (Auditoría del 15 oct 2026, hallazgos A-2, A-3, M-4.)
--
-- MATIZ MEDIDO, que corrige a la auditoría: directorio_invitacion_enviada SÍ
-- renueva la caducidad a 60 días al enviar. El riesgo real es otro, y es doble:
--   (a) una invitación que no se envíe antes de su caducidad desaparece sola de
--       la cola (que filtra expira_en > now()) y nadie se entera;
--   (b) un REENVÍO no renovaba nada, porque la función exigía enviada_en is
--       null: el destinatario recibía un segundo correo con un enlace vencido.
-- Medido el 15 oct: 366 invitaciones vivas sin enviar, 0 vencidas, la primera
-- vence el 7 de noviembre, 71 vencerían antes del plazo de fundador.

create or replace function public.directorio_invitacion_enviada(p_token text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  update public.directorio_invitaciones
     set enviada_en = coalesce(enviada_en, now()),
         expira_en  = now() + interval '60 days'
   where token = p_token
     and cancelada_en is null
     and usada_en is null
     and baja_en is null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $function$;

comment on function public.directorio_invitacion_enviada(text) is
  'Marca la invitacion como enviada y renueva su caducidad a 60 dias. Tambien en los reenvios.';

create or replace function public.renovar_invitaciones_por_vencer()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int;
begin
  update public.directorio_invitaciones
     set expira_en = now() + interval '60 days'
   where usada_en is null
     and baja_en is null
     and cancelada_en is null
     and expira_en < now() + interval '15 days';
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform public.notify_admins(
      'invitaciones_renovadas',
      'Se renovo la vigencia de invitaciones por vencer',
      v_n || ' invitaciones del directorio estaban por vencer y se les amplio la vigencia 60 dias.',
      jsonb_build_object('renovadas', v_n)
    );
  end if;
  return v_n;
end $function$;

revoke all on function public.renovar_invitaciones_por_vencer() from public, anon;
grant execute on function public.renovar_invitaciones_por_vencer() to service_role;

create or replace function public.admin_invitaciones_vigencia()
returns table (
  vivas bigint, sin_enviar bigint, enviadas bigint,
  vencidas bigint, vencen_en_15_dias bigint, primera_en_vencer timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*),
         count(*) filter (where enviada_en is null),
         count(*) filter (where enviada_en is not null),
         count(*) filter (where expira_en <= now()),
         count(*) filter (where expira_en > now() and expira_en < now() + interval '15 days'),
         min(expira_en)
  from public.directorio_invitaciones
  where public.is_admin_or_advisor()
    and usada_en is null and baja_en is null and cancelada_en is null;
$function$;

revoke all on function public.admin_invitaciones_vigencia() from public, anon;
grant execute on function public.admin_invitaciones_vigencia() to authenticated, service_role;

-- Tareas programadas. Medido: habia 8 y ninguna llamaba a campaign-emails, a
-- avisar-renovacion ni a expire_membership_grace, pese a que las dos primeras
-- estan desplegadas y la tercera es la unica que escribe 'past_due'.
select cron.schedule('nm-campaign-emails', '20 15 * * *', $cron$
    select net.http_post(
      url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/campaign-emails',
      headers := jsonb_build_object('Content-Type','application/json',
        'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name='cron_secret'),'')),
      body := '{}'::jsonb);
  $cron$);

select cron.schedule('nm-avisar-renovacion', '40 15 * * *', $cron$
    select net.http_post(
      url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/avisar-renovacion',
      headers := jsonb_build_object('Content-Type','application/json',
        'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name='cron_secret'),'')),
      body := '{}'::jsonb);
  $cron$);

select cron.schedule('nm-expire-grace', '15 10 * * *', $cron$ select public.expire_membership_grace(); $cron$);
select cron.schedule('nm-expire-stale-transactions', '25 10 * * *', $cron$ select public.expire_stale_transactions(); $cron$);
select cron.schedule('nm-renovar-invitaciones', '35 10 * * *', $cron$ select public.renovar_invitaciones_por_vencer(); $cron$);
