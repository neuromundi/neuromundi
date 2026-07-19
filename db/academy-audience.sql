-- ============================================================================
-- academy-audience.sql — Añade a los cursos una audiencia opcional para segmentar
-- la Academy por perfil de usuario. Idempotente y reejecutable.
--
--   audience: 'families' | 'specialists' | 'educators' | NULL
--   NULL = curso general, visible en los tres perfiles.
-- ============================================================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS audience TEXT;

-- Restringe a los valores válidos (permitiendo NULL = general).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_audience_check'
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_audience_check
      CHECK (audience IS NULL OR audience IN ('families', 'specialists', 'educators'));
  END IF;
END $$;
