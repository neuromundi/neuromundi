-- 0125_invitaciones_solo_enviadas.sql
-- El registro de invitaciones del panel debe listar SOLO las que realmente se
-- enviaron (enviada_en not null), no las sembradas/pendientes. Se recrea
-- admin_directorio_invitaciones con ese filtro (misma forma de salida).
-- create or replace conserva la firma (mismas columnas) → no requiere drop.

create or replace function public.admin_directorio_invitaciones()
returns table (
  id uuid,
  nombre text,
  correo text,
  provider_type text,
  estado_geo text,
  ciudad text,
  creada_en timestamptz,
  enviada_en timestamptz,
  abierta_en timestamptz,
  abierta_ultima_en timestamptz,
  aperturas integer,
  usada_en timestamptz,
  baja_en timestamptz,
  cancelada_en timestamptz,
  rebotado boolean,
  expira_en timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select i.id,
         d.nombre,
         i.correo,
         d.provider_type,
         d.estado,
         d.ciudad,
         i.creada_en,
         i.enviada_en,
         i.abierta_en,
         i.abierta_ultima_en,
         i.aperturas,
         i.usada_en,
         i.baja_en,
         i.cancelada_en,
         coalesce(d.correo_rebotado, false),
         i.expira_en
    from public.directorio_invitaciones i
    join public.directorio d on d.id = i.directorio_id
   where public.is_admin()
     and i.enviada_en is not null   -- solo invitaciones realmente enviadas
   order by i.enviada_en desc nulls last
   limit 2000;
$function$;
