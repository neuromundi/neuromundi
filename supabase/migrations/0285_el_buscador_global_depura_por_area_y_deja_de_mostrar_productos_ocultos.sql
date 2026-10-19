-- Dos cosas, en la misma función porque es la misma consulta:
--
-- 1) El buscador global (/buscar) no podía depurar por las tres áreas de
--    Neuromundi. Ahora devuelve el área de cada resultado —de la publicación,
--    del prestador, de la ficha del directorio o del producto— y la pantalla
--    filtra con ella.
--
-- 2) DEFECTO: la rama de productos no comprobaba is_active ni status. La
--    tienda sólo muestra productos activos y aprobados, pero el buscador
--    global los mostraba todos, así que un producto que el oferente había
--    ocultado, o que todavía no se aprobaba, era alcanzable desde /buscar.
--    Queda con las mismas condiciones que la tienda.
--
-- Nombre nuevo porque cambiar el RETURNS TABLE obliga a borrar la función
-- anterior, y el borrado de funciones por esta vía se queda colgado.
-- search_all(text) queda sin uso y se retira en la limpieza pendiente.
create or replace function public.search_all_con_areas(q text)
returns table(kind text, id uuid, title text, subtitle text, url text, sections text[])
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $f$
  with term as (select lower(btrim(q)) as q, '%' || lower(btrim(q)) || '%' as p)
  select s.kind, s.id, s.title, s.subtitle, s.url, s.sections
  from (
    select 'post'::text as kind, cp.id, cp.title,
           coalesce(array_to_string(cp.keywords, ', '), '') as subtitle,
           case when cp.type = 'link' then cp.external_url else '/contenido/' || cp.id::text end as url,
           cp.sections,
           greatest(similarity(lower(cp.title), t.q),
                    case when lower(cp.title) like t.p then 0.45 else 0 end) as score,
           false as founder, false as donor
    from public.content_posts cp, term t
    where cp.is_published
      and (lower(cp.title) like t.p or lower(cp.title) % t.q
           or exists (select 1 from unnest(cp.keywords) k where lower(k) like t.p or lower(k) % t.q))
    union all
    select 'provider'::text, p.id, coalesce(p.business_name, p.full_name),
           coalesce(p.services_offered, ''), '/proveedor/' || p.id::text,
           coalesce(p.sections, '{}'::text[]),
           greatest(similarity(lower(coalesce(p.business_name, p.full_name)), t.q),
                    similarity(lower(coalesce(p.services_offered, '')), t.q),
                    case when lower(coalesce(p.business_name, p.full_name)) like t.p then 0.45 else 0 end) as score,
           public.is_founder(p.id) as founder, public.is_donor(p.id) as donor
    from public.profiles p, term t
    where p.role = 'provider' and p.is_published and public.is_member_active(p.id)
      and (lower(coalesce(p.business_name, p.full_name)) like t.p
           or lower(coalesce(p.services_offered, '')) like t.p
           or lower(coalesce(p.business_name, p.full_name)) % t.q
           or lower(coalesce(p.services_offered, '')) % t.q)
    union all
    select 'provider'::text, d.id, d.nombre,
           coalesce(d.especializacion, ''), '/proveedor/' || d.id::text,
           coalesce(d.sections, '{}'::text[]),
           greatest(similarity(lower(d.nombre), t.q),
                    similarity(lower(coalesce(d.especializacion, '')), t.q),
                    case when lower(d.nombre) like t.p then 0.45 else 0 end) as score,
           false as founder, false as donor
    from public.directorio d, term t
    where d.estado_revision = 'publicado'
      and not d.baja_solicitada
      and d.reclamada_por is null
      and not exists (select 1 from public.profiles p
                       where p.id = d.id and p.is_published and p.role = 'provider')
      and (lower(d.nombre) like t.p or lower(d.nombre) % t.q
           or lower(coalesce(d.especializacion, '')) like t.p
           or lower(coalesce(d.especializacion, '')) % t.q)
    union all
    select 'product'::text, pr.id, pr.name, coalesce(pr.description, ''), '/proveedor/' || pr.vendor_id::text,
           pr.sections,
           greatest(similarity(lower(pr.name), t.q),
                    case when lower(pr.name) like t.p then 0.45 else 0 end) as score,
           false as founder, false as donor
    from public.products pr, term t
    where pr.is_active
      and pr.status = 'approved'
      and pr.price is not null
      and (lower(pr.name) like t.p or lower(coalesce(pr.description, '')) like t.p or lower(pr.name) % t.q)
  ) s
  order by round(s.score::numeric, 1) desc,
           s.founder desc,
           s.donor desc,
           s.score desc,
           s.title asc
  limit 50;
$f$;

-- El buscador global es público, igual que la función anterior.
grant execute on function public.search_all_con_areas(text) to anon, authenticated;
