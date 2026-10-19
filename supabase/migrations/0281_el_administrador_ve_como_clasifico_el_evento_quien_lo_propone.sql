-- El miembro ya puede decir a qué área pertenece su evento, así que el
-- administrador tiene que VERLO antes de aprobar: si lo aprueba a ciegas, una
-- clasificación equivocada queda publicada y el evento sale en el filtro que
-- no le toca. Se devuelven también info_url, timezone y hora_confirmada, que
-- el prestador ya podía llenar y la bandeja no mostraba.
--
-- Va con nombre nuevo porque cambiar el RETURNS TABLE obliga a borrar la
-- función anterior, y el borrado de funciones por esta vía se queda colgado.
-- admin_eventos_en_revision(text) queda sin uso y se retira en la limpieza
-- pendiente, junto con founders_wall(text).
create or replace function public.admin_eventos_en_revision_con_areas(p_estado text default 'pendiente')
returns table(
  id uuid, title text, description text, category text,
  is_online boolean, online_url text, country text, city text, venue text,
  starts_at timestamptz, ends_at timestamptz, cover_url text,
  revision text, nota_admin text, is_published boolean,
  created_at timestamptz, revisada_en timestamptz,
  prestador text, member_no bigint, prestador_id uuid,
  info_url text, timezone text, hora_confirmada boolean, sections text[]
)
language sql
stable
security definer
set search_path to 'public'
as $f$
  select e.id, e.title, e.description, e.category,
         e.is_online, e.online_url, e.country, e.city, e.venue,
         e.starts_at, e.ends_at, e.cover_url,
         e.revision, e.nota_admin, e.is_published,
         e.created_at, e.revisada_en,
         coalesce(p.business_name, p.full_name), p.member_no, p.id,
         e.info_url, e.timezone, e.hora_confirmada, e.sections
    from public.events e
    left join public.profiles p on p.id = e.created_by
   where public.is_admin()
     and e.created_by is not null
     and (p_estado = 'todas' or e.revision = p_estado)
   order by e.revision = 'pendiente' desc, e.created_at desc
   limit 300;
$f$;

revoke all on function public.admin_eventos_en_revision_con_areas(text) from public, anon;
grant execute on function public.admin_eventos_en_revision_con_areas(text) to authenticated;
