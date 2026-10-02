-- ============================================================================
-- 0185 — Conteo público de fundadores (para el contador del home)
--
-- founder_count() devuelve el total de Miembros Fundadores, EXCLUYENDO cuentas
-- internas (is_internal). Público (anon + authenticated) porque alimenta el
-- contador de prueba social del home, que sólo se pinta cuando el número ≥ 20.
-- Idempotente.
-- ============================================================================
create or replace function public.founder_count()
returns integer
language sql stable security definer
set search_path to 'public'
as $$
  select count(*)::int
  from public.founder_members fm
  join public.profiles p on p.id = fm.user_id
  where coalesce(p.is_internal, false) = false;
$$;
grant execute on function public.founder_count() to anon, authenticated;
