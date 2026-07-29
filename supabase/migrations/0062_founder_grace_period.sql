-- ============================================================================
-- 0062 — Periodo de gracia del Miembro Fundador (3 meses) + revocación objetiva
--
-- El distintivo de Fundador ahora es CONDICIONAL: el usuario tiene 3 meses desde
-- que lo obtiene para cumplir requisitos objetivos (verificables en el servidor)
-- o pierde la categoría y el distintivo. Los requisitos "blandos" (foro, blog,
-- recomendaciones) quedan como recomendación y NO revocan automáticamente.
--
-- Requisitos objetivos evaluados aquí:
--   · TODOS: foto (avatar_url), biografía (bio) y teléfono.
--   · PRESTADORES (professionals/providers): además, cuota cubierta
--     (membership_status='active' o membership_paid_until en el futuro).
--
-- Idempotente. Aplicar después de la 0061.
-- ============================================================================

-- 1) Fecha límite de cumplimiento por fundador.
alter table public.founder_members
  add column if not exists grace_until timestamptz;

-- Backfill: 3 meses desde que se registró como fundador.
update public.founder_members
set grace_until = coalesce(created_at, now()) + interval '3 months'
where grace_until is null;

-- 2) Al reclamar el cupo se fija la fecha límite (3 meses).
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

  insert into public.founder_members (user_id, kind, country, grace_until)
  values (v_uid, p_kind, p_country, now() + interval '3 months')
  on conflict (user_id) do nothing;
  return true;
end;
$$;

-- 3) Revoca el distintivo a los fundadores cuyo periodo de gracia venció y que
--    NO cumplen los requisitos objetivos. Devuelve cuántos se retiraron.
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
        p.avatar_url is not null
        and coalesce(p.bio, '') <> ''
        and coalesce(p.phone, '') <> ''
        and (
          fm.kind = 'families'
          or p.membership_status = 'active'
          or (p.membership_paid_until is not null and p.membership_paid_until > now())
        )
      )
    returning fm.user_id
  )
  select count(*) into v_count from lapsed;
  return v_count;
end;
$$;

revoke all on function public.purge_lapsed_founders() from public, anon;

-- 4) Cron diario (pg_cron). Reprogramación idempotente.
do $$
begin
  perform cron.unschedule('nm-purge-lapsed-founders');
exception when others then
  null; -- no existía el job: nada que desprogramar
end $$;

select cron.schedule(
  'nm-purge-lapsed-founders',
  '0 3 * * *',
  $$ select public.purge_lapsed_founders(); $$
);
