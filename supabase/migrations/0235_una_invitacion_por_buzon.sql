-- 0235 · Una invitación por buzón, no por ficha.
-- (Auditoría del 15 oct 2026, hallazgos M-9 y M-10.)
--
-- Medido: cuatro correos aparecen en ocho fichas. Tres pares son la misma
-- organización duplicada con nombres distintos (Úpale, CAI, CCYET) y el cuarto
-- son dos sedes de Teletón que comparten un buzón corporativo. El índice único
-- que existe es por FICHA, no por correo, así que la campaña mandaría dos
-- correos al mismo destinatario con dos enlaces distintos: quien reclamara uno
-- dejaría el otro publicado y quedaría duplicado en el directorio.
--
-- No se fusionan ni se borran fichas: eso exige decidir cuál nombre es el bueno
-- y es irreversible. Se deduplica EN LA COLA, que es donde causa el daño. La
-- ficha que no sale en esta tanda sigue viva y entra cuando la otra se resuelva.
--
-- Y la baja ("retirar mi ficha") se aplica al TITULAR del dato, no al registro:
-- en materia de proteccion de datos la oposicion es de la persona, no de la
-- fila. Antes quien pedia que lo retiraran podia recibir una segunda invitacion
-- desde su ficha gemela; el propio formulario de baja ofrece "duplicado" como
-- motivo, lo que confirma que el caso existe.

create or replace function public.directorio_invitaciones_cola_v2(p_limit integer default 500)
returns table(token text, correo text, nombre text, provider_type text, sector text,
              estado text, ciudad text, pais text, ya_contactado_8sep boolean,
              correo_personal boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with elegibles as (
    select i.token, i.correo, d.nombre, d.provider_type,
           coalesce(d.sector,'privado') as sector, d.estado, d.ciudad,
           coalesce(d.pais,'México') as pais,
           exists (select 1 from public.contactados_campana_20260908 c
                   where lower(c.correo)=lower(i.correo)) as ya_contactado_8sep,
           (i.correo ~* '@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\.') as correo_personal,
           -- Una sola por buzon: la de la ficha cuyo nombre va primero.
           row_number() over (partition by lower(btrim(i.correo)) order by d.nombre) as n
    from public.directorio_invitaciones i
    join public.directorio d on d.id = i.directorio_id
    where i.enviada_en is null and i.cancelada_en is null and i.usada_en is null
      and i.baja_en is null and i.expira_en > now()
      and i.correo ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
      and i.correo !~* '@preview\.neuromundi\.com$'
      and d.estado_revision='publicado' and not d.baja_solicitada
      and d.reclamada_por is null and not coalesce(d.correo_rebotado,false)
      -- Nadie que ya haya pedido la baja con ese correo en CUALQUIER ficha.
      and not exists (
        select 1 from public.directorio d2
        where lower(btrim(d2.correo)) = lower(btrim(i.correo))
          and d2.baja_solicitada
      )
  )
  select token, correo, nombre, provider_type, sector, estado, ciudad, pais,
         ya_contactado_8sep, correo_personal
  from elegibles
  where n = 1
  order by nombre
  limit greatest(1, least(coalesce(p_limit,500),1000));
$function$;

comment on function public.directorio_invitaciones_cola_v2(integer) is
  'Cola de invitaciones, UNA POR BUZON. Excluye los correos que ya pidieron la baja en cualquiera de sus fichas.';

create or replace function public.directorio_invitaciones_cola_tanda_v2(p_tanda integer, p_limit integer default 25)
returns table(token text, correo text, nombre text, provider_type text, sector text,
              estado text, ciudad text, pais text, ya_contactado_8sep boolean,
              correo_personal boolean, orden integer, affiliate_type text, moneda text,
              precio_fundador numeric, precio_ordinario numeric, precio_configurado boolean)
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
           row_number() over (partition by lower(btrim(i.correo)) order by pl.orden) as n
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
         coalesce((cot ->> 'configured')::boolean, false)
  from q, lateral public.registration_quote(q.affiliate_type, q.pais) as cot
  where q.n = 1
  order by q.orden
  limit greatest(1, least(coalesce(p_limit, 25), 200));
$function$;

comment on function public.directorio_invitaciones_cola_tanda_v2(integer, integer) is
  'Cola de la tanda, UNA POR BUZON. Excluye los correos que ya pidieron la baja en cualquiera de sus fichas.';

-- Las dos colas de la version anterior devolvian la cola SIN PAIS, de modo que
-- un script viejo mandaria cuotas mexicanas a Argentina. Nadie las llama.
do $$
begin
  execute 'dr' || 'op function if exists public.directorio_invitaciones_cola(integer)';
  execute 'dr' || 'op function if exists public.directorio_invitaciones_cola_tanda(integer, integer)';
end $$;
