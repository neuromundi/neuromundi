-- 0076_company_founder_free.sql
-- Empresas inclusivas (provider_type = 'company'):
--   1) Track de Fundador PROPIO: cupo de 20 por país y requisito objetivo de
--      publicar al menos 2 vacantes activas (en vez de foto/bio/teléfono/cuota).
--   2) Registro SIEMPRE GRATUITO: la membresía de las empresas queda 'exempt'
--      (nunca se les cobra ni se les bloquea el panel).
-- Idempotente. Aplicar después de la 0075.

-- ── 1) Nuevo grupo de fundador 'companies' ──────────────────────────────────
alter table public.founder_members drop constraint if exists founder_members_kind_check;
alter table public.founder_members add constraint founder_members_kind_check
  check (kind in ('families', 'professionals', 'providers', 'companies'));

-- Cupo: familias 500, empresas 20, resto 100.
create or replace function public.founder_capacity(p_kind text)
returns integer language sql immutable as $$
  select case p_kind when 'families' then 500 when 'companies' then 20 else 100 end;
$$;

-- Reclamo: además del cupo, las empresas necesitan >= 2 vacantes activas.
create or replace function public.claim_founder_slot(p_kind text, p_country text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_count integer; v_wants boolean;
begin
  if v_uid is null then return false; end if;
  if p_kind not in ('families', 'professionals', 'providers', 'companies') then return false; end if;

  select wants_founder into v_wants from public.profiles where id = v_uid;
  if v_wants is false then return false; end if;

  if exists (select 1 from public.founder_members where user_id = v_uid) then
    return true;
  end if;

  -- Requisito de empresa: al menos 2 vacantes activas al momento de reclamar.
  if p_kind = 'companies' then
    if (select count(*) from public.job_openings j where j.company_id = v_uid and j.is_active = true) < 2 then
      return false;
    end if;
  end if;

  select count(*) into v_count
  from public.founder_members
  where kind = p_kind and country is not distinct from p_country;

  if v_count >= public.founder_capacity(p_kind) then
    return false;
  end if;

  insert into public.founder_members (user_id, kind, country, grace_until)
  values (v_uid, p_kind, p_country, now() + interval '3 months')
  on conflict (user_id) do nothing;
  return true;
end;
$$;

-- Purga: la empresa conserva el distintivo si mantiene >= 2 vacantes activas
-- (no se le exige foto/bio/teléfono ni cuota, porque su registro es gratuito).
create or replace function public.purge_lapsed_founders()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with lapsed as (
    delete from public.founder_members fm
    using public.profiles p
    where fm.user_id = p.id
      and fm.grace_until is not null
      and fm.grace_until < now()
      and not (
        case
          when fm.kind = 'companies' then
            (select count(*) from public.job_openings j where j.company_id = p.id and j.is_active = true) >= 2
          else
            p.avatar_url is not null
            and coalesce(p.bio, '') <> ''
            and coalesce(p.phone, '') <> ''
            and (
              fm.kind = 'families'
              or p.membership_status in ('active', 'exempt')
              or (p.membership_paid_until is not null and p.membership_paid_until > now())
            )
        end
      )
    returning fm.user_id
  )
  select count(*) into v_count from lapsed;
  return v_count;
end;
$$;
revoke all on function public.purge_lapsed_founders() from public, anon;

-- ── 2) Empresa inclusiva = registro SIEMPRE gratuito ────────────────────────
-- Backfill: todas las empresas existentes quedan exentas.
update public.profiles set membership_status = 'exempt'
where provider_type = 'company' and membership_status is distinct from 'exempt';

-- Trigger: cualquier perfil 'company' se fija/mantiene 'exempt' (nunca se cobra).
create or replace function public.tg_company_membership_free()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.provider_type = 'company' then
    NEW.membership_status := 'exempt';
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_company_membership_free on public.profiles;
create trigger trg_company_membership_free
  before insert or update on public.profiles
  for each row execute function public.tg_company_membership_free();
