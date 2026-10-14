-- 0207b · Fichas publicadas sin correo, para la captura telefonica. Trae el
-- telefono y el sitio web, que es con lo que el admin trabaja al llamar.

create or replace function public.admin_fichas_sin_correo(p_limit int default 100, p_buscar text default null)
returns table (
  ficha_id uuid, nombre text, provider_type text, sector text,
  estado text, ciudad text, pais text, telefono text, sitio_web text,
  especializacion text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id, d.nombre, d.provider_type, coalesce(d.sector, 'privado'),
         d.estado, d.ciudad, coalesce(d.pais, 'México'), d.telefono, d.sitio_web,
         d.especializacion
  from public.directorio d
  where public.is_admin_or_advisor()
    and d.estado_revision = 'publicado'
    and not d.baja_solicitada
    and d.reclamada_por is null
    and coalesce(btrim(d.correo), '') = ''
    and (p_buscar is null or btrim(p_buscar) = ''
         or d.nombre ilike '%' || btrim(p_buscar) || '%'
         or coalesce(d.ciudad, '') ilike '%' || btrim(p_buscar) || '%'
         or coalesce(d.estado, '') ilike '%' || btrim(p_buscar) || '%'
         or coalesce(d.telefono, '') ilike '%' || btrim(p_buscar) || '%')
  -- primero las que SI tienen telefono: son las unicas llamables
  order by (coalesce(btrim(d.telefono), '') = ''), d.nombre
  limit greatest(1, least(coalesce(p_limit, 100), 1000));
$$;

comment on function public.admin_fichas_sin_correo(int, text) is
  'Fichas publicadas sin correo, ordenadas poniendo primero las que tienen telefono. Para la captura telefonica. Solo admin o asesor.';

revoke all on function public.admin_fichas_sin_correo(int, text) from public, anon;
grant execute on function public.admin_fichas_sin_correo(int, text) to authenticated, service_role;
