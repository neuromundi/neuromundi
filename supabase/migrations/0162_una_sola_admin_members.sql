-- ============================================================================
-- 0162 · Dejar una sola versión de admin_members
--
-- La 0161 amplió la firma con tres parámetros más, pero `create or replace` no
-- reemplaza una función cuando cambia el número de argumentos: crea una
-- SOBRECARGA. Quedaron dos versiones vivas, y Postgres respondía
-- «function public.admin_members(unknown) is not unique».
--
-- No es sólo incomodidad al consultar: PostgREST también tendría que elegir
-- entre dos candidatas, y el resultado dependería de qué parámetros mande el
-- cliente en cada llamada.
--
-- Se elimina la firma de siete argumentos que introdujo la 0159. Queda la de
-- diez, con los filtros de publicación, reclamo y pago.
--
-- Idempotente. NO envía nada.
-- ============================================================================

drop function if exists public.admin_members(text, text, int, text, text, boolean, text);
