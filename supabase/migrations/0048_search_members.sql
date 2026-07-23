-- ============================================================================
-- 0048 — search_members: búsqueda de miembros para el administrador
--
-- El admin, en la mensajería, necesita localizar a CUALQUIER miembro por folio
-- (NM-000123), nombre o apellido, para escribirle sin conocer su folio exacto.
-- A diferencia de `search_patients` (acotada a los pacientes del especialista),
-- esta busca en TODO el padrón y por eso está restringida a `is_admin()`.
--
-- SECURITY DEFINER (salta RLS de profiles) pero sólo responde si quien llama es
-- admin; para cualquier otro devuelve vacío. Idempotente.
-- ============================================================================

drop function if exists public.search_members(text);
create or replace function public.search_members(p_query text)
returns table (
  member_no bigint,
  full_name text,
  business_name text,
  avatar_url text,
  role text
)
language plpgsql security definer set search_path = public as $$
declare
  v_q      text := btrim(coalesce(p_query, ''));
  v_digits text := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
begin
  if not public.is_admin() then return; end if;
  if v_q = '' then return; end if;

  return query
  select pr.member_no, pr.full_name, pr.business_name, pr.avatar_url, pr.role
    from public.profiles pr
    where pr.member_no is not null
      and (
        (v_digits <> '' and pr.member_no = v_digits::bigint)
        or pr.full_name ilike '%' || v_q || '%'
        or coalesce(pr.business_name, '') ilike '%' || v_q || '%'
      )
    order by pr.full_name
    limit 25;
end;
$$;

grant execute on function public.search_members(text) to authenticated;
