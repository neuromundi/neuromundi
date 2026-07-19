-- ============================================================================
-- onboarding-gate.sql  —  Refuerzo a nivel de BASE DE DATOS del onboarding.
--
-- Objetivo: que un usuario autenticado que entró por login social pero AÚN NO
-- completó su perfil (rules_version_accepted IS NULL) no pueda ACTUAR en la
-- plataforma vía API directa, aunque se saltara la barrera de la interfaz.
--
-- Estrategia (segura y aditiva):
--   • Helper public.onboarding_complete() → boolean.
--   • Política RESTRICTIVE en las tablas de acción: bloquea INSERT/UPDATE de
--     usuarios autenticados que no completaron el onboarding. Las LECTURAS no se
--     tocan (USING true), así que esto NO rompe la navegación ni el bootstrap.
--
-- No se tocan:
--   • profiles  → debe leerse para detectar el estado y para que el RPC lo complete.
--   • user_agreements, notifications, categorías/lookup → para no romper flujos.
--
-- service_role (Edge Functions) y anon NO se ven afectados:
--   • service_role omite RLS (BYPASSRLS).
--   • la política es TO authenticated; anon queda igual que antes.
--   • complete_onboarding es SECURITY DEFINER → escribe el perfil sin bloqueo.
--
-- Idempotente. Reejecutable. Rollback: onboarding-gate-rollback.sql
-- ============================================================================

-- 1) Helper: ¿el usuario actual ya completó el onboarding?
CREATE OR REPLACE FUNCTION public.onboarding_complete()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rules_version_accepted IS NOT NULL
       FROM public.profiles
      WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.onboarding_complete() TO authenticated;

-- 2) Candado de escritura en tablas de acción (no afecta lecturas).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'appointments','appointment_reminders',
    'orders','payments','discount_transactions','promo_redemptions',
    'content_posts','content_comments','content_ratings',
    'course_enrollments','lesson_completions',
    'prescriptions','prescription_items',
    'clinical_entries','clinical_messages','clinical_consents','home_tasks',
    'provider_connections',
    'parent_lists','parent_list_items',
    'satisfaction_surveys','waitlist',
    'products','provider_availability','provider_locations','provider_categories',
    'secure_files','secure_file_keys'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS require_onboarding ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY require_onboarding ON public.%I '
        'AS RESTRICTIVE FOR ALL TO authenticated '
        'USING (true) WITH CHECK (public.onboarding_complete())',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Nota: USING (true) deja intactas SELECT y DELETE; WITH CHECK exige el
-- onboarding para INSERT y UPDATE. Las demás políticas (propietario, admin, etc.)
-- siguen aplicando: las RESTRICTIVE se combinan con AND, solo añaden el requisito.
