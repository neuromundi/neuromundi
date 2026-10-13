-- 0200_pais_en_colas_de_invitacion.sql  (aplicado el 13 de octubre de 2026)
--
-- QUE CIERRA. Dos descuadres que convivian en la campana de invitaciones:
--
--   1) Ninguna de las dos colas devolvia el pais de la ficha, asi que el correo
--      no podia saber que plazo de fundador le tocaba a cada destinatario.
--   2) La cola por tanda cotizaba el precio con el literal 'México'. Con 218
--      fichas de 20 paises ya publicadas (America Latina, Estados Unidos y
--      Canada, cargadas el 12 y 13 de octubre de 2026), invitar a una ficha no
--      mexicana le habria mostrado el precio de Mexico y el plazo de Mexico.
--
-- COMO. Se crean las versiones _v2 de las dos colas: devuelven `pais` y cotizan
-- con el pais de la ficha. NO se tocan las originales: la funcion de envio ya
-- apunta a las _v2 y las viejas quedan un tiempo como red de seguridad. Cuando
-- se confirme que la campana corre bien, se pueden eliminar.
--
-- PERMISOS. Son SECURITY DEFINER y exponen el token y el correo de cada
-- invitacion pendiente. Los permisos por omision del proyecto le dan EXECUTE a
-- anon y authenticated en cada funcion nueva, lo que habria dejado los tokens
-- al alcance de cualquiera. Por eso se revocan explicitamente y solo queda
-- service_role, igual que en las originales. Comprobado ejecutando como anon:
-- "permission denied for function".

create or replace function public.directorio_invitaciones_cola_v2(p_limit integer default 500)
returns table(token text, correo text, nombre text, provider_type text, sector text,
              estado text, ciudad text, pais text,
              ya_contactado_8sep boolean, correo_personal boolean)
language sql stable security definer set search_path to 'public'
as $$
  select i.token, i.correo, d.nombre, d.provider_type,
         coalesce(d.sector,'privado'), d.estado, d.ciudad,
         coalesce(d.pais,'México'),
         exists (select 1 from public.contactados_campana_20260908 c
                 where lower(c.correo)=lower(i.correo)) as ya_contactado_8sep,
         (i.correo ~* '@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\.') as correo_personal
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.enviada_en is null and i.cancelada_en is null and i.usada_en is null
    and i.baja_en is null and i.expira_en > now()
    and i.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
    and i.correo !~* '@preview\.neuromundi\.com$'
    and d.estado_revision='publicado' and not d.baja_solicitada
    and d.reclamada_por is null and not coalesce(d.correo_rebotado,false)
  order by d.nombre
  limit greatest(1, least(coalesce(p_limit,500),1000));
$$;

create or replace function public.directorio_invitaciones_cola_tanda_v2(p_tanda integer, p_limit integer default 25)
returns table(token text, correo text, nombre text, provider_type text, sector text,
              estado text, ciudad text, pais text,
              ya_contactado_8sep boolean, correo_personal boolean, orden integer,
              affiliate_type text, moneda text, precio_fundador numeric,
              precio_ordinario numeric, precio_configurado boolean)
language sql stable security definer set search_path to 'public'
as $$
  with q as (
    select i.token, i.correo, d.nombre, d.provider_type,
           coalesce(d.sector,'privado') as sector, d.estado, d.ciudad,
           coalesce(d.pais,'México') as pais,
           exists (select 1 from public.contactados_campana_20260908 c
                   where lower(c.correo) = lower(i.correo)) as ya_contactado_8sep,
           (i.correo ~* '@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\.') as correo_personal,
           pl.orden,
           public.ficha_affiliate_type(d.provider_type, d.profession) as affiliate_type
    from public.directorio_plan_invitacion pl
    join public.directorio d on d.id = pl.ficha_id
    join public.directorio_invitaciones i on i.directorio_id = pl.ficha_id
    where pl.tanda = p_tanda
      and i.enviada_en is null and i.cancelada_en is null and i.usada_en is null
      and i.baja_en is null and i.expira_en > now()
      and i.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
      and i.correo !~* '@preview\.neuromundi\.com$'
      and d.estado_revision = 'publicado' and not d.baja_solicitada
      and d.reclamada_por is null and not coalesce(d.correo_rebotado, false)
  )
  select q.token, q.correo, q.nombre, q.provider_type, q.sector, q.estado, q.ciudad, q.pais,
         q.ya_contactado_8sep, q.correo_personal, q.orden, q.affiliate_type,
         coalesce(cot ->> 'currency', 'MXN'),
         (cot ->> 'founder_annual')::numeric,
         (cot ->> 'ordinary_annual')::numeric,
         coalesce((cot ->> 'configured')::boolean, false)
  from q, lateral public.registration_quote(q.affiliate_type, q.pais) as cot
  order by q.orden
  limit greatest(1, least(coalesce(p_limit, 25), 200));
$$;

revoke all on function public.directorio_invitaciones_cola_v2(integer) from public;
revoke execute on function public.directorio_invitaciones_cola_v2(integer) from anon, authenticated;
grant execute on function public.directorio_invitaciones_cola_v2(integer) to service_role;

revoke all on function public.directorio_invitaciones_cola_tanda_v2(integer, integer) from public;
revoke execute on function public.directorio_invitaciones_cola_tanda_v2(integer, integer) from anon, authenticated;
grant execute on function public.directorio_invitaciones_cola_tanda_v2(integer, integer) to service_role;
