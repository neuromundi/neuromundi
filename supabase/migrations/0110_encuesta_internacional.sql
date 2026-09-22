-- ============================================================================
-- 0110 · Primera Encuesta Internacional (neurodesarrollo, neurodivergencia,
--        afecciones neurológicas)
--
-- Recolección NATIVA y ANÓNIMA. Esquema flexible: los datos de identificación
-- básicos van en columnas; el resto de respuestas (ramificadas por rol/sección)
-- en `answers jsonb`, para poder ampliar el cuestionario sin migrar de nuevo.
--
-- RLS: cualquiera puede INSERTAR una respuesta SOLO con consentimiento
-- (consent = true); solo el admin puede LEER. La RPC agregada `survey_results`
-- (SECURITY DEFINER, acotada por is_admin) entrega conteos para el informe.
-- Datos sensibles de salud: tratamiento solo agregado; sin PII obligatoria.
-- Idempotente.
-- ============================================================================

create table if not exists public.survey_responses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lang        text,
  role        text,
  country     text,
  sections    text[] not null default '{}',
  answers     jsonb  not null default '{}'::jsonb,
  consent     boolean not null default false,
  source      text,
  user_id     uuid            -- opcional; NULL si se responde sin sesión
);

create index if not exists survey_responses_created_idx on public.survey_responses (created_at);
create index if not exists survey_responses_sections_idx on public.survey_responses using gin (sections);

alter table public.survey_responses enable row level security;

-- INSERT abierto (anónimo o con sesión) SOLO con consentimiento explícito.
drop policy if exists survey_insert on public.survey_responses;
create policy survey_insert on public.survey_responses
  for insert to anon, authenticated
  with check (consent = true);

-- LECTURA solo para admin (respaldo; el agregado sale por RPC).
drop policy if exists survey_admin_select on public.survey_responses;
create policy survey_admin_select on public.survey_responses
  for select to authenticated
  using ((select public.is_admin()));

grant insert on public.survey_responses to anon, authenticated;
grant select on public.survey_responses to authenticated;

-- Resultados AGREGADOS (solo admin). Nunca expone respuestas individuales.
create or replace function public.survey_results()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then
    raise exception 'no autorizado';
  end if;
  select jsonb_build_object(
    'total', (select count(*) from public.survey_responses),
    'by_role', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                from (select coalesce(role,'-') k, count(*) n from public.survey_responses group by 1) t),
    'by_country', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                from (select coalesce(country,'-') k, count(*) n from public.survey_responses group by 1) t),
    'by_section', (select coalesce(jsonb_object_agg(s, n), '{}'::jsonb)
                from (select unnest(sections) s, count(*) n from public.survey_responses group by 1) t)
  ) into r;
  return r;
end $$;

revoke all on function public.survey_results() from public, anon, authenticated;
grant execute on function public.survey_results() to authenticated;
