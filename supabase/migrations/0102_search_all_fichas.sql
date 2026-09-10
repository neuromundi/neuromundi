-- ============================================================================
-- 0102 · search_all incluye las fichas del directorio (BORRADOR — revisar)
--
-- La búsqueda global /buscar (search_all) solo leía de `profiles` (perfiles con
-- cuenta). Como el directorio hoy son ~700 fichas SIN cuenta (public.directorio)
-- y 0 perfiles publicados, /buscar devolvía prácticamente nada mientras el
-- directorio sí las mostraba. Misma clase de incoherencia que el bug del perfil
-- en blanco (useProviderProfile leía profiles en vez de directorio_publico).
--
-- Se añade una rama UNION ALL que lee de public.directorio con EXACTAMENTE el
-- mismo predicado de visibilidad que la rama de fichas de la vista
-- directorio_publico (publicado, sin baja, no reclamada, y sin perfil publicado
-- que la sombree), enlazando a /proveedor/:id (que ya resuelve fichas vía la
-- vista tras el fix de useProviderProfile).
--
-- Firma sin cambios (language sql, misma tabla de retorno) → create or replace.
-- Idempotente.
-- ============================================================================

create or replace function public.search_all(q text)
returns table(kind text, id uuid, title text, subtitle text, url text)
language sql
stable security definer
set search_path to 'public', 'extensions'
as $function$
  with term as (select lower(btrim(q)) as q, '%' || lower(btrim(q)) || '%' as p)
  select s.kind, s.id, s.title, s.subtitle, s.url
  from (
    select 'post'::text as kind, cp.id, cp.title,
           coalesce(array_to_string(cp.keywords, ', '), '') as subtitle,
           case when cp.type = 'link' then cp.external_url else '/contenido/' || cp.id::text end as url,
           greatest(similarity(lower(cp.title), t.q),
                    case when lower(cp.title) like t.p then 0.45 else 0 end) as score
    from public.content_posts cp, term t
    where cp.is_published
      and (lower(cp.title) like t.p or lower(cp.title) % t.q
           or exists (select 1 from unnest(cp.keywords) k where lower(k) like t.p or lower(k) % t.q))
    union all
    select 'provider'::text, p.id, coalesce(p.business_name, p.full_name),
           coalesce(p.services_offered, ''), '/proveedor/' || p.id::text,
           greatest(similarity(lower(coalesce(p.business_name, p.full_name)), t.q),
                    similarity(lower(coalesce(p.services_offered, '')), t.q),
                    case when lower(coalesce(p.business_name, p.full_name)) like t.p then 0.45 else 0 end)
             + case when public.is_founder(p.id) then 0.6 else 0 end as score
    from public.profiles p, term t
    where p.role = 'provider' and p.is_published and public.is_member_active(p.id)
      and (lower(coalesce(p.business_name, p.full_name)) like t.p
           or lower(coalesce(p.services_offered, '')) like t.p
           or lower(coalesce(p.business_name, p.full_name)) % t.q
           or lower(coalesce(p.services_offered, '')) % t.q)
    union all
    -- 0102: fichas del directorio (sin cuenta). Mismo predicado que la rama
    -- de fichas de directorio_publico.
    select 'provider'::text, d.id, d.nombre,
           coalesce(d.especializacion, ''), '/proveedor/' || d.id::text,
           greatest(similarity(lower(d.nombre), t.q),
                    similarity(lower(coalesce(d.especializacion, '')), t.q),
                    case when lower(d.nombre) like t.p then 0.45 else 0 end) as score
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
           greatest(similarity(lower(pr.name), t.q),
                    case when lower(pr.name) like t.p then 0.45 else 0 end)
    from public.products pr, term t
    where lower(pr.name) like t.p or lower(coalesce(pr.description, '')) like t.p or lower(pr.name) % t.q
  ) s
  order by s.score desc, s.title asc
  limit 50;
$function$;
