-- ============================================================================
-- Recomendaciones ("Recomienda Neuromundi") — programa de referidos universal.
-- ----------------------------------------------------------------------------
-- Cada usuario recomienda con su folio (member_no) mediante un enlace
-- ?ref=NM-000123. Cuando la persona referida se registra e inicia sesión, la
-- app atribuye el referido con set_referrer (una sola vez, sin auto-referidos).
-- Requiere la migración 0012 (member_no). Idempotente.
-- ============================================================================

-- 1) Columna de atribución: folio (member_no) de quien recomendó.
alter table public.profiles add column if not exists referred_by bigint;
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);

-- 2) Atribuye el referente al usuario actual, una sola vez y con validaciones:
--    - no permite auto-referido,
--    - solo si aún no tiene referente,
--    - el folio del referente debe existir.
create or replace function public.set_referrer(p_member_no bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_own bigint;
begin
  if v_uid is null or p_member_no is null then return false; end if;

  select member_no into v_own from public.profiles where id = v_uid;
  if v_own is not null and v_own = p_member_no then return false; end if; -- no auto-referido

  -- Ya tiene referente: no se sobreescribe.
  if exists (select 1 from public.profiles where id = v_uid and referred_by is not null) then
    return false;
  end if;

  -- El referente debe existir.
  if not exists (select 1 from public.profiles where member_no = p_member_no) then
    return false;
  end if;

  update public.profiles
    set referred_by = p_member_no
    where id = v_uid and referred_by is null;
  return true;
end $$;

revoke all on function public.set_referrer(bigint) from public, anon;
grant execute on function public.set_referrer(bigint) to authenticated;

-- 3) ¿A cuántas personas ha recomendado el usuario actual? (para su panel).
create or replace function public.my_referral_count()
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.profiles p
  where p.referred_by = (select member_no from public.profiles where id = auth.uid());
$$;

grant execute on function public.my_referral_count() to authenticated;
