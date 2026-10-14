-- 0206b · RPC del panel admin para listar y republicar fichas retiradas.

-- Listado de fichas que HOY estarian retiradas por no haberse confirmado, para
-- que el admin elija cuales republicar. Incluye las ya republicadas a mano.
create or replace function public.admin_fichas_retiradas(p_limit int default 200, p_buscar text default null)
returns table (
  ficha_id uuid, nombre text, provider_type text, sector text,
  estado text, ciudad text, pais text, correo text, sitio_web text, telefono text,
  reclamada_por uuid, publicacion_forzada boolean, publicacion_forzada_en timestamptz,
  publicacion_forzada_nota text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id, d.nombre, d.provider_type, d.sector,
         d.estado, d.ciudad, d.pais, d.correo, d.sitio_web, d.telefono,
         d.reclamada_por, d.publicacion_forzada, d.publicacion_forzada_en,
         d.publicacion_forzada_nota
  from public.directorio d
  where public.is_admin_or_advisor()
    and d.estado_revision = 'publicado'
    and not d.baja_solicitada
    and not (d.reclamada_por is not null and public.cuota_cubierta(d.reclamada_por))
    and (p_buscar is null or btrim(p_buscar) = ''
         or d.nombre ilike '%' || btrim(p_buscar) || '%'
         or coalesce(d.ciudad, '') ilike '%' || btrim(p_buscar) || '%'
         or coalesce(d.estado, '') ilike '%' || btrim(p_buscar) || '%')
  order by d.publicacion_forzada desc, d.nombre
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
$$;

comment on function public.admin_fichas_retiradas(int, text) is
  'Fichas que se retirarian del directorio al vencer el plazo por no estar confirmadas. Solo admin o asesor.';

revoke all on function public.admin_fichas_retiradas(int, text) from public, anon;
grant execute on function public.admin_fichas_retiradas(int, text) to authenticated, service_role;


-- Republicar o volver a retirar una ficha concreta. Deja constancia de quien y cuando.
create or replace function public.admin_republicar_ficha(
  p_ficha uuid, p_republicar boolean default true, p_nota text default null
) returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_uid uuid;
begin
  if not public.is_admin() then
    raise exception 'solo_admin' using errcode = 'insufficient_privilege';
  end if;
  v_uid := auth.uid();

  update public.directorio
     set publicacion_forzada      = coalesce(p_republicar, true),
         publicacion_forzada_por  = case when coalesce(p_republicar, true) then v_uid else null end,
         publicacion_forzada_en   = case when coalesce(p_republicar, true) then now() else null end,
         publicacion_forzada_nota = case when coalesce(p_republicar, true)
                                         then left(coalesce(p_nota, ''), 300) else null end,
         actualizada_en = now()
   where id = p_ficha
     and not baja_solicitada;

  return found;
end
$$;

comment on function public.admin_republicar_ficha(uuid, boolean, text) is
  'Marca o desmarca una ficha para seguir publicada aunque no se haya confirmado. No revive fichas dadas de baja. Solo admin.';

revoke all on function public.admin_republicar_ficha(uuid, boolean, text) from public, anon;
grant execute on function public.admin_republicar_ficha(uuid, boolean, text) to authenticated, service_role;
