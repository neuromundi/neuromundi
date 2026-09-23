-- 0120_drop_rls_backup.sql
-- Elimina el respaldo temporal del modelo de seguridad que dejó la migración 0090
-- (public._rls_backup_20260902: 193 filas con definiciones de políticas RLS, sin PII).
-- Ya cumplió su función de red de seguridad tras el cambio masivo de políticas de 0090.
-- No es una fuga (RLS activo + cero políticas lo dejaba ilegible por la Data API), pero
-- se retira para dejar limpio el esquema public. Idempotente.
drop table if exists public._rls_backup_20260902;
