-- ============================================================================
-- Membresías y opción de NO ser Fundador.
-- ----------------------------------------------------------------------------
-- 1) wants_founder: el usuario puede optar por registrarse de forma ordinaria.
--    claim_founder_slot solo reclama cupo si wants_founder = true.
-- 2) set_founder_optout: activar/desactivar la participación como Fundador;
--    al desactivar, se retira de founder_members.
-- 3) admin_membership_renewals: panel del admin para controlar renovaciones de
--    los perfiles a los que la plataforma cobra (proveedores/prestadores).
-- Requiere 0009 (founders), 0012 (member_no). Idempotente.
-- ============================================================================

alter table public.profiles
  add column if not exists wants_founder boolean not null default true;

-- Reemplaza claim_founder_slot para respetar la opción del usuario.
create or replace function public.claim_founder_slot(p_kind text, p_country text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_count integer; v_wants boolean;
begin
  if v_uid is null then return false; end if;
  if p_kind not in ('families', 'professionals', 'providers') then return false; end if;

  -- Respeta la opción de NO ser Fundador.
  select wants_founder into v_wants from public.profiles where id = v_uid;
  if v_wants is false then return false; end if;

  if exists (select 1 from public.founder_members where user_id = v_uid) then
    return true;
  end if;

  select count(*) into v_count
  from public.founder_members
  where kind = p_kind and country is not distinct from p_country;

  if v_count >= public.founder_capacity(p_kind) then
    return false;
  end if;

  insert into public.founder_members (user_id, kind, country)
  values (v_uid, p_kind, p_country)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

-- Activa/desactiva la participación como Fundador para el usuario actual.
create or replace function public.set_founder_optout(p_optout boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  update public.profiles set wants_founder = not p_optout where id = v_uid;
  if p_optout then
    delete from public.founder_members where user_id = v_uid;
  end if;
  return true;
end;
$$;

revoke all on function public.set_founder_optout(boolean) from public, anon;
grant execute on function public.set_founder_optout(boolean) to authenticated;

-- Panel de renovaciones para el admin: perfiles a los que se cobra membresía
-- (proveedores/prestadores), con su fecha de renovación y si son fundadores.
create or replace function public.admin_membership_renewals()
returns table (
  id uuid,
  member_no bigint,
  name text,
  provider_type text,
  country text,
  membership_status text,
  paid_until timestamptz,
  due_at timestamptz,
  is_founder boolean,
  days_until integer
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.member_no,
    coalesce(nullif(p.business_name, ''), p.full_name) as name,
    p.provider_type,
    p.country,
    p.membership_status,
    p.membership_paid_until as paid_until,
    p.membership_due_at as due_at,
    exists (select 1 from public.founder_members f where f.user_id = p.id) as is_founder,
    case
      when p.membership_paid_until is not null
        then (p.membership_paid_until::date - current_date)
      when p.membership_due_at is not null
        then (p.membership_due_at::date - current_date)
      else null
    end as days_until
  from public.profiles p
  where public.is_admin()
    and p.role = 'provider'
  order by
    coalesce(p.membership_paid_until, p.membership_due_at) asc nulls last;
$$;

grant execute on function public.admin_membership_renewals() to authenticated;
