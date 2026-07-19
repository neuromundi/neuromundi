-- ============================================================================
-- Métricas para el panel de administración (tablero de lanzamiento).
-- ----------------------------------------------------------------------------
-- Función SECURITY DEFINER acotada a is_admin(): devuelve conteos agregados de
-- la plataforma en un solo JSON. Para no-admin devuelve null.
-- Idempotente.
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
    'new_7d',              (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'new_30d',             (select count(*) from public.profiles where created_at >= now() - interval '30 days')
  ) else null end;
$$;

grant execute on function public.admin_metrics() to authenticated;
