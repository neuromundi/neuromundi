-- ============================================================================
-- 0312 — El auditor vigila los tokens de invitacion y revisa cada dos horas
--
-- Dos huecos que el arranque dejo a la vista:
--
--  1. El auditor no miraba si las fichas del plan de tandas TIENEN token de
--     invitacion. El 19 de octubre faltaban 746 de 1,122, y como la cola de
--     envio cruza las dos tablas con un join cerrado, esas fichas no salian,
--     no fallaban y nadie se enteraba. Ahora hay un control para eso, en
--     gravedad alta, y otro que avisa si una ficha del plan quedo fuera de la
--     cola por cualquier otro motivo. Son los controles 13 y 14.
--
--  2. Corria UNA vez al dia, a las 07:52 CDMX. Un fallo a las 10:00 se habria
--     descubierto 22 horas despues. Pasa a cada dos horas: el aviso solo se
--     manda cuando un control APARECE o CRECE, asi que mas frecuencia no
--     significa mas ruido.
--
-- AVISO sobre como llega el aviso: `notify_admins` inserta en `notifications`,
-- y un disparador manda ademas una notificacion al telefono. Medido el 19 de
-- octubre: hay CERO suscripciones de notificaciones, incluida la cuenta de
-- administracion. Hasta que se instale la aplicacion y se acepten las
-- notificaciones en esa cuenta, el aviso solo se ve entrando al panel.
-- ============================================================================

create or replace function public.auditoria_plataforma()
returns table(clave text, gravedad text, hallazgo text, cantidad integer)
language sql stable security definer set search_path to 'public'
as $function$
  select 'alta_sin_pais','alta','Perfiles con reglamento aceptado pero sin pais: el alta no termino de guardarse',count(*)::int
    from public.profiles where rules_version_accepted is not null and coalesce(country,'')='' and role <> 'admin'
  union all
  select 'registro_abandonado','media','Cuentas de mas de 2 dias que nunca completaron su registro',count(*)::int
    from public.profiles where rules_version_accepted is null and created_at < now() - interval '2 days'
  union all
  select 'apertura_sin_envio','media','Invitaciones abiertas que nunca fueron enviadas',count(*)::int
    from public.directorio_invitaciones where abierta_en is not null and enviada_en is null
  union all
  select 'usada_sin_dueno','alta','Invitaciones marcadas como usadas cuya ficha sigue sin reclamar',count(*)::int
    from public.directorio_invitaciones i join public.directorio d on d.id=i.directorio_id
   where i.usada_en is not null and d.reclamada_por is null
  union all
  select 'ficha_sin_perfil','alta','Fichas reclamadas por una cuenta que ya no existe',count(*)::int
    from public.directorio d where d.reclamada_por is not null
     and not exists (select 1 from public.profiles p where p.id=d.reclamada_por)
  union all
  select 'articulos_atascados','media','Articulos esperando revision desde hace mas de 3 dias',count(*)::int
    from public.content_posts where revision='pendiente' and created_at < now() - interval '3 days'
  union all
  select 'publicado_sin_cuota','alta','Perfiles publicados en el directorio con la membresia vencida',count(*)::int
    from public.profiles where is_published and role='provider'
     and membership_status not in ('active','exempt')
     and (membership_paid_until is null or membership_paid_until <= now())
  union all
  select 'ficha_sin_area','media','Fichas del directorio publicadas sin area asignada',count(*)::int
    from public.directorio where estado_revision='publicado' and coalesce(array_length(sections,1),0)=0
  union all
  select 'visitas_mudas','alta','Fichas cuya invitacion se abrio y la visita no quedo contada',
         public.auditoria_visitas_mudas()
  union all
  select 'rebotado_en_plan','media','Fichas con el correo rebotado que siguen en el plan de invitaciones',count(*)::int
    from public.directorio_plan_invitacion p join public.directorio d on d.id=p.ficha_id
   where coalesce(d.correo_rebotado,false)
  union all
  select 'plan_sin_correo','alta','Fichas en el plan de invitaciones que no tienen correo',count(*)::int
    from public.directorio_plan_invitacion p join public.directorio d on d.id=p.ficha_id
   where coalesce(d.correo,'')=''
  union all
  -- NUEVO: sin token no hay envio posible, y el silencio era total.
  select 'plan_sin_token','alta','Fichas del plan de invitaciones que no tienen token: nunca se podrian enviar',count(*)::int
    from public.directorio_plan_invitacion p
   where not exists (select 1 from public.directorio_invitaciones i where i.directorio_id = p.ficha_id)
  union all
  -- NUEVO: la ficha tiene token pero la cola de su tanda no la devuelve, asi
  -- que tampoco se enviaria. Cubre cualquier motivo, no solo el token.
  select 'plan_fuera_de_cola','media','Fichas del plan que su tanda no devuelve en la cola de envio',count(*)::int
    from public.directorio_plan_invitacion p
    join public.directorio d on d.id = p.ficha_id
    join public.directorio_invitaciones i on i.directorio_id = p.ficha_id
   where i.enviada_en is null and i.cancelada_en is null and i.usada_en is null and i.baja_en is null
     and ( d.estado_revision <> 'publicado'
        or d.baja_solicitada
        or d.reclamada_por is not null
        or coalesce(d.correo_rebotado,false)
        or i.correo !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' )
  union all
  select 'producto_sin_precio','media','Productos activos y aprobados que no tienen precio',count(*)::int
    from public.products where is_active and status='approved' and price is null;
$function$;

revoke all on function public.auditoria_plataforma() from public, anon, authenticated;

-- De una vez al dia a cada dos horas.
select cron.alter_job((select jobid from cron.job where jobname='nm-auditoria-diaria'), schedule := '52 */2 * * *');
