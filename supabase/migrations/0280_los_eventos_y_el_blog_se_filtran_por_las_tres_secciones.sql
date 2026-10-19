-- Las tres secciones de la plataforma (neurodesarrollo, neurodivergencias y
-- afecciones neurológicas) ya ordenaban el directorio y los perfiles, pero no
-- el blog ni los eventos: quien entra buscando lo suyo tenía que leerlo todo.
-- Se usa el MISMO vocabulario de profiles.sections, no uno nuevo, para que una
-- persona encuentre lo mismo llamándolo igual en todas las secciones del sitio.
alter table public.events add column if not exists sections text[] not null default '{}';
alter table public.content_posts add column if not exists sections text[] not null default '{}';

comment on column public.events.sections is 'Secciones de la plataforma a las que pertenece el evento: neurodesarrollo, neurodivergencias, afecciones. Vacío = sin clasificar, aparece en todas.';
comment on column public.content_posts.sections is 'Secciones de la plataforma a las que pertenece la publicación. Vacío = sin clasificar, aparece en todas.';

-- La vista del blog tiene que llevar la columna o la página no puede filtrar.
-- La columna nueva va AL FINAL: «create or replace view» no deja reordenar ni
-- intercalar columnas, sólo añadirlas después de las que ya existen.
create or replace view public.blog_feed as
  select p.id, p.author_id, p.type, p.title, p.excerpt, p.body, p.external_url,
         p.cover_url, p.topic, p.keywords, p.created_at, p.updated_at,
         a.full_name as author_name, a.business_name as author_business,
         a.avatar_url as author_avatar,
         coalesce(r.avg_stars, 0::numeric)::numeric(3,2) as avg_stars,
         coalesce(r.ratings_count, 0::bigint)::integer as ratings_count,
         coalesce(v.views_count, 0::bigint)::integer as views_count,
         p.sections
    from content_posts p
    left join perfiles_basicos a on a.id = p.author_id
    left join (select content_ratings.post_id, avg(content_ratings.stars) as avg_stars,
                      count(*) as ratings_count
                 from content_ratings group by content_ratings.post_id) r on r.post_id = p.id
    left join (select content_views.post_id, count(*) as views_count
                 from content_views group by content_views.post_id) v on v.post_id = p.id
   where p.is_published = true;

alter view public.blog_feed set (security_invoker = true);
