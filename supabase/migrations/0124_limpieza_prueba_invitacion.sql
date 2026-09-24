-- 0124_limpieza_prueba_invitacion.sql
-- Limpieza puntual: elimina la ficha e invitación de PRUEBA creadas para validar
-- el rastreo de apertura (jormed2025@gmail.com) y sus notificaciones de prueba.
-- Idempotente. No afecta datos reales del directorio.

-- Borra las notificaciones de prueba a los admins (solo del tipo invite_opened de la ficha de prueba).
delete from public.notifications
 where type = 'invite_opened'
   and (data->>'correo') = 'jormed2025@gmail.com';

-- Borra la invitación de prueba (por si no hay ON DELETE CASCADE) y luego la ficha.
delete from public.directorio_invitaciones i
 using public.directorio d
 where i.directorio_id = d.id
   and lower(d.correo) = 'jormed2025@gmail.com'
   and d.fuente = 'curado'
   and d.nombre = 'Prueba Neuromundi (jormed2025)';

delete from public.directorio
 where lower(correo) = 'jormed2025@gmail.com'
   and fuente = 'curado'
   and nombre = 'Prueba Neuromundi (jormed2025)';
