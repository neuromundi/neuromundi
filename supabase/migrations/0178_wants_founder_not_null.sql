-- ============================================================================
-- 0178 — Red de seguridad para wants_founder
--
-- founder_eligible trataba wants_founder NULL como "sí" por omisión (solo excluía
-- si era explícitamente false). El registro ya lo captura con un checkbox por
-- perfil (default marcado) y el default de la columna ya es true, pero se cierra
-- el hueco garantizando que nunca pueda quedar NULL.
--
-- handle_new_user no inserta la columna (usa el default), así que NOT NULL no
-- rompe el alta. Idempotente (0 filas nulas al aplicar).
-- ============================================================================

update public.profiles set wants_founder = true where wants_founder is null;
alter table public.profiles alter column wants_founder set default true;
alter table public.profiles alter column wants_founder set not null;
