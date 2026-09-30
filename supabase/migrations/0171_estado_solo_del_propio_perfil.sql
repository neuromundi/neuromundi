-- 0171: estado_publicacion, estado_exencion y puede_publicar son SECURITY
-- DEFINER y estaban concedidas a authenticated sin comprobar de quién es el
-- perfil consultado. Cualquier sesión podía preguntar por el id de otro y saber
-- si tiene la cuota cubierta, qué campos le faltan o el folio de su exención.
-- Ahora solo responden sobre el perfil propio, salvo al administrador.

create or replace function public.estado_publicacion(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if p_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'solo el propio perfil';
  end if;
  return (
    select jsonb_build_object(
      'completo',    public.perfil_completo(p_id),
      'faltantes',   (
          select coalesce(jsonb_agg(f), '[]'::jsonb) from (
            select 'foto'   as f from public.profiles p where p.id=p_id and btrim(coalesce(p.avatar_url,''))=''
            union all
            select 'descripcion' from public.profiles p where p.id=p_id and btrim(coalesce(p.bio,''))=''
            union all
            select 'telefono'    from public.profiles p where p.id=p_id and btrim(coalesce(p.phone,''))=''
            union all
            select 'pais'        from public.profiles p where p.id=p_id and btrim(coalesce(p.country,''))=''
          ) q),
      'cuota',       public.cuota_cubierta(p_id),
      'exento',      coalesce((select p.membership_status = 'exempt' from public.profiles p where p.id=p_id), false),
      'publicado',   coalesce((select p.is_published      from public.profiles p where p.id=p_id), false),
      'suspendido',  coalesce((select p.suspended_at is not null from public.profiles p where p.id=p_id), false),
      'puede',       public.puede_publicar(p_id)
    )
  );
end $$;

create or replace function public.estado_exencion(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if p_id is distinct from auth.uid() and not public.is_admin() then
    raise exception 'solo el propio perfil';
  end if;
  return (
    select jsonb_build_object(
      'aplica',     coalesce(public.exento_de_cuota(p.sector, p.provider_type), false),
      'sector',     p.sector,
      'tipo',       p.exencion_tipo,
      'folio',      p.exencion_folio,
      'documento',  p.exencion_documento,
      'solicitada', p.exencion_solicitada_en,
      'aprobada',   p.exencion_aprobada_en,
      'vence',      p.exencion_vigente_hasta,
      'vencida',    (p.exencion_vigente_hasta is not null and p.exencion_vigente_hasta <= now()),
      'permanente', (p.exencion_tipo in ('publico','empresa')),
      'rechazo',    p.exencion_rechazo,
      'dias',       case when p.exencion_vigente_hasta is null then null
                         else greatest(0, (date_part('day', p.exencion_vigente_hasta - now()))::int) end
    ) from public.profiles p where p.id = p_id
  );
end $$;

revoke execute on function public.puede_publicar(uuid) from authenticated, anon, public;
revoke execute on function public.cumple_requisitos(uuid) from authenticated, anon, public;
revoke execute on function public.perfil_completo(uuid) from authenticated, anon, public;
revoke execute on function public.cuota_cubierta(uuid) from authenticated, anon, public;

grant execute on function public.estado_publicacion(uuid) to authenticated;
grant execute on function public.estado_exencion(uuid) to authenticated;
