-- La empresa ya puede decir a qué área va dirigida su vacante, pero la lista
-- pública de /inclusion-laboral la lee por esta función, que no devolvía la
-- columna: sin esto el dato quedaría guardado y nadie lo vería.
--
-- Nombre nuevo porque cambiar el RETURNS TABLE obliga a borrar la función
-- anterior, y el borrado de funciones por esta vía se queda colgado.
-- public_jobs(text, text) queda sin uso y se retira en la limpieza pendiente.
create or replace function public.public_jobs_con_areas(p_country text default null, p_type text default null)
returns table(
  id uuid, company_name text, company_id uuid, opportunity_type text,
  positions integer, title text, experience text, education text,
  salary_text text, country text, city text, skills text,
  apply_email text, apply_url text, note text, created_at timestamptz,
  sections text[]
)
language sql
stable
security definer
set search_path to 'public'
as $f$
  select
    j.id,
    coalesce(nullif(p.business_name, ''), nullif(p.full_name, ''), 'Neuromundi'),
    j.company_id,
    j.opportunity_type,
    j.positions, j.title, j.experience, j.education, j.salary_text,
    j.country, j.city, j.skills, j.apply_email, j.apply_url, j.note, j.created_at,
    j.sections
  from public.job_openings j
  join public.profiles p on p.id = j.company_id
  where j.is_active = true
    and (p_country is null or j.country = p_country)
    and (p_type is null or j.opportunity_type = p_type)
  order by j.created_at desc;
$f$;

-- La bolsa de trabajo es pública: se consulta sin sesión, igual que la anterior.
grant execute on function public.public_jobs_con_areas(text, text) to anon, authenticated;
