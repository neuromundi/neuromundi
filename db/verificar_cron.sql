-- ============================================================================
-- Verificación de trabajos programados (pg_cron) en producción — Neuromundi
-- Pega TODO en el SQL Editor de Supabase y ejecútalo. Requiere permisos sobre el
-- esquema cron (el rol del SQL Editor los tiene).
--
-- Devuelve una fila por cron ESPERADO con estado:
--   FALTA     → no existe (no se aplicó la migración que lo agenda, o se borró).
--   INACTIVO  → existe pero está deshabilitado (active = false) → NO corre.
--   OK        → existe y activo.
-- La columna "edge_function" indica si ese cron llama a una Edge Function por
-- HTTP (cruza este resultado con `supabase functions list`): si el cron está OK
-- pero la función NO está desplegada, la llamada falla en silencio (401/404).
-- ============================================================================

-- 1) ¿Está instalada la extensión pg_cron?
select 'pg_cron' as objeto,
       case when exists (select 1 from pg_extension where extname = 'pg_cron')
            then 'OK' else 'FALTA (instálala: create extension pg_cron;)' end as estado;

-- 2) Estado de cada cron esperado.
with expected(jobname, migracion, edge_function) as (
  values
    ('nm-appt-reminders',        '0021_pg_cron',              '(RPC interna: emit_all_due_appointment_reminders)'),
    ('nm-send-reminders',        '0028_appointment_emails',   'send-reminders'),
    ('nm-suspension-reminders',  '0056_account_lifecycle',    '(RPC interna: emit_suspension_reminders)'),
    ('nm-purge-suspensions',     '0056_account_lifecycle',    '(RPC interna: purge_expired_suspensions)'),
    ('nm-purge-lapsed-founders', '0062_founder_grace_period', '(RPC interna: purge_lapsed_founders)'),
    ('nm-campaign-emails',       '0083_campaign_emails',      'campaign-emails')
),
res as (
  select e.jobname,
         e.migracion,
         e.edge_function,
         coalesce(j.schedule, '—') as schedule,
         case
           when j.jobname is null then 'FALTA'
           when j.active is false  then 'INACTIVO'
           else 'OK'
         end as estado
  from expected e
  left join cron.job j on j.jobname = e.jobname
)
select jobname, migracion, edge_function, schedule, estado
from res
order by (estado <> 'OK') desc, jobname;

-- 3) Listado COMPLETO de lo que hay agendado (para detectar extras o duplicados).
select jobid, jobname, schedule, active,
       left(replace(replace(command, chr(10), ' '), chr(9), ' '), 80) as comando
from cron.job
order by jobname;
