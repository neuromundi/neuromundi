-- ============================================================================
-- 0175 — El cupo de fundador no cuenta cuentas internas
--
-- `founder_eligible` contaba TODOS los asientos de `founder_members` para decidir
-- si queda cupo. Eso incluía cuentas internas (admin, asesor), que consumían un
-- lugar real e inflaban la ocupación de cara a una cifra pública de escasez.
--
-- Se excluyen del conteo las cuentas con role='admin' o is_advisor. La cuenta de
-- PRUEBA (p. ej. jormed2025) no tiene un rol interno; su asiento debe eliminarse
-- a mano antes del lanzamiento (no se puede distinguir por criterio genérico).
--
-- Idempotente (create or replace).
-- ============================================================================

create or replace function public.founder_eligible(p_id uuid)
returns boolean
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
  v_kind text; v_country text; v_wants boolean; v_usados int; v_limite timestamptz;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then
    return true;
  end if;
  select p.country, p.wants_founder into v_country, v_wants
  from public.profiles p where p.id = p_id;
  if v_wants is false then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  if coalesce(v_country,'') = '' then return false; end if;
  select (value #>> '{}')::timestamptz into v_limite
  from public.campaign_config c, jsonb_each(c.founder_deadline_by_country)
  where c.id = 1 and key = v_country;
  if v_limite is not null and now() >= v_limite then return false; end if;
  -- Conteo de ocupación: excluye cuentas internas (admin / asesor).
  select count(*) into v_usados
  from public.founder_members fm
  join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind
    and p.role <> 'admin' and coalesce(p.is_advisor, false) = false;
  return v_usados < public.founder_capacity(v_kind);
end $function$;
