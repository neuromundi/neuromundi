-- Bandeja de revisión de artículos, calcada de la de eventos para que usted no
-- aprenda dos mecánicas: la propuesta con el nombre de quien la manda, que es
-- lo primero que hace falta para decidir.
create or replace function public.admin_contenido_en_revision(p_estado text default 'pendiente')
returns table(
  id uuid, title text, type text, excerpt text, body text,
  external_url text, cover_url text, topic text, keywords text[], sections text[],
  revision text, nota_admin text, is_published boolean,
  created_at timestamptz, revisada_en timestamptz,
  autor text, member_no bigint, autor_id uuid
)
language sql stable security definer set search_path to 'public'
as $f$
  select c.id, c.title, c.type, c.excerpt, c.body,
         c.external_url, c.cover_url, c.topic, c.keywords, c.sections,
         c.revision, c.nota_admin, c.is_published,
         c.created_at, c.revisada_en,
         coalesce(p.business_name, p.full_name), p.member_no, p.id
    from public.content_posts c
    left join public.profiles p on p.id = c.author_id
   where public.is_admin()
     and (p_estado = 'todas' or c.revision = p_estado)
   order by c.revision = 'pendiente' desc, c.created_at desc
   limit 300;
$f$;

revoke all on function public.admin_contenido_en_revision(text) from public, anon;
grant execute on function public.admin_contenido_en_revision(text) to authenticated;

-- Cuántos esperan: para el contador de la pestaña.
create or replace function public.admin_contenido_pendiente()
returns integer language sql stable security definer set search_path to 'public'
as $f$
  select case when public.is_admin()
              then (select count(*)::int from public.content_posts where revision = 'pendiente')
              else 0 end;
$f$;

revoke all on function public.admin_contenido_pendiente() from public, anon;
grant execute on function public.admin_contenido_pendiente() to authenticated;
