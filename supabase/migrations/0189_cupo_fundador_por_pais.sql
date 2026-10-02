-- ============================================================================
-- 0189 — Cupo de fundador POR PAÍS (tentativo + ampliable) y plazo por país
--
-- Antes el cupo era global por tipo y solo México tenía fecha límite. Ahora:
--  · founder_deadline_by_country: México 1-nov-2026; demás mercados activos 31-dic-2026.
--  · founder_caps_by_country (jsonb en campaign_config): cupo tentativo por
--    país × tipo de fundador (families/professionals/providers/companies),
--    ampliable con admin_set_founder_cap(). Fallback al global founder_capacity.
--  · founder_eligible / grant_founder_seat cuentan POR PAÍS (excluyendo internas)
--    y comparan contra el cupo del país.
-- Idempotente.
-- ============================================================================
alter table public.campaign_config
  add column if not exists founder_caps_by_country jsonb not null default '{}'::jsonb;

update public.campaign_config set
  founder_deadline_by_country = jsonb_build_object(
    'México','2026-11-01T05:59:00Z',
    'Estados Unidos','2027-01-01T05:59:00Z','Puerto Rico','2027-01-01T05:59:00Z',
    'Brasil','2027-01-01T05:59:00Z','España','2027-01-01T05:59:00Z','Portugal','2027-01-01T05:59:00Z',
    'Chile','2027-01-01T05:59:00Z','Uruguay','2027-01-01T05:59:00Z','Panamá','2027-01-01T05:59:00Z',
    'Costa Rica','2027-01-01T05:59:00Z','Argentina','2027-01-01T05:59:00Z','Colombia','2027-01-01T05:59:00Z',
    'Perú','2027-01-01T05:59:00Z','Ecuador','2027-01-01T05:59:00Z','República Dominicana','2027-01-01T05:59:00Z',
    'Guatemala','2027-01-01T05:59:00Z','Paraguay','2027-01-01T05:59:00Z','Bolivia','2027-01-01T05:59:00Z',
    'El Salvador','2027-01-01T05:59:00Z','Honduras','2027-01-01T05:59:00Z','Nicaragua','2027-01-01T05:59:00Z',
    'Venezuela','2027-01-01T05:59:00Z','Cuba','2027-01-01T05:59:00Z'),
  founder_caps_by_country = '{
    "Estados Unidos":{"families":200,"professionals":120,"providers":60,"companies":15},
    "Brasil":{"families":150,"professionals":80,"providers":40,"companies":12},
    "México":{"families":150,"professionals":80,"providers":40,"companies":12},
    "Colombia":{"families":100,"professionals":50,"providers":25,"companies":8},
    "Argentina":{"families":100,"professionals":50,"providers":25,"companies":8},
    "España":{"families":100,"professionals":50,"providers":25,"companies":8},
    "Perú":{"families":60,"professionals":30,"providers":15,"companies":6},
    "Chile":{"families":60,"professionals":30,"providers":15,"companies":6},
    "Portugal":{"families":50,"professionals":25,"providers":12,"companies":5},
    "Ecuador":{"families":50,"professionals":25,"providers":12,"companies":5},
    "Venezuela":{"families":50,"professionals":25,"providers":12,"companies":5},
    "Guatemala":{"families":50,"professionals":25,"providers":12,"companies":5},
    "República Dominicana":{"families":40,"professionals":20,"providers":10,"companies":4},
    "Bolivia":{"families":40,"professionals":20,"providers":10,"companies":4},
    "Puerto Rico":{"families":30,"professionals":15,"providers":8,"companies":3},
    "Uruguay":{"families":30,"professionals":15,"providers":8,"companies":3},
    "Costa Rica":{"families":30,"professionals":15,"providers":8,"companies":3},
    "Panamá":{"families":30,"professionals":15,"providers":8,"companies":3},
    "Paraguay":{"families":30,"professionals":15,"providers":8,"companies":3},
    "Honduras":{"families":30,"professionals":15,"providers":8,"companies":3},
    "El Salvador":{"families":30,"professionals":15,"providers":8,"companies":3},
    "Nicaragua":{"families":30,"professionals":15,"providers":8,"companies":3},
    "Cuba":{"families":30,"professionals":15,"providers":8,"companies":3}
  }'::jsonb
where id = 1;

create or replace function public.founder_cap_for(p_country text, p_kind text)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce(
    (select (c.founder_caps_by_country #>> array[p_country, p_kind])::int
       from public.campaign_config c where c.id = 1),
    public.founder_capacity(p_kind)
  );
$$;
grant execute on function public.founder_cap_for(text,text) to anon, authenticated;

create or replace function public.founder_eligible(p_id uuid)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare v_kind text; v_country text; v_wants boolean; v_usados int; v_limite timestamptz;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  select p.country, p.wants_founder into v_country, v_wants from public.profiles p where p.id = p_id;
  if v_wants is false then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  if coalesce(v_country,'') = '' then return false; end if;
  select (value #>> '{}')::timestamptz into v_limite
  from public.campaign_config c, jsonb_each(c.founder_deadline_by_country)
  where c.id = 1 and key = v_country;
  if v_limite is not null and now() >= v_limite then return false; end if;
  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
  return v_usados < public.founder_cap_for(v_country, v_kind);
end $$;

create or replace function public.grant_founder_seat(p_id uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_kind text; v_country text; v_usados int;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  if not public.founder_eligible(p_id) then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  select p.country into v_country from public.profiles p where p.id = p_id;
  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
  if v_usados >= public.founder_cap_for(v_country, v_kind) then return false; end if;
  insert into public.founder_members (user_id, kind, country, grace_until)
  values (p_id, v_kind, v_country, null) on conflict (user_id) do nothing;
  return true;
end $$;

create or replace function public.admin_set_founder_cap(p_country text, p_kind text, p_cap integer)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  update public.campaign_config
  set founder_caps_by_country = jsonb_set(coalesce(founder_caps_by_country,'{}'::jsonb),
        array[p_country, p_kind], to_jsonb(p_cap), true)
  where id = 1;
end $$;
grant execute on function public.admin_set_founder_cap(text,text,integer) to authenticated;
