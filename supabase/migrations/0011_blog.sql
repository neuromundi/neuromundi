-- ============================================================================
-- Blog Neuromundi — taxonomía de neurodiversidad, feed público enriquecido,
-- onboarding de intereses y recomendación personalizada.
-- ----------------------------------------------------------------------------
-- Reutiliza la infraestructura existente (content_posts + content_ratings +
-- content_views + content_comments). Añade una clasificación editorial (topic),
-- portada y extracto; expone un feed público con datos del autor y métricas; y
-- una función que recomienda publicaciones según los intereses del usuario.
-- Idempotente.
-- ============================================================================

-- 1) Campos editoriales del blog.
alter table public.content_posts add column if not exists topic text;
alter table public.content_posts add column if not exists cover_url text;
alter table public.content_posts add column if not exists excerpt text;

create index if not exists content_posts_topic_idx
  on public.content_posts (topic) where is_published;
create index if not exists content_posts_keywords_gin
  on public.content_posts using gin (keywords);
create index if not exists content_posts_published_created_idx
  on public.content_posts (is_published, created_at desc);

-- 2) Intereses del usuario (onboarding / personalización). La columna ya suele
--    existir; garantizamos su presencia e indexamos para el matching.
alter table public.profiles add column if not exists interests text[] not null default '{}';
create index if not exists profiles_interests_gin
  on public.profiles using gin (interests);

-- 3) Feed público enriquecido: publicaciones publicadas + autor + métricas.
--    security_invoker = off para poder leer de forma agregada sin exponer RLS.
create or replace view public.blog_feed
  with (security_invoker = off) as
  select
    p.id,
    p.author_id,
    p.type,
    p.title,
    p.excerpt,
    p.body,
    p.external_url,
    p.cover_url,
    p.topic,
    p.keywords,
    p.created_at,
    p.updated_at,
    a.full_name      as author_name,
    a.business_name  as author_business,
    a.avatar_url     as author_avatar,
    coalesce(r.avg_stars, 0)::numeric(3,2) as avg_stars,
    coalesce(r.ratings_count, 0)::int      as ratings_count,
    coalesce(v.views_count, 0)::int        as views_count
  from public.content_posts p
  left join public.profiles a on a.id = p.author_id
  left join (
    select post_id, avg(stars) as avg_stars, count(*) as ratings_count
    from public.content_ratings group by post_id
  ) r on r.post_id = p.id
  left join (
    select post_id, count(*) as views_count
    from public.content_views group by post_id
  ) v on v.post_id = p.id
  where p.is_published = true;

grant select on public.blog_feed to anon, authenticated;

-- 4) Recomendación personalizada: puntúa cada publicación por el solape entre
--    su topic/keywords y los intereses del usuario autenticado; desempata por
--    recencia. Sin sesión o sin intereses => devuelve las más recientes.
create or replace function public.recommend_blog(p_limit int default 12)
returns setof public.blog_feed
language sql stable security definer set search_path = public as $$
  with me as (
    select coalesce((select interests from public.profiles where id = auth.uid()), '{}') as ints
  )
  select f.*
  from public.blog_feed f, me
  order by
    (case when f.topic = any(me.ints) then 2 else 0 end)
      + cardinality(array(select unnest(f.keywords) intersect select unnest(me.ints))) desc,
    f.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.recommend_blog(int) to anon, authenticated;
