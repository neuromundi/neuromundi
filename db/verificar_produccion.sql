-- ============================================================================
-- Verificación de migraciones en producción (Neuromundi)
-- Pega TODO esto en el SQL Editor de Supabase y ejecútalo. Devuelve una fila por
-- objeto esperado con estado OK / FALTA. Si algo dice FALTA, la migración que lo
-- crea no se aplicó (o falló). Los FALTA aparecen primero.
-- ============================================================================
with expected(migration, kind, name) as (
  values
    ('0001_toolkit.sql','table','specialists'),
    ('0001_toolkit.sql','table','user_progress'),
    ('0002_country_segmentation.sql','column','courses.country'),
    ('0002_country_segmentation.sql','view','courses_public'),
    ('0003_provider_search.sql','column','profiles.search_tsv'),
    ('0003_provider_search.sql','function','provider_search_text'),
    ('0004_admin_other_values.sql','function','admin_other_values'),
    ('0004_admin_other_values.sql','function','admin_promote_other_to_category'),
    ('0005_provider_badge.sql','view','provider_badge_inputs'),
    ('0006_badge_improvements.sql','function','admin_badge_inputs'),
    ('0007_my_badge_inputs.sql','function','my_badge_inputs'),
    ('0008_badge_notifications.sql','column','profiles.badge_level'),
    ('0008_badge_notifications.sql','function','badge_rank'),
    ('0008_badge_notifications.sql','function','compute_provider_level'),
    ('0008_badge_notifications.sql','function','refresh_all_badges'),
    ('0008_badge_notifications.sql','function','refresh_provider_badge'),
    ('0008_badge_notifications.sql','function','trg_profile_badge_on_verify'),
    ('0009_founders_analytics.sql','function','claim_founder_slot'),
    ('0009_founders_analytics.sql','function','founder_capacity'),
    ('0009_founders_analytics.sql','function','is_founder'),
    ('0009_founders_analytics.sql','table','analytics_events'),
    ('0009_founders_analytics.sql','table','founder_members'),
    ('0009_founders_analytics.sql','view','founder_counts'),
    ('0010_store.sql','column','products.is_featured'),
    ('0010_store.sql','column','products.store_category'),
    ('0010_store.sql','function','trg_products_admin_autoapprove'),
    ('0011_blog.sql','column','content_posts.cover_url'),
    ('0011_blog.sql','column','content_posts.excerpt'),
    ('0011_blog.sql','column','content_posts.topic'),
    ('0011_blog.sql','column','profiles.interests'),
    ('0011_blog.sql','function','recommend_blog'),
    ('0011_blog.sql','view','blog_feed'),
    ('0012_member_no.sql','column','profiles.member_no'),
    ('0013_referrals.sql','column','profiles.referred_by'),
    ('0013_referrals.sql','function','my_referral_count'),
    ('0013_referrals.sql','function','set_referrer'),
    ('0014_membership_founder.sql','column','profiles.wants_founder'),
    ('0014_membership_founder.sql','function','admin_membership_renewals'),
    ('0014_membership_founder.sql','function','set_founder_optout'),
    ('0015_reports.sql','function','admin_reports'),
    ('0015_reports.sql','table','reports'),
    ('0016_reports_anon.sql','column','reports.is_member'),
    ('0016_reports_anon.sql','column','reports.reporter_email'),
    ('0016_reports_anon.sql','column','reports.reporter_name'),
    ('0017_product_reviews.sql','function','trg_product_reviews_touch'),
    ('0017_product_reviews.sql','table','product_reviews'),
    ('0017_product_reviews.sql','view','public_product_ratings'),
    ('0018_admin_metrics.sql','function','admin_metrics'),
    ('0019_events_calendar.sql','function','trg_events_touch'),
    ('0019_events_calendar.sql','table','calendar_entries'),
    ('0019_events_calendar.sql','table','events'),
    ('0020_appointment_requests.sql','function','emit_all_due_appointment_reminders'),
    ('0020_appointment_requests.sql','function','emit_due_appointment_reminders'),
    ('0020_appointment_requests.sql','function','request_appointment'),
    ('0020_appointment_requests.sql','function','respond_appointment'),
    ('0020_appointment_requests.sql','table','appointment_requests'),
    ('0021_pg_cron.sql','cronjob','nm-appt-reminders'),
    ('0021_pg_cron.sql','extension','pg_cron'),
    ('0022_search_patients.sql','function','search_patients')
),
checked as (
  select e.*,
    case e.kind
      when 'table'     then (to_regclass('public.' || e.name) is not null)
      when 'view'      then (to_regclass('public.' || e.name) is not null)
      when 'function'  then exists (
                              select 1 from pg_proc p
                              join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname = e.name)
      when 'column'    then exists (
                              select 1 from information_schema.columns c
                              where c.table_schema = 'public'
                                and c.table_name = split_part(e.name, '.', 1)
                                and c.column_name = split_part(e.name, '.', 2))
      when 'extension' then exists (select 1 from pg_extension where extname = e.name)
      when 'cronjob'   then (to_regclass('cron.job') is not null
                              and exists (select 1 from cron.job where jobname = e.name))
      else false
    end as present
  from expected e
)
select migration, kind, name,
       case when present then 'OK' else 'FALTA' end as estado
from checked
order by present asc, migration, kind, name;
