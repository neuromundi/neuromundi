-- ============================================================================
-- Búsqueda difusa (fuzzy) para search_all(): tolera errores de tipeo y typos.
-- ----------------------------------------------------------------------------
-- · pg_trgm se instala en el esquema `extensions` (no en `public`) para no
--   sumar otro warning de "extension in public" al advisor de seguridad.
-- · Se usa word_similarity()/`<%` en vez de similarity()/`%`: word_similarity
--   compara el término contra la MEJOR SUBCADENA del texto largo, que es lo
--   que de verdad hace falta para que "sol" encuentre "Instituto de Terapia
--   Solar Infantil" — similarity() puro compara contra el string completo y
--   falla en textos largos con coincidencias parciales cortas.
-- · Se mantiene el LIKE original como red de seguridad: coincidencias exactas
--   de substring siempre funcionan, sin depender del umbral de similitud.
-- · Se agregan índices GIN trigram en las columnas de texto buscadas — antes
--   el LIKE '%...%' no podía usar ningún índice.
-- · Reglas de visibilidad/permiso (is_published, is_member_active, role)
--   quedan exactamente igual; solo cambia el matching y el orden (por score).
-- · El frontend (useSearch.ts) llama a la RPC por nombre con la misma firma
--   (kind, id, title, subtitle, url) — no requiere ningún cambio.
-- ============================================================================

create extension if not exists pg_trgm schema extensions;

create index if not exists content_posts_title_trgm_idx
  on public.content_posts using gin (title extensions.gin_trgm_ops);
create index if not exists profiles_business_name_trgm_idx
  on public.profiles using gin (business_name extensions.gin_trgm_ops);
create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index if not exists profiles_services_offered_trgm_idx
  on public.profiles using gin (services_offered extensions.gin_trgm_ops);
create index if not exists products_name_trgm_idx
  on public.products using gin (name extensions.gin_trgm_ops);
create index if not exists products_description_trgm_idx
  on public.products using gin (description extensions.gin_trgm_ops);

create or replace function public.search_all(q text)
returns table(kind text, id uuid, title text, subtitle text, url text)
language sql
stable security definer
set search_path = public, extensions
set pg_trgm.word_similarity_threshold = 0.4
as $function$
  with term as (
    select trim(q) as raw, '%' || lower(trim(q)) || '%' as p
  ),
  matches as (
    select
      'post'::text as kind, cp.id, cp.title,
      coalesce(array_to_string(cp.keywords, ', '), '') as subtitle,
      case when cp.type = 'link' then cp.external_url else '/contenido/' || cp.id::text end as url,
      greatest(
        word_similarity(term.raw, cp.title),
        coalesce((select max(word_similarity(term.raw, k)) from unnest(cp.keywords) k), 0)
      ) as score
    from public.content_posts cp, term
    where cp.is_published and (
      lower(cp.title) like term.p
      or exists (select 1 from unnest(cp.keywords) k where lower(k) like term.p)
      or term.raw <% cp.title
      or exists (select 1 from unnest(cp.keywords) k where term.raw <% k)
    )
    union all
    select
      'provider'::text, p.id, coalesce(p.business_name, p.full_name),
      coalesce(p.services_offered, ''),
      '/proveedor/' || p.id::text,
      greatest(
        word_similarity(term.raw, coalesce(p.business_name, p.full_name)),
        word_similarity(term.raw, coalesce(p.services_offered, ''))
      ) as score
    from public.profiles p, term
    where p.role = 'provider' and p.is_published and public.is_member_active(p.id)
      and (
        lower(coalesce(p.business_name, p.full_name)) like term.p
        or lower(coalesce(p.services_offered, '')) like term.p
        or term.raw <% coalesce(p.business_name, p.full_name)
        or term.raw <% coalesce(p.services_offered, '')
      )
    union all
    select
      'product'::text, pr.id, pr.name, coalesce(pr.description, ''),
      '/proveedor/' || pr.vendor_id::text,
      greatest(
        word_similarity(term.raw, pr.name),
        word_similarity(term.raw, coalesce(pr.description, ''))
      ) as score
    from public.products pr, term
    where lower(pr.name) like term.p
      or lower(coalesce(pr.description, '')) like term.p
      or term.raw <% pr.name
      or term.raw <% coalesce(pr.description, '')
  )
  select kind, id, title, subtitle, url
  from matches
  order by score desc
  limit 50;
$function$;

grant execute on function public.search_all(text) to anon, authenticated, service_role;
