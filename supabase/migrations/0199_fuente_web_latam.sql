-- 0199_fuente_web_latam.sql
--
-- AVISO DE NUMERACION: esta migracion se aplico en la base el 13 de octubre de 2026
-- con el nombre "0196_fuente_web_latam" (version 20261013191719), pero los numeros
-- 0196 a 0198 ya estaban ocupados en disco por migraciones de otra sesion aplicadas
-- el 9 de octubre. Se guarda aqui como 0199 para que el orden de los archivos
-- coincida con el orden real de aplicacion. Lo mismo ocurre con
-- 0195_pais_en_fichas_del_directorio.sql, que comparte numero con 0195_ngo_founder_free.sql.
--
-- Que hace: admitir 'web_latam_2026' como origen valido de una ficha del directorio.
-- Lo necesitan las 218 fichas de America Latina, Estados Unidos y Canada cargadas
-- entre el 12 y el 13 de octubre de 2026.

alter table public.directorio
  drop constraint if exists directorio_fuente_valida;

alter table public.directorio
  add constraint directorio_fuente_valida
  check (fuente = any (array[
    'denue'::text,
    'curado'::text,
    'fedma'::text,
    'iluminemos'::text,
    'vozprosaludmental'::text,
    'web_latam_2026'::text
  ]));
