-- Lectura para administracion: que fichas invitadas se estan abriendo y cuantas
-- de esas visitas llegan de personas con sesion. Sin esto, las tandas de
-- invitaciones se mandan a ciegas.
create or replace function public.admin_fichas_mas_vistas(p_dias integer default 30, p_limite integer default 100)
returns table(
  ficha_id      uuid,
  nombre        text,
  ciudad        text,
  estado        text,
  pais          text,
  reclamada     boolean,
  vistas        integer,
  vistas_con_sesion integer,
  contactos     integer,
  ultima        timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Solo administracion' using errcode = '42501';
  end if;
  return query
  select d.id,
         d.nombre,
         d.ciudad,
         d.estado,
         d.pais,
         d.reclamada_por is not null,
         count(*) filter (where e.kind = 'view')::int,
         count(*) filter (where e.kind = 'view' and e.viewer_id is not null)::int,
         count(*) filter (where e.kind = 'contact')::int,
         max(e.created_at)
  from public.directorio_eventos e
  join public.directorio d on d.id = e.directorio_id
  where e.created_at >= now() - make_interval(days => greatest(p_dias, 1))
  group by d.id, d.nombre, d.ciudad, d.estado, d.pais, d.reclamada_por
  order by count(*) filter (where e.kind = 'view') desc, max(e.created_at) desc
  limit greatest(p_limite, 1);
end;
$function$;

-- Totales de un vistazo, para la cabecera del panel.
create or replace function public.admin_resumen_de_fichas(p_dias integer default 30)
returns table(fichas_vistas integer, visitas integer, visitas_con_sesion integer, contactos integer)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'Solo administracion' using errcode = '42501';
  end if;
  return query
  select count(distinct e.directorio_id)::int,
         count(*) filter (where e.kind = 'view')::int,
         count(*) filter (where e.kind = 'view' and e.viewer_id is not null)::int,
         count(*) filter (where e.kind = 'contact')::int
  from public.directorio_eventos e
  where e.created_at >= now() - make_interval(days => greatest(p_dias, 1));
end;
$function$;
