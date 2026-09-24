-- 0126_invitaciones_incluir_contactadas.sql
-- El registro debe incluir TODAS las invitaciones realmente enviadas. Además de
-- las marcadas con enviada_en (envíos por la Edge Function), incorpora las de la
-- campaña previa del 8-sep, cuyo envío quedó registrado en la tabla
-- contactados_campana_20260908 (columna enviado_el) y NO en enviada_en.
-- La fecha de envío mostrada = coalesce(enviada_en, enviado_el de la campaña).
-- Sigue excluyendo las nunca enviadas. Misma forma de salida (no requiere drop).

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
         coalesce(i.enviada_en, c.enviado_el::timestamptz) as enviada_en,
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
    left join lateral (
      select max(cc.enviado_el) as enviado_el
        from public.contactados_campana_20260908 cc
       where lower(cc.correo) = lower(i.correo)
    ) c on true
   where public.is_admin()
     and (i.enviada_en is not null or c.enviado_el is not null)  -- solo realmente enviadas
   order by coalesce(i.enviada_en, c.enviado_el::timestamptz) desc nulls last
   limit 2000;
$function$;
