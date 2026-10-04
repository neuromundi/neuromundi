-- 0193: Distintivos otorgados por admin para tipos de miembro:
-- Escuela Inclusiva, Empresa Inclusiva y Aliados Neuromundi (institucional).
alter table public.profiles
  add column if not exists is_inclusive_school  boolean not null default false,
  add column if not exists is_inclusive_company boolean not null default false,
  add column if not exists is_institutional_ally boolean not null default false;

-- Setter genérico (solo admin) con lista blanca de banderas booleanas de distintivo.
create or replace function public.admin_set_profile_flag(p_id uuid, p_flag text, p_value boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_flag not in ('neuroaffirming','is_inclusive_school','is_inclusive_company','is_institutional_ally') then
    raise exception 'Distintivo no permitido: %', p_flag;
  end if;
  update public.profiles set
    neuroaffirming        = case when p_flag = 'neuroaffirming'        then p_value else neuroaffirming end,
    is_inclusive_school   = case when p_flag = 'is_inclusive_school'   then p_value else is_inclusive_school end,
    is_inclusive_company  = case when p_flag = 'is_inclusive_company'  then p_value else is_inclusive_company end,
    is_institutional_ally = case when p_flag = 'is_institutional_ally' then p_value else is_institutional_ally end
  where id = p_id;
end;
$function$;
