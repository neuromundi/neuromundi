-- ============================================================================
-- Recordatorios anti-ausentismo por EMAIL para las citas aceptadas
-- ----------------------------------------------------------------------------
-- La notificación IN-APP 24 h antes ya la genera emit_all_due_appointment_reminders
-- (migración 0020) vía pg_cron (0021). Aquí agregamos el canal EMAIL: la Edge
-- Function send-reminders envía el correo y marca email_reminded_at. Programamos
-- su ejecución periódica con pg_cron + pg_net. Idempotente.
-- ============================================================================

alter table public.appointment_requests
  add column if not exists email_reminded_at timestamptz;

-- pg_net para que pg_cron pueda invocar la Edge Function por HTTP.
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'nm-send-reminders') then
    perform cron.unschedule('nm-send-reminders');
  end if;
  perform cron.schedule(
    'nm-send-reminders',
    '*/10 * * * *',
    $cron$
      select net.http_post(
        url := 'https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/send-reminders',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
    $cron$
  );
end
$$;

-- Nota: si pg_net no está disponible en tu plan, usa un cron externo
-- (p. ej. cron-job.org) que haga POST cada 10 min a:
--   https://sboagswcehuxwfjdbhdn.supabase.co/functions/v1/send-reminders
