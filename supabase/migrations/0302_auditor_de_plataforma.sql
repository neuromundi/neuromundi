-- AUDITOR DE PLATAFORMA
-- Consolida lo aplicado en la base como versiones 0302 a 0306 el 19 de octubre
-- de 2026 (se afino en caliente mientras se probaba contra datos reales; este
-- archivo es el estado final, que reproduce lo mismo desde cero).
--
-- Por que existe: los defectos de ese dia no se encontraron buscando, se
-- encontraron tropezando con ellos, y todos habian dejado rastro medible. Esto
-- revisa, solo y a diario, INVARIANTES: cosas que por definicion no deberian
-- pasar nunca. Cada comprobacion devuelve un numero exacto; ninguna opina. Si
-- algo aparece o crece respecto al dia anterior, avisa; si no, calla, porque un
-- vigia que grita todos los dias se deja de leer a la semana.

create table if not exists public.auditoria_historial (
  clave      text primary key,
  cantidad   integer not null,
  corrida_en timestamptz not null default now()
);
alter table public.auditoria_historial enable row level security;
revoke all on public.auditoria_historial from anon, authenticated;

-- Abrir la invitacion significa haber aterrizado en la ficha, luego la visita
-- TIENE que estar contada. Solo mira aperturas posteriores a la creacion del
-- contador, para no quejarse de lo que ocurrio antes de que existiera.
create or replace function public.auditoria_visitas_mudas()
returns integer
language sql stable security definer set search_path to 'public'
as $function$
  select count(*)::int
    from public.directorio_invitaciones i
   where i.abierta_en > greatest(now() - interval '7 days', timestamptz '2026-10-19 21:00+00')
     and not exists (
       select 1 from public.directorio_eventos e
        where e.directorio_id = i.directorio_id
          and e.created_at >= i.abierta_en - interval '5 minutes'
     );
$function$;

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
  select 'producto_sin_precio','media','Productos activos y aprobados que no tienen precio',count(*)::int
    from public.products where is_active and status='approved' and price is null;
$function$;

-- Compara con la corrida anterior y avisa SOLO de lo que aparecio o crecio.
-- Devuelve el texto del aviso (o null si no habia nada que decir), para poder
-- ejecutarlo a mano y ver que diria sin esperar al dia siguiente.
create or replace function public.auditoria_diaria()
returns text
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_lineas text[] := '{}';
  v_texto  text;
  r        record;
  v_antes  integer;
begin
  for r in select * from public.auditoria_plataforma() loop
    select cantidad into v_antes from public.auditoria_historial h where h.clave = r.clave;

    if r.cantidad > 0 and (v_antes is null or r.cantidad > v_antes) then
      v_lineas := v_lineas || (
        case r.gravedad when 'alta' then '[GRAVE] ' else '' end
        || r.hallazgo || ': ' || r.cantidad
        || case when v_antes is not null then ' (antes ' || v_antes || ')' else '' end
      );
    end if;

    insert into public.auditoria_historial (clave, cantidad, corrida_en)
    values (r.clave, r.cantidad, now())
    on conflict (clave) do update set cantidad = excluded.cantidad, corrida_en = excluded.corrida_en;
  end loop;

  if array_length(v_lineas, 1) is null then
    return null;
  end if;

  v_texto := array_to_string(v_lineas, E'\n');

  perform public.notify_admins(
    'auditoria',
    'La revision diaria encontro algo',
    v_texto,
    jsonb_build_object('lineas', to_jsonb(v_lineas))
  );

  return v_texto;
end;
$function$;

-- Cada manana a las 07:52 de Ciudad de Mexico (13:52 UTC).
select cron.schedule('nm-auditoria-diaria', '52 13 * * *', 'select public.auditoria_diaria();');
