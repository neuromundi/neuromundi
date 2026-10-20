-- ============================================================================
-- 0310 — Punto de restauracion del directorio antes del arranque
--
-- La tabla `directorio` no guarda historial de filas. El 19 de octubre de 2026
-- una correccion de la clasificacion estrecho a 219 fichas publicadas y la
-- reconstruccion salio por inferencia, no porque hubiera copia. Antes de volver
-- a tocar 1,818 fichas publicadas, aqui queda una copia exacta.
--
-- Son copias de solo lectura para restaurar, no tablas de trabajo.
-- Comprobado al crearlas: 1,819 fichas, 390 invitaciones, 1,122 del plan, y
-- cero diferencias en la columna de areas respecto a la tabla viva.
-- ============================================================================

create table if not exists public.respaldo_directorio_20261019 as
  select * from public.directorio;

create table if not exists public.respaldo_invitaciones_20261019 as
  select * from public.directorio_invitaciones;

create table if not exists public.respaldo_plan_invitacion_20261019 as
  select * from public.directorio_plan_invitacion;

alter table public.respaldo_directorio_20261019 enable row level security;
alter table public.respaldo_invitaciones_20261019 enable row level security;
alter table public.respaldo_plan_invitacion_20261019 enable row level security;

revoke all on public.respaldo_directorio_20261019 from anon, authenticated;
revoke all on public.respaldo_invitaciones_20261019 from anon, authenticated;
revoke all on public.respaldo_plan_invitacion_20261019 from anon, authenticated;

comment on table public.respaldo_directorio_20261019 is
  'Copia exacta de directorio tomada el 19 oct 2026, antes del arranque. Para restaurar, no para consultar.';
