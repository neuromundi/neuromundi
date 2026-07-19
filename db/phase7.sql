-- ============================================================================
-- NeuroDirectorio / Neuromundi — FASE 7 (Neuromundi Academy / LMS)
-- Aplica DESPUÉS de db/phase6.sql (es el 14º archivo). Idempotente.
--
-- Estructura: curso → módulos → lecciones. Cualquier usuario puede inscribirse
-- (gratis en este MVP) y marcar lecciones como completadas. El "aula virtual" es
-- el contenido + el video de cada lección.
-- ============================================================================

-- ── A. Cursos, módulos y lecciones ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  level        TEXT,                  -- p. ej. introductorio / intermedio
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courses_author ON public.courses(author_id);

CREATE TABLE IF NOT EXISTS public.course_modules (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_modules_course ON public.course_modules(course_id, position);

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT,
  video_url    TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  duration_min INTEGER
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.course_lessons(module_id, position);

-- ── B. Inscripciones y progreso ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_enrollment UNIQUE (course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_enroll_user ON public.course_enrollments(user_id);

CREATE TABLE IF NOT EXISTS public.lesson_completions (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- ── C. Helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.owns_course(p_course UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course AND c.author_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.course_visible(p_course UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course AND (c.is_published OR c.author_id = auth.uid()));
$$;
GRANT EXECUTE ON FUNCTION public.owns_course(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.course_visible(UUID) TO authenticated, anon;

-- ── D. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_visible" ON public.courses;
CREATE POLICY "courses_select_visible" ON public.courses FOR SELECT
  USING (is_published = TRUE OR author_id = auth.uid());
DROP POLICY IF EXISTS "courses_owner_all" ON public.courses;
CREATE POLICY "courses_owner_all" ON public.courses FOR ALL
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid() AND public.is_provider(auth.uid()));

DROP POLICY IF EXISTS "modules_select_visible" ON public.course_modules;
CREATE POLICY "modules_select_visible" ON public.course_modules FOR SELECT
  USING (public.course_visible(course_id));
DROP POLICY IF EXISTS "modules_owner_all" ON public.course_modules;
CREATE POLICY "modules_owner_all" ON public.course_modules FOR ALL
  USING (public.owns_course(course_id)) WITH CHECK (public.owns_course(course_id));

DROP POLICY IF EXISTS "lessons_select_visible" ON public.course_lessons;
CREATE POLICY "lessons_select_visible" ON public.course_lessons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.course_modules m WHERE m.id = module_id AND public.course_visible(m.course_id)));
DROP POLICY IF EXISTS "lessons_owner_all" ON public.course_lessons;
CREATE POLICY "lessons_owner_all" ON public.course_lessons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.course_modules m WHERE m.id = module_id AND public.owns_course(m.course_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.course_modules m WHERE m.id = module_id AND public.owns_course(m.course_id)));

-- Inscripciones: el usuario gestiona las suyas; el autor ve las de sus cursos.
DROP POLICY IF EXISTS "enroll_select_own_or_author" ON public.course_enrollments;
CREATE POLICY "enroll_select_own_or_author" ON public.course_enrollments FOR SELECT
  USING (user_id = auth.uid() OR public.owns_course(course_id));
DROP POLICY IF EXISTS "enroll_insert_own" ON public.course_enrollments;
CREATE POLICY "enroll_insert_own" ON public.course_enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.course_visible(course_id));
DROP POLICY IF EXISTS "enroll_delete_own" ON public.course_enrollments;
CREATE POLICY "enroll_delete_own" ON public.course_enrollments FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "completions_own" ON public.lesson_completions;
CREATE POLICY "completions_own" ON public.lesson_completions FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
