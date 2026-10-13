-- 0202_auditoria_permisos_de_funciones.sql  (aplicado el 13 de octubre de 2026)
--
-- Auditoria de las 280 funciones del esquema public, no solo las SECURITY
-- DEFINER. Metodo: para cada funcion se midio quien puede ejecutarla de verdad
-- (has_function_privilege, que ya incluye lo heredado del rol PUBLIC), si es
-- SECURITY DEFINER, si es VOLATILE (es decir, si puede escribir) y si su cuerpo
-- hace algun control de autorizacion. El cruce de esas cuatro cosas, no la
-- lectura a ojo, es lo que senala el riesgo.
--
-- HALLAZGO PRINCIPAL. purge_lapsed_founders() es SECURITY DEFINER, BORRA filas
-- de founder_members y podia ejecutarla CUALQUIER usuario con sesion, sin
-- ningun control. El borrado esta acotado por tiempo (grace_until < now()),
-- asi que no permitia borrar a quien estuviera en regla, pero si permitia a
-- cualquiera disparar el purgado completo en el momento que quisiera, y el
-- borrado no se puede deshacer.
--
-- SECUNDARIOS. refresh_provider_badge(uuid) escribia profiles.badge_level de un
-- perfil ARBITRARIO e insertaba una notificacion en el buzon de ese tercero.
-- compute_provider_level(uuid) quedaba expuesta por arrastre. Y tres funciones
-- de tarea interna (emit_all_due_appointment_reminders, expire_membership_grace,
-- expire_stale_transactions) podia dispararlas un visitante anonimo; estan
-- acotadas por tiempo y por marca de "ya hecho", asi que no eran un agujero,
-- pero no tienen por que estar al alcance de nadie mas que del servidor.
--
-- Los dos llamadores internos de refresh_provider_badge (refresh_all_badges y
-- el disparador trg_profile_badge_on_verify) son SECURITY DEFINER, asi que
-- siguen funcionando: el permiso que se quita es el de llamada directa.
--
-- OJO AL PATRON. Revocar solo de anon y authenticated NO basta cuando el
-- permiso viene del rol PUBLIC: las tres tareas internas siguieron accesibles
-- hasta revocar de PUBLIC. Quien audite debe mirar privilegios efectivos, no
-- la lista de concesiones.

revoke execute on function public.purge_lapsed_founders()               from public, anon, authenticated;
revoke execute on function public.refresh_provider_badge(uuid)          from public, anon, authenticated;
revoke execute on function public.compute_provider_level(uuid)          from public, anon, authenticated;
revoke execute on function public.emit_all_due_appointment_reminders()  from public, anon, authenticated;
revoke execute on function public.expire_membership_grace()             from public, anon, authenticated;
revoke execute on function public.expire_stale_transactions()           from public, anon, authenticated;

grant execute on function public.purge_lapsed_founders()               to service_role;
grant execute on function public.refresh_provider_badge(uuid)          to service_role;
grant execute on function public.compute_provider_level(uuid)          to service_role;
grant execute on function public.emit_all_due_appointment_reminders()  to service_role;
grant execute on function public.expire_membership_grace()             to service_role;
grant execute on function public.expire_stale_transactions()           to service_role;

-- Higiene: las 11 funciones que quedaban con search_path mutable eran todas
-- SECURITY INVOKER, asi que no habia escalada posible, pero se fijan igual.
-- Comprobado despues: 0 funciones sin search_path, y el directorio sigue
-- devolviendo 942 fichas a un visitante anonimo (sin regresion en el buscador).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as firma
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.prokind = 'f' and p.proconfig is null
  loop
    execute format('alter function %s set search_path to %L', r.firma, 'public');
  end loop;
end $$;

-- QUEDAN ABIERTAS A PROPOSITO, y conviene que quien audite lo sepa:
--   marcar_invitacion_abierta(token), solicitar_baja_ficha(token, motivo),
--   resolve_parent_by_qr(id, token)  -> la autorizacion ES el token
--   join_launch_waitlist(correo, pais), request_booking(...)  -> formularios
--     publicos para visitantes. No tienen limite de frecuencia: el riesgo que
--     queda ahi es de abuso por volumen (alta masiva, correo basura), no de
--     acceso indebido. Pendiente de decidir si se les pone limite.
