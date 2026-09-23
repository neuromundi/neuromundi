-- 0116: el secreto compartido (x-cron-secret) se lee de Supabase VAULT en vez de
-- un GUC de base. Motivo: el rol del SQL Editor de Supabase NO es superusuario y
-- `alter database ... set app.cron_secret` falla con 42501. Reemplaza el enfoque
-- de 0115 (que usaba current_setting de un GUC). Idempotente.
--
-- ACCIÓN MANUAL (una sola vez), en el SQL Editor, con tu CRON_SECRET real
-- (el MISMO valor que el secreto CRON_SECRET de las Edge Functions):
--   select vault.create_secret(
--     'TU_CRON_SECRET', 'cron_secret',
--     'Secreto compartido para endpoints internos (send-push/reminders/purge)');
-- Para rotarlo después:
--   select vault.update_secret(
--     (select id from vault.secrets where name='cron_secret'), 'NUEVO_VALOR');

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
  v_secret text;
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

  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'cron_secret';

  perform net.http_post(
    url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(v_secret, '')
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
        'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
      ),
      body := '{}'::jsonb
    );
  $cron$);
end $$;

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
        'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'), '')
      ),
      body := '{}'::jsonb
    );
  $cron$);
end $$;
