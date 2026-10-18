-- 0274: las cuatro vistas publicas dejan de correr con permisos de su dueno.
-- Lo publico se abre en las TABLAS, fila por fila y columna por columna.
--
-- Cuatro vistas corrian con `security definer`: reseñas de prestadores, reseñas
-- de publicaciones, comentarios y el muro del blog. Es comodo pero peligroso:
-- la vista se salta la seguridad por fila de las tablas de abajo, asi que un
-- error al escribirla deja de ser un fallo de presentacion y pasa a ser una
-- fuga. Para quitarles el privilegio hubo que resolver POR QUE lo necesitaban:
-- el visitante sin sesion no podia leer NADA de esas tablas.
--   · content_ratings: su unica politica exigia auth.uid() no nulo.
--   · content_views: solo el autor del articulo o el propio lector.
--   · satisfaction_surveys: solo quien escribio la encuesta.
--
-- Son DOS candados y hacen falta los dos:
--   1. QUE FILAS: una politica nueva por tabla.
--   2. QUE COLUMNAS: esto es lo que una vista no puede hacer sola. Si al rol
--      anonimo se le deja lectura sobre TODA la tabla, al abrir las filas
--      quedan al descubierto columnas que la vista nunca mostro: en
--      content_ratings, `user_id` (QUIEN califico); en satisfaction_surveys,
--      `parent_id` (QUIEN reseño) y `transaction_id`; en content_views,
--      `user_id` (QUIEN leyo). Por eso al anonimo se le retira el permiso
--      general y se le devuelve acotado. Al rol con sesion no se le toca nada.
--
-- Las dos vistas que leian `profiles` pasan a leer `perfiles_basicos`, que ya
-- filtra a perfiles publicados y vigentes (y deja pasar el propio, el de un
-- administrador y el de una conexion aceptada, asi que el prestador sigue
-- viendo lo suyo aunque no este publicado). Efecto colateral deseable: hoy un
-- anonimo podia leer el nombre comercial y la ciudad de un prestador NO
-- publicado si ese prestador tenia reseñas. Ya no.
--
-- Verificado como visitante anonimo con filas de prueba, despues borradas:
--   · el promedio de estrellas, el muro del blog con autor y conteos, el
--     comentario y la calificacion del prestador publicado: SE VEN;
--   · el comentario de un prestador NO publicado: no se ve;
--   · quien califico, quien reseño y quien leyo: permiso denegado.
--
-- El aviso de seguridad de vistas privilegiadas bajo de 10 a 6. Las 6 que
-- quedan son deliberadas: son las que permiten que alguien sin cuenta lea el
-- directorio sin darle acceso a las tablas de fondo.
--
-- Idempotente: si las politicas ya existen, no se vuelven a crear. Las ordenes
-- de revocacion van dentro de un bloque porque sueltas no llegan a ejecutarse
-- por la via con la que se aplica.

do $mig$
begin
  if not exists (select 1 from pg_policy where polname = 'ratings_select_published_post'
                   and polrelid = 'public.content_ratings'::regclass) then
    execute 'create policy ratings_select_published_post on public.content_ratings for select using (exists (select 1 from public.content_posts cp where cp.id = content_ratings.post_id and cp.is_published = true))';
  end if;
  execute 'revoke select on public.content_ratings from anon';
  execute 'grant select (post_id, stars) on public.content_ratings to anon';

  if not exists (select 1 from pg_policy where polname = 'views_select_published_post'
                   and polrelid = 'public.content_views'::regclass) then
    execute 'create policy views_select_published_post on public.content_views for select using (exists (select 1 from public.content_posts cp where cp.id = content_views.post_id and cp.is_published = true))';
  end if;
  execute 'revoke select on public.content_views from anon';
  execute 'grant select (post_id) on public.content_views to anon';

  if not exists (select 1 from pg_policy where polname = 'surveys_select_public'
                   and polrelid = 'public.satisfaction_surveys'::regclass) then
    execute 'create policy surveys_select_public on public.satisfaction_surveys for select using (public.perfil_publicado_y_vigente(provider_id))';
  end if;
  execute 'revoke select on public.satisfaction_surveys from anon';
  execute 'grant select (id, provider_id, comments, created_at, quality_score, human_treatment_score, accessibility_score, price_value_score, offer_compliance_score, sensory_adaptation_score, flexibility_crisis_score, facilities_score, professionalism_score, provider_response, provider_response_at) on public.satisfaction_surveys to anon';
end
$mig$;

create or replace view public.public_provider_ratings as
 SELECT s.provider_id,
    p.business_name,
    p.provider_type,
    p.city,
    count(*) AS total_reviews,
    round(avg(s.quality_score), 2) AS avg_quality,
    round(avg(s.human_treatment_score), 2) AS avg_human_treatment,
    round(avg(s.accessibility_score), 2) AS avg_accessibility,
    round(avg(s.price_value_score), 2) AS avg_price_value,
    round(avg(s.offer_compliance_score), 2) AS avg_offer_compliance,
    round(avg(s.sensory_adaptation_score), 2) AS avg_sensory_adaptation,
    round(avg(s.flexibility_crisis_score), 2) AS avg_flexibility_crisis,
    round(avg(s.facilities_score), 2) AS avg_facilities,
    round(avg(s.professionalism_score), 2) AS avg_professionalism,
    round(avg((s.quality_score + s.human_treatment_score + s.accessibility_score + s.price_value_score + s.offer_compliance_score + s.sensory_adaptation_score + s.flexibility_crisis_score)::numeric / 7::numeric), 1) AS evs_score
   FROM satisfaction_surveys s
     JOIN perfiles_basicos p ON p.id = s.provider_id
  GROUP BY s.provider_id, p.business_name, p.provider_type, p.city;

create or replace view public.blog_feed as
 SELECT p.id,
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
    a.full_name AS author_name,
    a.business_name AS author_business,
    a.avatar_url AS author_avatar,
    COALESCE(r.avg_stars, 0::numeric)::numeric(3,2) AS avg_stars,
    COALESCE(r.ratings_count, 0::bigint)::integer AS ratings_count,
    COALESCE(v.views_count, 0::bigint)::integer AS views_count
   FROM content_posts p
     LEFT JOIN perfiles_basicos a ON a.id = p.author_id
     LEFT JOIN ( SELECT content_ratings.post_id,
            avg(content_ratings.stars) AS avg_stars,
            count(*) AS ratings_count
           FROM content_ratings
          GROUP BY content_ratings.post_id) r ON r.post_id = p.id
     LEFT JOIN ( SELECT content_views.post_id,
            count(*) AS views_count
           FROM content_views
          GROUP BY content_views.post_id) v ON v.post_id = p.id
  WHERE p.is_published = true;

alter view public.public_post_ratings      set (security_invoker = true);
alter view public.public_provider_comments set (security_invoker = true);
alter view public.public_provider_ratings  set (security_invoker = true);
alter view public.blog_feed                set (security_invoker = true);
