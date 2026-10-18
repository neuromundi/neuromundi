-- 0263: reducir superficie. Tres funciones con SECURITY DEFINER quedaron
-- ejecutables por cualquiera a traves de la API publica sin que nadie las llame
-- desde ahi:
--   · founder_days_for y founder_country_deadline: nacieron hoy con la 0261 y
--     solo las usan otras funciones del servidor, que corren como dueño y no
--     necesitan el permiso.
--   · protect_profile_columns: es un disparador. Los disparadores no piden
--     permiso de ejecucion al usuario, asi que exponerla por la API solo servia
--     para que alguien la invocara suelta y viera el mensaje de error.
-- No tapan ninguna fuga de datos (la configuracion de campaña ya es de lectura
-- publica por su propia politica), pero no tienen por que estar a la vista.

revoke all on function public.founder_days_for(text) from public, anon, authenticated;
grant execute on function public.founder_days_for(text) to service_role;

revoke all on function public.founder_country_deadline(text) from public, anon, authenticated;
grant execute on function public.founder_country_deadline(text) to service_role;

revoke all on function public.protect_profile_columns() from public, anon, authenticated;
