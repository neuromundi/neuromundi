-- ============================================================================
-- 0177 — Marca explícita de cuentas internas para el cupo de fundador
--
-- 0175 excluía del cupo por role='admin'/is_advisor, pero eso no cubría la cuenta
-- de PRUEBA (jormed2025, role=provider) ni a Sergio (asesor principal cuyo
-- is_advisor estaba en false). Se introduce `profiles.is_internal` como marca
-- explícita y se activa para las TRES cuentas internas. `founder_eligible` cuenta
-- ocupación excluyendo `is_internal`.
--
-- No requiere protección anti-escalada: is_internal solo EXCLUYE del conteo (no
-- da beneficio a quien se lo pusiera). Idempotente.
-- ============================================================================

alter table public.profiles add column if not exists is_internal boolean not null default false;

-- Las tres cuentas internas (admin de la plataforma, asesor principal, prueba).
update public.profiles set is_internal = true
where id in (
  'd85154af-4a14-4586-a187-b1c44ae1fe96',  -- admin@neuromundi.com
  '04186d40-d9fb-4ba4-9b3a-fc1e64dbf767',  -- sergioedilberto2024 (asesor principal)
  'f044c419-c7fa-455d-ace9-eb8faeaaafcd'   -- jormed2025 (prueba)
);

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
  -- Ocupación real: excluye cuentas internas marcadas.
  select count(*) into v_usados
  from public.founder_members fm
  join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind
    and coalesce(p.is_internal, false) = false;
  return v_usados < public.founder_capacity(v_kind);
end $function$;
