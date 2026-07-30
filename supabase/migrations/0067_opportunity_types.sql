-- 0067_opportunity_types.sql
-- La sección de inclusión laboral pasa de solo "empleo" a tres tipos de
-- oportunidad: empleo (employment), voluntariado (volunteering) y servicio
-- social (social_service). Empresas y ONG pueden publicar los tres.
-- Idempotente.

alter table public.job_openings
  add column if not exists opportunity_type text not null default 'employment';

alter table public.job_openings drop constraint if exists job_openings_type_check;
alter table public.job_openings add constraint job_openings_type_check
  check (opportunity_type in ('employment', 'volunteering', 'social_service'));

create index if not exists job_openings_type_idx
  on public.job_openings (opportunity_type, is_active, country);

-- Reemplaza public_jobs para incluir el tipo (columna + filtro opcional).
drop function if exists public.public_jobs(text);
drop function if exists public.public_jobs(text, text);
create or replace function public.public_jobs(p_country text default null, p_type text default null)
returns table (
  id               uuid,
  company_name     text,
  company_id       uuid,
  opportunity_type text,
  positions        int,
  title            text,
  experience       text,
  education        text,
  salary_text      text,
  country          text,
  city             text,
  skills           text,
  apply_email      text,
  apply_url        text,
  note             text,
  created_at       timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    j.id,
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Neuromundi'),
    j.company_id,
    j.opportunity_type,
    j.positions, j.title, j.experience, j.education, j.salary_text,
    j.country, j.city, j.skills, j.apply_email, j.apply_url, j.note, j.created_at
  from public.job_openings j
  join public.profiles p on p.id = j.company_id
  where j.is_active = true
    and (p_country is null or j.country = p_country)
    and (p_type is null or j.opportunity_type = p_type)
  order by j.created_at desc;
$$;
grant execute on function public.public_jobs(text, text) to anon, authenticated;
