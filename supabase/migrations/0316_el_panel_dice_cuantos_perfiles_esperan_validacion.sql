-- Nada en el panel decia cuantos perfiles estan esperando una decision del
-- administrador: habia que entrar a Moderacion y a Exenciones y contar a ojo.
-- Con las invitaciones saliendo, esa cifra crece sin que nadie la vea.
-- Devuelve UNA fila, solo para administradores.
create or replace function public.admin_pendientes_de_validacion()
returns table(
  sin_filtro_cero bigint,
  sin_publicar bigint,
  documentos_por_revisar bigint,
  documento_mas_antiguo timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    count(*) filter (where p.role = 'provider' and coalesce(p.is_verified, false) = false),
    count(*) filter (where p.role = 'provider' and coalesce(p.is_published, false) = false),
    count(*) filter (where p.org_doc_status = 'pending'),
    min(p.org_doc_submitted_at) filter (where p.org_doc_status = 'pending')
  from public.profiles p
  where public.is_admin();
$$;

revoke all on function public.admin_pendientes_de_validacion() from anon;
grant execute on function public.admin_pendientes_de_validacion() to authenticated;
