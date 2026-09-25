-- 0131_fichas_country_mexico.sql
-- Las fichas del directorio salían con country='MX' (código ISO) en la vista
-- directorio_publico, pero TODA la app usa el NOMBRE canónico 'México'
-- (COUNTRIES.value = c.name, MEXICO_NAME='México', registros, descuentos y
-- cuotas por país). Consecuencia: al elegir "México" en el selector del
-- directorio, useDirectory filtra .eq('country','México') y las 717 fichas
-- ('MX') desaparecían. Se normaliza el literal de la vista (rama de fichas).
-- La tabla `directorio` no tiene columna de país; es un literal en la vista,
-- así que se reescribe SOLO esa expresión (como en 0130 con sections).
do $$
declare v text;
begin
  v := pg_get_viewdef('public.directorio_publico'::regclass);
  v := replace(v, '''MX''::text AS country', '''México''::text AS country');
  execute 'create or replace view public.directorio_publico as ' || v;
end $$;
