-- 0112: affiliate_type_for reconoce wellness/legal/tourism/caregiver como
-- tipos con cuota propia (igual que merchant/school/clinic), para que el precio
-- mostrado en el registro (registration_quote) cuadre con el importe cobrado en
-- Stripe (create-membership-checkout → membership_price_for por esta misma clave).
-- Antes, esos 4 tipos caían a especialista médico/no médico según la profesión,
-- de modo que el prestador veía una cuota y pagaba otra.
-- Idempotente: create or replace, misma firma (returns text).
create or replace function public.affiliate_type_for(p_user uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_role text; v_ptype text; v_prof text; v_override boolean; v_medical boolean;
begin
  select p.role, p.provider_type, p.profession, p.is_medical_override
    into v_role, v_ptype, v_prof, v_override
  from public.profiles p where p.id = p_user;
  if v_role is distinct from 'provider' then
    return coalesce(v_role, 'parent');
  end if;
  if v_ptype = 'ngo' then
    return 'ngo';
  end if;
  if v_ptype in ('merchant', 'school', 'clinic', 'wellness', 'legal', 'tourism', 'caregiver') then
    return v_ptype;
  end if;
  v_medical := coalesce(v_override, public.is_medical_profession(v_prof));
  if v_medical is true then
    return 'medical_specialist';
  end if;
  return 'nonmedical_specialist';
end; $function$;
