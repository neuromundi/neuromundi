-- ============================================================================
-- 0143 · SUPERADA POR LA 0144
--
-- Esta migración pobló el plan excluyendo buzones operativos (privacidad@,
-- cancelaciones@, recibos@) y dejando una sola ficha por dominio propio.
--
-- Se quedó corta en dos cosas que corrige la 0144:
--   · Su comentario decía que excluía `presidencia@`, pero la expresión
--     regular NO lo incluía. El comentario mentía sobre el código.
--   · Dejó entrar cinco comisiones y procuradurías estatales de derechos
--     humanos, que no «reclaman una ficha de proveedor».
--
-- Se conserva el archivo porque la migración ya se aplicó y está en el ledger.
-- No hace nada: la 0144 vuelve a poblar la tabla desde cero.
-- ============================================================================

select 'superada por 0144' as nota;
