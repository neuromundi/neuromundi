-- 0170: la bandeja de exenciones del administrador.
-- Trae lo que exige decisión: solicitudes sin resolver y exenciones que vencen
-- dentro de 60 días o que ya vencieron.

create or replace function public.admin_exenciones(p_estado text default 'pendientes')
returns table (
  id uuid, email text, nombre text, sector text, provider_type text,
  tipo text, folio text, documento text,
  solicitada_en timestamptz, aprobada_en timestamptz, vigente_hasta timestamptz,
  dias int, estado text, rechazo text
) language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  return query
  select p.id, u.email::text, p.full_name, p.sector, p.provider_type,
         p.exencion_tipo, p.exencion_folio, p.exencion_documento,
         p.exencion_solicitada_en, p.exencion_aprobada_en, p.exencion_vigente_hasta,
         case when p.exencion_vigente_hasta is null then null
              else (date_part('day', p.exencion_vigente_hasta - now()))::int end,
         case
           when p.exencion_solicitada_en is not null and p.exencion_aprobada_en is null then 'pendiente'
           when p.exencion_vigente_hasta is not null and p.exencion_vigente_hasta <= now() then 'vencida'
           when p.exencion_vigente_hasta is not null and p.exencion_vigente_hasta <= now() + interval '60 days' then 'por vencer'
           when p.membership_status = 'exempt' then 'vigente'
           else 'sin exencion'
         end,
         p.exencion_rechazo
    from public.profiles p
    left join auth.users u on u.id = p.id
   where p.role = 'provider'
     and (p.exencion_tipo is not null or p.membership_status = 'exempt')
     and (
       p_estado = 'todas'
       or (p_estado = 'pendientes' and (
             (p.exencion_solicitada_en is not null and p.exencion_aprobada_en is null)
          or (p.exencion_vigente_hasta is not null and p.exencion_vigente_hasta <= now() + interval '60 days')))
     )
   order by (p.exencion_solicitada_en is not null and p.exencion_aprobada_en is null) desc,
            p.exencion_vigente_hasta nulls last,
            p.full_name;
end $$;

grant execute on function public.admin_exenciones(text) to authenticated;
grant execute on function public.admin_exencion_resolver(uuid, boolean, text, int) to authenticated;
