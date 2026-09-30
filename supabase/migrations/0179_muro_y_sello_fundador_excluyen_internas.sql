-- ============================================================================
-- 0179 — Excluir cuentas internas (is_internal) del sello de fundador del
-- directorio y del muro público de fundadores (no solo del cupo, ver 0177).
-- Idempotente. Aplicada en producción 2026-09-30.
-- ============================================================================

create or replace function public.founder_provider_ids()
returns table(id uuid)
language sql stable security definer set search_path to 'public'
as $function$
  select fm.user_id
  from public.founder_members fm
  join public.profiles p on p.id = fm.user_id
  where p.role = 'provider' and p.is_published
    and coalesce(p.is_internal, false) = false;
$function$;

create or replace function public.founders_wall(p_country text default null)
returns table(display_name text, member_no bigint, kind text, country text, featured boolean, is_company boolean)
language sql stable security definer set search_path to 'public'
as $function$
  select
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Neuromundi'),
    p.member_no, f.kind, f.country, f.wall_featured, coalesce(p.is_company, false)
  from public.founder_members f
  join public.profiles p on p.id = f.user_id
  where f.wall_published = true
    and coalesce(p.is_internal, false) = false
    and (p_country is null or f.country = p_country)
  order by f.wall_featured desc, f.wall_order asc, p.member_no asc nulls last;
$function$;
