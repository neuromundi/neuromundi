-- 0255 — Tablero del bucle central (admin) + ROI del prestador.
-- admin_core_metrics: las 5 métricas del embudo. "Oferta activa" = TODOS los
-- prestadores publicados (providers_published); providers_paying se reporta aparte.
-- my_provider_roi: lo que la plataforma le entregó al prestador (vistas,
-- solicitudes de contacto, citas, reseñas, ventas) — sostiene la renovación.
-- Ambas SECURITY DEFINER; admin_core_metrics acotada por is_admin().

create or replace function public.admin_core_metrics()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  return (select json_build_object(
    'providers_published',    (select count(*) from profiles where role='provider' and is_published),
    'providers_paying',       (select count(*) from profiles where role='provider' and is_published and public.cuota_cubierta(id)),
    'families_total',         (select count(*) from profiles where role in ('parent','patient')),
    'families_new_30d',       (select count(*) from profiles where role in ('parent','patient') and created_at >= now()-interval '30 days'),
    'views_30d',             (select count(*) from profile_events where kind='view' and created_at >= now()-interval '30 days'),
    'contact_requests_total', (select count(*) from provider_connections),
    'contact_requests_30d',   (select count(*) from provider_connections where created_at >= now()-interval '30 days'),
    'contact_accepted_30d',   (select count(*) from provider_connections where status='accepted' and created_at >= now()-interval '30 days'),
    'appts_30d',             (select count(*) from appointment_requests where created_at >= now()-interval '30 days'),
    'reviews_30d',           (select count(*) from satisfaction_surveys where created_at >= now()-interval '30 days'),
    'directory_seeded',      (select count(*) from directorio),
    'directory_claimed',     (select count(*) from directorio where reclamada_por is not null)
  ));
end; $$;
revoke all on function public.admin_core_metrics() from public, anon;
grant execute on function public.admin_core_metrics() to authenticated;

create or replace function public.my_provider_roi()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'views_total',       (select count(*) from profile_events e where e.provider_id = auth.uid() and e.kind='view'),
    'views_30d',         (select count(*) from profile_events e where e.provider_id = auth.uid() and e.kind='view' and e.created_at >= now()-interval '30 days'),
    'requests_total',    (select count(*) from provider_connections c where c.addressee_id = auth.uid()),
    'requests_30d',      (select count(*) from provider_connections c where c.addressee_id = auth.uid() and c.created_at >= now()-interval '30 days'),
    'requests_accepted', (select count(*) from provider_connections c where c.addressee_id = auth.uid() and c.status='accepted'),
    'appts_total',       (select count(*) from appointment_requests a where a.specialist_id = auth.uid()),
    'appts_30d',         (select count(*) from appointment_requests a where a.specialist_id = auth.uid() and a.created_at >= now()-interval '30 days'),
    'reviews_total',     (select count(*) from satisfaction_surveys s where s.provider_id = auth.uid()),
    'reviews_30d',       (select count(*) from satisfaction_surveys s where s.provider_id = auth.uid() and s.created_at >= now()-interval '30 days'),
    'orders_paid_30d',   (select count(*) from orders o where o.vendor_id = auth.uid() and o.status='paid' and o.paid_at >= now()-interval '30 days')
  );
$$;
grant execute on function public.my_provider_roi() to authenticated;
