-- 0194: distintivos por tipo para el directorio, SIN tocar la vista directorio_publico.
-- Devuelve solo los prestadores PUBLICADOS que tienen al menos un distintivo de tipo,
-- para que el directorio los pinte en las tarjetas.
create or replace function public.type_badge_providers()
returns table (
  id uuid,
  is_inclusive_school boolean,
  is_inclusive_company boolean,
  is_institutional_ally boolean
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id, p.is_inclusive_school, p.is_inclusive_company, p.is_institutional_ally
  from public.profiles p
  where p.role = 'provider'
    and p.is_published
    and (p.is_inclusive_school or p.is_inclusive_company or p.is_institutional_ally);
$function$;

grant execute on function public.type_badge_providers() to anon, authenticated;
