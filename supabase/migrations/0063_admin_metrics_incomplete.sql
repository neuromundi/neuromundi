-- ============================================================================
-- 0063 — Métrica: registros NO concluidos.
--
-- Añade `incomplete_registrations` a `admin_metrics()`: perfiles que existen pero
-- que nunca completaron el onboarding (`rules_version_accepted IS NULL`), típico
-- de quien entra por login social y abandona sin terminar. Excluye admins.
-- Idempotente (create or replace). Aplicar después de la 0062.
-- ============================================================================

create or replace function public.admin_metrics()
returns json
language sql
security definer
set search_path = public
as $$
  select case when public.is_admin() then json_build_object(
    'members_total',       (select count(*) from public.profiles),
    'providers_total',     (select count(*) from public.profiles where role = 'provider'),
    'providers_verified',  (select count(*) from public.profiles where role = 'provider' and is_verified),
    'providers_published', (select count(*) from public.profiles where role = 'provider' and is_published),
    'founders_total',      (select count(*) from public.founder_members),
    'products_active',     (select count(*) from public.products where is_active and status = 'approved'),
    'reports_open',        (select count(*) from public.reports where status in ('open', 'in_review')),
    'referrals_total',     (select count(*) from public.profiles where referred_by is not null),
    'incomplete_registrations', (select count(*) from public.profiles where rules_version_accepted is null and role <> 'admin'),
    'new_7d',              (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'new_30d',             (select count(*) from public.profiles where created_at >= now() - interval '30 days')
  ) else null end;
$$;

grant execute on function public.admin_metrics() to authenticated;
