-- ============================================================================
-- 0195 — ONG (provider_type = 'ngo'): registro GRATUITO + Fundador propio
--
-- Igual que las Empresas inclusivas (0076), las ONG:
--   1) Tienen su PROPIO track de fundador ('ngos') para no consumir los cupos
--      de los profesionales de pago. Cupo global tentativo = 20 (ampliable por
--      país con admin_set_founder_cap, igual que las empresas).
--   2) Registro SIEMPRE GRATUITO: su membresía queda 'exempt' (nunca se cobra
--      ni se bloquea el panel).
--
-- Como las ONG no pasan por el checkout de Stripe (son exentas), NO reciben el
-- asiento por grant_founder_seat() (que corre en el webhook tras el pago). Para
-- ellas —y, de paso, para las empresas, que tenían el MISMO vacío— se añade
-- claim_free_founder_seat(): una RPC acotada a los sectores gratuitos (company
-- y ngo) que otorga el asiento cuando el perfil cumple su requisito objetivo.
--
-- Requisito objetivo por sector gratuito:
--   · company: >= 2 vacantes activas (como en 0076).
--   · ngo:     foto + biografía + teléfono (no se les exige cuota ni vacantes).
--
-- Idempotente. Aplicar después de la 0194.
-- ============================================================================

-- ── 1) Nuevo grupo de fundador 'ngos' ───────────────────────────────────────
alter table public.founder_members drop constraint if exists founder_members_kind_check;
alter table public.founder_members add constraint founder_members_kind_check
  check (kind in ('families', 'professionals', 'providers', 'companies', 'ngos'));

-- Cupo global (fallback de founder_cap_for): familias 500, resto según 0149,
-- empresas y ONG 20. El cupo por país lo puede ampliar admin_set_founder_cap.
create or replace function public.founder_capacity(p_kind text)
returns integer language sql immutable as $$
  select case p_kind
    when 'families'      then 500
    when 'companies'     then 20
    when 'ngos'          then 20
    when 'providers'     then 150
    when 'professionals' then 300
    else 100
  end;
$$;

-- founder_kind_for: las ONG pasan de 'professionals' a su propio grupo 'ngos'.
create or replace function public.founder_kind_for(p_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when p.role in ('parent','patient') then 'families'
    when p.role = 'provider' and p.provider_type = 'company' then 'companies'
    when p.role = 'provider' and p.provider_type = 'ngo' then 'ngos'
    when p.role = 'provider' and p.provider_type = 'merchant' then 'providers'
    when p.role = 'provider' then 'professionals'
    else null
  end
  from public.profiles p where p.id = p_id;
$$;

-- Mueve a su track propio a las ONG que ya fueran fundadoras como 'professionals'.
update public.founder_members fm
set kind = 'ngos'
from public.profiles p
where fm.user_id = p.id
  and p.provider_type = 'ngo'
  and fm.kind = 'professionals';

-- ── 2) ONG = registro SIEMPRE gratuito ──────────────────────────────────────
update public.profiles set membership_status = 'exempt'
where provider_type = 'ngo' and membership_status is distinct from 'exempt';

-- El trigger de 0076 solo exentaba 'company'; ahora también 'ngo'.
create or replace function public.tg_company_membership_free()
returns trigger language plpgsql set search_path = public as $$
begin
  if NEW.provider_type in ('company', 'ngo') then
    NEW.membership_status := 'exempt';
  end if;
  return NEW;
end; $$;

-- (el trigger trg_company_membership_free de 0076 ya invoca esta función)

-- ── 3) Asiento de fundador para los sectores GRATUITOS ──────────────────────
-- Las empresas y ONG no pagan, así que no pasan por grant_founder_seat() (que
-- vive en el webhook de Stripe). Esta RPC, invocable por el propio usuario, les
-- otorga el asiento cuando cumplen su requisito objetivo y hay cupo vigente.
create or replace function public.claim_free_founder_seat()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ptype text; v_country text; v_wants boolean; v_kind text;
  v_ok boolean := false; v_usados int;
begin
  if v_uid is null then return false; end if;

  select p.provider_type, p.country, p.wants_founder
    into v_ptype, v_country, v_wants
  from public.profiles p where p.id = v_uid;

  -- Solo sectores gratuitos.
  if v_ptype not in ('company', 'ngo') then return false; end if;
  if v_wants is false then return false; end if;

  -- Ya es fundador: nada que hacer.
  if exists (select 1 from public.founder_members where user_id = v_uid) then
    return true;
  end if;

  -- Requisito objetivo por sector.
  if v_ptype = 'company' then
    select (count(*) >= 2) into v_ok
    from public.job_openings j where j.company_id = v_uid and j.is_active = true;
  else -- ngo: foto + bio + teléfono
    select (p.avatar_url is not null
            and coalesce(p.bio,'') <> ''
            and coalesce(p.phone,'') <> '')
      into v_ok
    from public.profiles p where p.id = v_uid;
  end if;
  if not v_ok then return false; end if;

  -- Elegibilidad (plazo vigente + cupo del país disponible).
  if not public.founder_eligible(v_uid) then return false; end if;

  v_kind := public.founder_kind_for(v_uid);
  if v_kind is null then return false; end if;

  -- Revalida cupo justo antes de insertar (evita carrera).
  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal,false) = false
    and p.country is not distinct from v_country;
  if v_usados >= public.founder_cap_for(v_country, v_kind) then return false; end if;

  insert into public.founder_members (user_id, kind, country, grace_until)
  values (v_uid, v_kind, v_country, now() + interval '3 months')
  on conflict (user_id) do nothing;
  return true;
end;
$$;
grant execute on function public.claim_free_founder_seat() to authenticated;

-- ── 4) Purga: requisito de permanencia de la ONG fundadora ──────────────────
-- company: >= 2 vacantes activas (ya estaba). ngo: foto + bio + teléfono (sin
-- cuota, porque su registro es gratuito). Familias y perfiles de pago, igual.
create or replace function public.purge_lapsed_founders()
returns integer language plpgsql security definer set search_path to 'public' as $function$
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
          when fm.kind = 'ngos' then
            -- ONG (registro gratuito): foto + biografía + teléfono (sin cuota).
            p.avatar_url is not null
            and coalesce(p.bio, '') <> ''
            and coalesce(p.phone, '') <> ''
          when fm.kind = 'families' then
            p.avatar_url is not null
            and coalesce(p.bio, '') <> ''
          else
            p.avatar_url is not null
            and coalesce(p.bio, '') <> ''
            and coalesce(p.phone, '') <> ''
            and (
              p.membership_status in ('active', 'exempt')
              or (p.membership_paid_until is not null and p.membership_paid_until > now())
            )
        end
      )
    returning fm.user_id
  )
  select count(*) into v_count from lapsed;
  return v_count;
end;
$function$;
revoke all on function public.purge_lapsed_founders() from public, anon;
