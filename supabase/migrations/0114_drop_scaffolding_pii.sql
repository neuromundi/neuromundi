-- 0114: elimina andamiaje temporal de 0097 que quedó vivo y exponía PII.
--  · _org_grupos: VISTA SECURITY DEFINER (salta RLS) con SELECT para anon →
--    leía nombre/telefono/correo del directorio, incl. fichas no publicadas.
--    Su DROP quedó comentado en 0097. 0 dependientes, no la usa el front.
--  · _directorio_respaldo_0097: clon de directorio con PII (RLS deny-all, no
--    filtraba, pero es scaffolding que sobra).
-- Idempotente.
drop view if exists public._org_grupos;
drop table if exists public._directorio_respaldo_0097;
