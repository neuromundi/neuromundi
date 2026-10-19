-- Reemplazadas el 18 y 19 de octubre de 2026 por sus versiones con areas.
-- Verificado antes de retirarlas: no aparecen en el codigo de la aplicacion,
-- ninguna otra funcion de la base las llama y en 24 horas de registros solo se
-- llamaron las nuevas (la vieja admin_eventos_en_revision recibio 2 llamadas de
-- una pestana con el programa viejo en cache).
-- No se usa DROP: en este entorno el borrado de funciones se queda colgado. Al
-- quitarles el permiso de ejecucion dejan de existir para la API publica, que
-- es el efecto que se buscaba. El DROP puede hacerse despues sin prisa.
revoke all on function public.search_all(text) from anon, authenticated, public;
revoke all on function public.public_jobs(text, text) from anon, authenticated, public;
revoke all on function public.founders_wall(text) from anon, authenticated, public;
revoke all on function public.admin_eventos_en_revision(text) from anon, authenticated, public;
