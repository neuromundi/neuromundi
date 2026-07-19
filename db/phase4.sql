-- ============================================================================
-- NeuroDirectorio / Neuromundi — FASE 4 (Contenido + valoraciones + buscador)
-- Aplica DESPUÉS de db/phase3.sql (es el 11º archivo). Idempotente.
-- ============================================================================

-- ── A. Publicaciones (blog dentro de la app o enlace a reel/red social) ──────
CREATE TABLE IF NOT EXISTS public.content_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'blog' CHECK (type IN ('blog', 'link')),
  title        TEXT NOT NULL,
  body         TEXT,                 -- artículo (type='blog')
  external_url TEXT,                 -- reel/short/red social (type='link')
  keywords     TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.content_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_keywords ON public.content_posts USING GIN (keywords);

-- ── B. Valoraciones, comentarios y vistas ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars      SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_rating_per_user UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.content_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.content_comments(post_id);

CREATE TABLE IF NOT EXISTS public.content_views (
  post_id   UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Promedio de estrellas por publicación (la calificación se muestra a partir de 3).
CREATE OR REPLACE VIEW public.public_post_ratings AS
  SELECT post_id, ROUND(AVG(stars)::numeric, 2) AS avg_stars, COUNT(*)::int AS rating_count
  FROM public.content_ratings GROUP BY post_id;
GRANT SELECT ON public.public_post_ratings TO anon, authenticated;

-- ── C. Notificaciones in-app ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, is_read);

-- Felicitación al alcanzar promedio ≥ 3 estrellas (una sola vez por publicación).
CREATE OR REPLACE FUNCTION public.notify_post_achievement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg     NUMERIC;
  v_count   INT;
  v_author  UUID;
  v_title   TEXT;
BEGIN
  SELECT AVG(stars), COUNT(*) INTO v_avg, v_count FROM public.content_ratings WHERE post_id = NEW.post_id;
  IF v_avg >= 3 AND v_count >= 1 THEN
    SELECT author_id, title INTO v_author, v_title FROM public.content_posts WHERE id = NEW.post_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_author AND type = 'post_achievement' AND (data->>'post_id') = NEW.post_id::text
    ) THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_author, 'post_achievement',
        '¡Felicidades! Tu publicación alcanzó 3 estrellas',
        v_title,
        jsonb_build_object('post_id', NEW.post_id, 'avg', v_avg, 'count', v_count)
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_post_achievement ON public.content_ratings;
CREATE TRIGGER trg_post_achievement
  AFTER INSERT OR UPDATE ON public.content_ratings
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_achievement();

-- ── D. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.content_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ratings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_views    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_published" ON public.content_posts;
CREATE POLICY "posts_select_published" ON public.content_posts FOR SELECT
  USING (is_published = TRUE OR author_id = auth.uid());
DROP POLICY IF EXISTS "posts_owner_all" ON public.content_posts;
CREATE POLICY "posts_owner_all" ON public.content_posts FOR ALL
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid() AND public.is_provider(auth.uid()));

DROP POLICY IF EXISTS "ratings_select_all" ON public.content_ratings;
CREATE POLICY "ratings_select_all" ON public.content_ratings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ratings_upsert_own" ON public.content_ratings;
CREATE POLICY "ratings_upsert_own" ON public.content_ratings FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_select_all" ON public.content_comments;
CREATE POLICY "comments_select_all" ON public.content_comments FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "comments_insert_own" ON public.content_comments;
CREATE POLICY "comments_insert_own" ON public.content_comments FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "comments_delete_own" ON public.content_comments;
CREATE POLICY "comments_delete_own" ON public.content_comments FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "views_insert_own" ON public.content_views;
CREATE POLICY "views_insert_own" ON public.content_views FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "views_select_author_or_own" ON public.content_views;
CREATE POLICY "views_select_author_or_own" ON public.content_views FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.content_posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── E. Buscador global ───────────────────────────────────────────────────────
-- Busca en publicaciones (blogs/enlaces), prestadores/proveedores y productos.
CREATE OR REPLACE FUNCTION public.search_all(q TEXT)
RETURNS TABLE (kind TEXT, id UUID, title TEXT, subtitle TEXT, url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH term AS (SELECT '%' || lower(trim(q)) || '%' AS p)
  SELECT 'post'::text, cp.id, cp.title,
         COALESCE(array_to_string(cp.keywords, ', '), ''),
         CASE WHEN cp.type = 'link' THEN cp.external_url ELSE '/contenido/' || cp.id::text END
  FROM public.content_posts cp, term
  WHERE cp.is_published AND (lower(cp.title) LIKE term.p OR EXISTS (
    SELECT 1 FROM unnest(cp.keywords) k WHERE lower(k) LIKE term.p))
  UNION ALL
  SELECT 'provider'::text, p.id, COALESCE(p.business_name, p.full_name),
         COALESCE(p.services_offered, ''), '/proveedor/' || p.id::text
  FROM public.profiles p, term
  WHERE p.role = 'provider' AND p.is_published AND public.is_member_active(p.id)
    AND (lower(COALESCE(p.business_name, p.full_name)) LIKE term.p OR lower(COALESCE(p.services_offered, '')) LIKE term.p)
  UNION ALL
  SELECT 'product'::text, pr.id, pr.name, COALESCE(pr.description, ''), '/proveedor/' || pr.vendor_id::text
  FROM public.products pr, term
  WHERE lower(pr.name) LIKE term.p OR lower(COALESCE(pr.description, '')) LIKE term.p
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.search_all(TEXT) TO authenticated, anon;
