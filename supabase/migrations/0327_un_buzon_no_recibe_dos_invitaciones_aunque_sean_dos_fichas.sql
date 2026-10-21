-- UN BUZON, UNA INVITACION (21 oct 2026).
--
-- La cola deduplicaba por correo con
--   row_number() over (partition by lower(btrim(i.correo)) order by pl.orden)
-- y se quedaba con n = 1. Pero ese conteo SOLO ve las filas de la tanda que se
-- esta pidiendo, asi que dos fichas con el mismo buzon en tandas distintas
-- recibian las dos.
--
-- No es hipotetico; ya paso. Medido el 21 de octubre:
--   contacto@ccyet.mx              -> tanda 1 (20 oct 13:07) y tanda 2 (20 oct 15:30)
--   recepcion@clinicainfantil.com.mx -> tanda 1 (20 oct 13:07) y tanda 2 (20 oct 15:30)
--   cancelaciones@teleton.org.mx   -> tanda 49, dos veces (20 oct y 21 oct)
--
-- La guarda nueva es global, no por tanda: si el buzon YA recibio cualquier
-- invitacion, la ficha no vuelve a entrar en ninguna cola. La deduplicacion
-- dentro de la tanda se conserva, porque resuelve el otro caso (dos fichas con
-- el mismo buzon que coinciden en la MISMA tanda y ninguna ha salido aun).
--
-- Efecto colateral deliberado: una organizacion con dos fichas recibe UNA sola
-- invitacion, la de la ficha que salga primero. Si resultan ser dos entidades
-- distintas que comparten buzon institucional —como los CRIT de Teleton—, la
-- segunda se queda sin correo y hay que darle una direccion propia. Es
-- preferible a escribirle dos veces a la misma persona.
create or replace function public.directorio_invitaciones_cola_tanda_v3(p_tanda integer, p_limit integer default 25)
returns table(token text, correo text, nombre text, provider_type text, sector text, estado text, ciudad text, pais text, ya_contactado_8sep boolean, correo_personal boolean, orden integer, affiliate_type text, moneda text, precio_fundador numeric, precio_ordinario numeric, precio_configurado boolean, precio_desde boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with q as (
    select i.token, i.correo, d.nombre, d.provider_type,
           coalesce(d.sector,'privado') as sector, d.estado, d.ciudad,
           coalesce(d.pais,'México') as pais,
           exists (select 1 from public.contactados_campana_20260908 c
                   where lower(c.correo) = lower(i.correo)) as ya_contactado_8sep,
           (i.correo ~* '@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\.') as correo_personal,
           pl.orden,
           public.ficha_affiliate_type(d.provider_type, d.profession) as affiliate_type,
           -- No sabemos si es medico: ni la ficha trae profesion ni el tipo la
           -- implica. Entonces se cotiza como 'specialist' (la mas barata de
           -- las dos clases) y el correo dice "desde".
           (d.provider_type = 'service_provider'
            and public.is_medical_profession(d.profession) is null) as sin_profesion,
           row_number() over (partition by lower(btrim(i.correo)) order by pl.orden) as n
    from public.directorio_plan_invitacion pl
    join public.directorio d on d.id = pl.ficha_id
    join public.directorio_invitaciones i on i.directorio_id = pl.ficha_id
    where pl.tanda = p_tanda
      and i.enviada_en is null and i.cancelada_en is null and i.usada_en is null
      and i.baja_en is null
      and i.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
      and i.correo !~* '@preview\.neuromundi\.com$'
      and d.estado_revision = 'publicado' and not d.baja_solicitada
      and d.reclamada_por is null and not coalesce(d.correo_rebotado, false)
      -- 0327: el buzon no ha recibido NINGUNA invitacion, de ninguna tanda.
      and not exists (
        select 1 from public.directorio_invitaciones j
        where lower(btrim(j.correo)) = lower(btrim(i.correo))
          and j.enviada_en is not null
      )
      and not exists (
        select 1 from public.directorio d2
        where lower(btrim(d2.correo)) = lower(btrim(i.correo))
          and d2.baja_solicitada
      )
  )
  select q.token, q.correo, q.nombre, q.provider_type, q.sector, q.estado, q.ciudad, q.pais,
         q.ya_contactado_8sep, q.correo_personal, q.orden, q.affiliate_type,
         coalesce(cot ->> 'currency', 'MXN'),
         (cot ->> 'founder_annual')::numeric,
         (cot ->> 'ordinary_annual')::numeric,
         coalesce((cot ->> 'configured')::boolean, false),
         coalesce((cot ->> 'is_from')::boolean, false)
  from q, lateral public.registration_quote(
         case when q.sin_profesion then 'specialist' else q.affiliate_type end,
         q.pais) as cot
  where q.n = 1
  order by q.orden
  limit greatest(1, least(coalesce(p_limit, 25), 200));
$function$;
