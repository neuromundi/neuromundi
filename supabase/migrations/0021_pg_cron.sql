-- ============================================================================
-- pg_cron: recordatorios automáticos de cita (24 h antes) del lado del servidor
-- ----------------------------------------------------------------------------
-- Habilita la extensión pg_cron y programa el recordatorio global cada 30 min,
-- de modo que el aviso llegue aunque el usuario no abra la app. Idempotente.
--
-- Nota: en algunos proyectos la creación de extensiones requiere hacerse desde
-- el Dashboard de Supabase (Database → Extensions → pg_cron). Si el CREATE
-- EXTENSION falla por permisos, habilítala allí y vuelve a ejecutar el bloque
-- de programación (el DO $$ ... $$ de abajo).
-- ============================================================================

create extension if not exists pg_cron;

do $$
begin
  -- Reprograma de forma idempotente: si ya existe el job, lo quita primero.
  if exists (select 1 from cron.job where jobname = 'nm-appt-reminders') then
    perform cron.unschedule('nm-appt-reminders');
  end if;
  perform cron.schedule(
    'nm-appt-reminders',
    '*/30 * * * *',
    $cron$ select public.emit_all_due_appointment_reminders(); $cron$
  );
end
$$;
