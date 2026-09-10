-- ============================================================================
-- 0104 · El índice "una invitación viva por ficha" ignora las canceladas
--
-- `invitaciones_una_viva_idx` (0093) es un índice único parcial sobre
-- directorio_id where usada_en is null and baja_en is null. Al añadirse
-- `cancelada_en` en 0096 (rebotes de correo), una invitación CANCELADA sigue
-- contando como "viva" y ocupa el único cupo, de modo que la ficha nunca puede
-- recibir una invitación nueva (el insert choca con el índice o lo salta un
-- on conflict do nothing). Se recrea el índice excluyendo también las
-- canceladas, para que un rebote libere el cupo y la ficha sea reinvitable.
--
-- Idempotente. Recrear un índice único parcial en una tabla pequeña es seguro.
-- ============================================================================

drop index if exists public.invitaciones_una_viva_idx;

create unique index if not exists invitaciones_una_viva_idx
  on public.directorio_invitaciones (directorio_id)
  where usada_en is null and baja_en is null and cancelada_en is null;
