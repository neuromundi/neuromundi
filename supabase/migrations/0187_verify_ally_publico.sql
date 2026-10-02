-- ============================================================================
-- 0187 — Verificación pública de ALIADO por id (organizaciones, sin folio)
--
-- Los aliados son organizaciones (tabla allies), no cuentas con folio. Su
-- distintivo lleva un QR a /verificar/aliado/:id, que llama a esta RPC y muestra
-- su estado real (revocable con is_active). Complementa verify_badge (miembros).
-- Idempotente.
-- ============================================================================
create or replace function public.verify_ally(p_id uuid)
returns table(found boolean, name text, website text, countries text[], vigente boolean)
language sql stable security definer
set search_path to 'public'
as $$
  select (a.id is not null), a.name, a.website, a.countries, coalesce(a.is_active, false)
  from (select 1) d
  left join public.allies a on a.id = p_id;
$$;
grant execute on function public.verify_ally(uuid) to anon, authenticated;
