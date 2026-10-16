-- 0250 · El arranque de la campana se mueve al martes 20 de octubre de 2026,
-- 09:00 CDMX (decision de Enyoria, 16 oct 2026: la auditoria y sus
-- correcciones consumieron la ventana de envio de esta semana).
--
-- Dos cambios, y el segundo importa mas que el primero.
--
-- 1. start_at pasa del 14 al 20 de octubre a las 09:00 CDMX (15:00 UTC). De
--    start_at cuelgan el plazo de bloqueo por pais (start_at + block_days) y
--    las etapas de descuento de founder_discount. Con los 90 dias por omision,
--    la apertura para los paises que siguen cerrados se corre del 12 al 18 de
--    enero de 2027.
--
-- 2. La tarea automatica nm-campaign-emails queda DESACTIVADA, y reprogramada
--    de las 09:20 a las 09:00 CDMX para cuando se reactive.
--
--    Por que: esa tarea no esperaba ninguna instruccion. El 16 de octubre a las
--    09:20 CDMX mando sola un correo de bienvenida -medido en campaign_emails-
--    con la version de la funcion que tenia 36 dias y anunciaba una apertura
--    del directorio que ya no era cierta. Mientras siga activa, cualquier alta
--    nueva recibe su correo al dia siguiente a las 09:00 sin que nadie lo
--    autorice. Enyoria pidio expresamente que no haya envio automatico y que
--    la primera tanda espere su instruccion por escrito.
--
--    Efecto lateral, dicho a proposito: entre hoy y el 20 las altas nuevas se
--    acumulan en la cola de bienvenida sin recibir nada. Todas saldran juntas
--    cuando se reactive la tarea. Reactivar es una sola linea:
--      select cron.alter_job(
--        (select jobid from cron.job where jobname = 'nm-campaign-emails'),
--        active := true);

update public.campaign_config
   set start_at = '2026-10-20 15:00:00+00'::timestamptz,
       updated_at = now()
 where id = 1;

do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'nm-campaign-emails';
  if v_job is not null then
    perform cron.alter_job(v_job, schedule := '0 15 * * *', active := false);
  end if;
end $$;

comment on column public.campaign_config.start_at is
  'Arranque de la campana. Movido al 20 oct 2026, 09:00 CDMX (15:00 UTC) por decision de Enyoria del 16 oct: la auditoria consumio la ventana de envio de esta semana. De aqui cuelgan el plazo de bloqueo por pais (start_at + block_days) y las etapas de descuento de founder_discount.';
