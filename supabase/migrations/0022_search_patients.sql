-- ============================================================================
-- search_patients — el especialista localiza al paciente/tutor por:
--   * folio NM (member_no exacto),
--   * nombre o apellido (full_name),
--   * consentimiento clínico otorgado a este especialista,
--   * recetas previas emitidas por este especialista.
-- SECURITY DEFINER (acotada al prestador que llama). Privacidad: la búsqueda por
-- nombre se limita a pacientes con relación previa; el folio permite ubicar a
-- cualquier persona por su número de registro (como en denuncias). Idempotente.
-- ============================================================================

create or replace function public.search_patients(p_query text)
returns table (member_no bigint, full_name text, avatar_url text, relation text)
language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_role   text;
  v_q      text := btrim(coalesce(p_query, ''));
  v_digits text := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
begin
  if v_me is null then return; end if;
  select role into v_role from public.profiles where id = v_me;
  if v_role is distinct from 'provider' then return; end if;

  return query
  with rel as (
    -- Pacientes con consentimiento clínico vigente hacia este especialista.
    select c.patient_id as uid, 'consent'::text as relation
      from public.clinical_consents c
      where c.provider_id = v_me and c.revoked_at is null
    union all
    -- Personas a las que este especialista ha emitido recetas.
    select p.parent_id as uid, 'prescription'::text as relation
      from public.prescriptions p
      where p.therapist_id = v_me
  ),
  candidates as (
    -- Relacionados (consentimiento / recetas).
    select pr.member_no, pr.full_name, pr.avatar_url, min(rel.relation) as relation
      from rel
      join public.profiles pr on pr.id = rel.uid
      where pr.member_no is not null
      group by pr.member_no, pr.full_name, pr.avatar_url
    union
    -- Búsqueda directa por folio exacto (aunque no haya relación previa).
    select pr.member_no, pr.full_name, pr.avatar_url, 'folio'::text
      from public.profiles pr
      where v_digits <> '' and pr.member_no = v_digits::bigint
  )
  select c.member_no, max(c.full_name) as full_name, max(c.avatar_url) as avatar_url, min(c.relation) as relation
    from candidates c
    where
      v_q = ''
      or c.full_name ilike '%' || v_q || '%'
      or (v_digits <> '' and c.member_no = v_digits::bigint)
    group by c.member_no
    order by 2
    limit 25;
end;
$$;

grant execute on function public.search_patients(text) to authenticated;
