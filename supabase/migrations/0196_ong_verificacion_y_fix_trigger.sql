-- ============================================================================
-- 0196 — Corrección de 0195 + verificación documental de ONG
--
-- 0195 SOBRESCRIBIÓ por error el trigger maduro tg_company_membership_free()
-- (versión 0168, que exime por SECTOR y fija exencion_tipo/vigencia) con una
-- versión simplista. Aquí se RESTAURA esa lógica y se añade la ONG como sector
-- gratuito permanente (como las empresas), sin perder el expediente de exención.
--
-- Además, a petición del dueño, se añade un PASO DE VERIFICACIÓN para que una
-- ONG cuente como Fundadora: debe subir su ACTA constitutiva O, en su defecto,
-- una CARTA de manifestación como organización de hecho; el admin la aprueba.
-- Solo con el documento aprobado, claim_free_founder_seat() otorga el asiento.
--
-- Idempotente. Aplicar después de la 0195.
-- ============================================================================

-- ── 1) Restaurar exención por sector e incluir a la ONG ─────────────────────
create or replace function public.exento_de_cuota(p_sector text, p_provider_type text)
returns boolean language sql immutable as $$
  select coalesce(p_sector in ('publico','social') or p_provider_type in ('company','ngo'), false);
$$;
grant execute on function public.exento_de_cuota(text, text) to authenticated, anon;

-- exencion_tipo admite 'ong' (exención permanente de la ONG inclusiva).
alter table public.profiles drop constraint if exists profiles_exencion_tipo_check;
alter table public.profiles add constraint profiles_exencion_tipo_check
  check (exencion_tipo is null or exencion_tipo in ('publico','donataria','cluni','empresa','ong'));

-- Trigger restaurado (0168) + rama 'ong' (permanente, como empresa).
create or replace function public.tg_company_membership_free()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if not public.exento_de_cuota(NEW.sector, NEW.provider_type) then
    return NEW;
  end if;
  NEW.membership_status := 'exempt';
  if NEW.exencion_tipo is null then
    if NEW.provider_type = 'company' then
      NEW.exencion_tipo := 'empresa'; NEW.exencion_vigente_hasta := null;
    elsif NEW.provider_type = 'ngo' then
      NEW.exencion_tipo := 'ong'; NEW.exencion_vigente_hasta := null;
    elsif NEW.sector = 'publico' then
      NEW.exencion_tipo := 'publico'; NEW.exencion_vigente_hasta := null;
    else
      NEW.exencion_vigente_hasta := coalesce(NEW.exencion_vigente_hasta, now() + interval '1 year');
    end if;
  end if;
  return NEW;
end; $$;

-- Backfill: las ONG ya existentes quedan con su tipo permanente.
update public.profiles
set exencion_tipo = 'ong', exencion_vigente_hasta = null
where provider_type = 'ngo' and membership_status = 'exempt'
  and (exencion_tipo is null or exencion_tipo = 'ong');

-- estado_exencion: 'ong' también es permanente (igual que publico/empresa).
create or replace function public.estado_exencion(p_id uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'aplica',     coalesce(public.exento_de_cuota(p.sector, p.provider_type), false),
    'sector',     p.sector,
    'tipo',       p.exencion_tipo,
    'folio',      p.exencion_folio,
    'documento',  p.exencion_documento,
    'solicitada', p.exencion_solicitada_en,
    'aprobada',   p.exencion_aprobada_en,
    'vence',      p.exencion_vigente_hasta,
    'vencida',    (p.exencion_vigente_hasta is not null and p.exencion_vigente_hasta <= now()),
    'permanente', (p.exencion_tipo in ('publico','empresa','ong')),
    'rechazo',    p.exencion_rechazo,
    'dias',       case when p.exencion_vigente_hasta is null then null
                       else greatest(0, (date_part('day', p.exencion_vigente_hasta - now()))::int) end
  ) from public.profiles p where p.id = p_id;
$$;
grant execute on function public.estado_exencion(uuid) to authenticated;

-- ── 2) Expediente de verificación de la organización ────────────────────────
alter table public.profiles
  add column if not exists org_doc_url text,
  add column if not exists org_doc_kind text,
  add column if not exists org_doc_status text,
  add column if not exists org_doc_note text,
  add column if not exists org_doc_submitted_at timestamptz,
  add column if not exists org_doc_reviewed_at timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_org_doc_kind_check
    check (org_doc_kind is null or org_doc_kind in ('acta','carta'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_org_doc_status_check
    check (org_doc_status is null or org_doc_status in ('pending','approved','rejected'));
exception when duplicate_object then null; end $$;

-- La organización sube su documento (acta constitutiva o carta de organización
-- de hecho). Solo empresa/ONG. Queda 'pending' hasta que el admin resuelva.
create or replace function public.submit_org_document(p_url text, p_kind text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_ptype text;
begin
  if auth.uid() is null then raise exception 'sesion requerida'; end if;
  if p_kind not in ('acta','carta') then raise exception 'tipo de documento no valido'; end if;
  if btrim(coalesce(p_url,'')) = '' then raise exception 'falta el documento'; end if;

  select provider_type into v_ptype from public.profiles where id = auth.uid();
  if v_ptype not in ('company','ngo') then raise exception 'solo empresas u ONG'; end if;

  update public.profiles
     set org_doc_url = btrim(p_url),
         org_doc_kind = p_kind,
         org_doc_status = 'pending',
         org_doc_note = null,
         org_doc_submitted_at = now(),
         org_doc_reviewed_at = null
   where id = auth.uid();
  return true;
end $$;
grant execute on function public.submit_org_document(text, text) to authenticated;

-- El admin aprueba o rechaza. Al aprobar, si cumple cupo y plazo, otorga el
-- asiento de fundador de inmediato (vía la lógica de claim_free_founder_seat).
create or replace function public.admin_set_org_doc(p_user uuid, p_approve boolean, p_note text default null)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'solo administradores'; end if;
  update public.profiles
     set org_doc_status = case when p_approve then 'approved' else 'rejected' end,
         org_doc_note = nullif(btrim(coalesce(p_note,'')), ''),
         org_doc_reviewed_at = now()
   where id = p_user;
  if not found then raise exception 'perfil no encontrado'; end if;
  return true;
end $$;
grant execute on function public.admin_set_org_doc(uuid, boolean, text) to authenticated;

-- Cola de revisión para el administrador.
create or replace function public.admin_pending_org_docs()
returns table (
  id uuid, nombre text, provider_type text, member_no text,
  org_doc_kind text, org_doc_url text, org_doc_submitted_at timestamptz
) language sql stable security definer set search_path to 'public' as $$
  select p.id,
         coalesce(nullif(btrim(p.business_name), ''), p.full_name, '—') as nombre,
         p.provider_type, p.member_no,
         p.org_doc_kind, p.org_doc_url, p.org_doc_submitted_at
  from public.profiles p
  where p.org_doc_status = 'pending'
    and public.is_admin()
  order by p.org_doc_submitted_at asc nulls last;
$$;
grant execute on function public.admin_pending_org_docs() to authenticated;

-- ── 3) Asiento de fundador gratuito: la ONG exige documento aprobado ────────
create or replace function public.claim_free_founder_seat()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ptype text; v_country text; v_wants boolean; v_kind text; v_doc text;
  v_ok boolean := false; v_usados int;
begin
  if v_uid is null then return false; end if;

  select p.provider_type, p.country, p.wants_founder, p.org_doc_status
    into v_ptype, v_country, v_wants, v_doc
  from public.profiles p where p.id = v_uid;

  if v_ptype not in ('company', 'ngo') then return false; end if;
  if v_wants is false then return false; end if;

  if exists (select 1 from public.founder_members where user_id = v_uid) then
    return true;
  end if;

  -- Requisito objetivo por sector.
  if v_ptype = 'company' then
    select (count(*) >= 2) into v_ok
    from public.job_openings j where j.company_id = v_uid and j.is_active = true;
  else -- ONG: documento (acta o carta) APROBADO + foto + bio + teléfono.
    if v_doc is distinct from 'approved' then return false; end if;
    select (p.avatar_url is not null
            and coalesce(p.bio,'') <> ''
            and coalesce(p.phone,'') <> '')
      into v_ok
    from public.profiles p where p.id = v_uid;
  end if;
  if not v_ok then return false; end if;

  if not public.founder_eligible(v_uid) then return false; end if;

  v_kind := public.founder_kind_for(v_uid);
  if v_kind is null then return false; end if;

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
