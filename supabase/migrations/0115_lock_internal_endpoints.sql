-- 0115: blinda los endpoints internos send-push / send-reminders /
-- purge-expired-files. Las funciones ahora exigen la cabecera
-- x-cron-secret == CRON_SECRET (fail-closed). Aquí actualizamos a sus
-- invocadores (trigger + crons) para que envíen ese secreto, leído de un GUC
-- de base `app.cron_secret` (no se hardcodea el secreto en el repo).
--
-- ACCIÓN MANUAL REQUERIDA (una vez): fijar el GUC con tu CRON_SECRET real:
--   alter database postgres set app.cron_secret = 'TU_CRON_SECRET';
-- (surte efecto en conexiones nuevas; los jobs de pg_cron y los triggers lo
--  leerán en su próxima ejecución). Hasta fijarlo, el push/recordatorios/purga
--  responderán 401 (el trigger traga la excepción; la campana in-app no se ve
--  afectada).

-- 1) Trigger de push: añade x-cron-secret desde el GUC.
create or replace function public.tg_notify_push()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_push_enabled boolean := true;
  v_muted text[] := '{}';
  v_cat text := public.notif_category(NEW.type);
begin
  select np.push_enabled, np.muted_categories
    into v_push_enabled, v_muted
    from public.notification_prefs np
    where np.user_id = NEW.user_id;

  if coalesce(v_push_enabled, true) = false then
    return NEW;
  end if;
  if v_muted is not null and v_cat = any(v_muted) then
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := json_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'data', NEW.data
    )::jsonb
  );
  return NEW;
exception when others then
  return NEW;
end;
$function$;

-- 2) Cron de recordatorios: reprograma con el secreto.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'nm-send-reminders') then
    perform cron.unschedule('nm-send-reminders');
  end if;
  perform cron.schedule('nm-send-reminders', '*/10 * * * *', $cron$
    select net.http_post(
      url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    );
  $cron$);
end $$;

-- 3) Cron de purga: reprograma con el secreto (conserva su URL y horario).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-expired-files-cada-hora') then
    perform cron.unschedule('purge-expired-files-cada-hora');
  end if;
  perform cron.schedule('purge-expired-files-cada-hora', '0 * * * *', $cron$
    select net.http_post(
      url := 'https://sboagswcehuxwfjdbhdn.functions.supabase.co/purge-expired-files',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.cron_secret', true)
      ),
      body := '{}'::jsonb
    );
  $cron$);
end $$;
