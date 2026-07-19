-- ============================================================================
-- onboarding-gate-rollback.sql — Revierte onboarding-gate.sql
-- Quita las políticas RESTRICTIVE "require_onboarding" y el helper.
-- ============================================================================
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
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.onboarding_complete();
