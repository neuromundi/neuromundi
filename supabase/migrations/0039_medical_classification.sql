-- ============================================================================
-- Clasificación médica / no médica del especialista (define su cuota)
-- ----------------------------------------------------------------------------
-- Criterio, alineado con los estándares reconocidos:
--   · ISCO-08 (OIT/OMS) reserva "médicos" al grupo 221: 2211 generalistas y
--     2212 especialistas. Psicología (2634), fisioterapia (2264), logopedia
--     (2266), nutrición (2265) y terapia ocupacional son profesionales de la
--     salud, pero NO médicos.
--   · Ley General de Salud de México (art. 79): enumera las profesiones
--     sanitarias que exigen título y distingue la medicina de las demás.
-- En la práctica la línea es el título de médico cirujano y, con él, la
-- facultad de diagnosticar y prescribir.
--
-- La clasificación se DERIVA de profiles.profession, pero el administrador
-- puede sobrescribirla al verificar la cédula profesional (fuente autorizada),
-- porque de esto depende cuánto paga la persona. Idempotente. Requiere 0038.
-- ============================================================================

-- Sobrescritura manual del admin: null = usar la derivación automática.
alter table public.profiles
  add column if not exists is_medical_override boolean;

-- ¿La profesión es médica? null = indeterminada ('otro' o desconocida).
create or replace function public.is_medical_profession(p_profession text)
returns boolean
language sql immutable set search_path = public as $$
  select case
    when p_profession is null or btrim(p_profession) = '' then null
    when p_profession = 'otro' then null
    when p_profession in (
      'psiquiatria', 'paidopsiquiatria', 'neuropediatria', 'neurologia',
      'pediatria', 'genetica_medica', 'medicina_rehabilitacion'
    ) then true
    when p_profession in (
      'psicologia_clinica', 'psicologia_infantil', 'neuropsicologia',
      'terapia_ocupacional', 'logopedia', 'fisioterapia', 'psicopedagogia',
      'educacion_especial', 'nutricion', 'musicoterapia'
    ) then false
    else null
  end;
$$;
grant execute on function public.is_medical_profession(text) to authenticated, service_role;

-- Tipo de afiliado efectivo de un perfil, que es lo que decide su cuota.
-- Los especialistas se separan en médicos y no médicos; el resto conserva su
-- provider_type. Ante duda ('otro' sin revisar) se toma el NO médico, para no
-- cobrarle de más a nadie por un dato que la plataforma no pudo confirmar.
create or replace function public.affiliate_type_for(p_user uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text; v_ptype text; v_prof text; v_override boolean; v_medical boolean;
begin
  select p.role, p.provider_type, p.profession, p.is_medical_override
    into v_role, v_ptype, v_prof, v_override
  from public.profiles p where p.id = p_user;

  if v_role is distinct from 'provider' then
    return coalesce(v_role, 'parent');
  end if;

  if v_ptype in ('merchant', 'school', 'clinic') then
    return v_ptype;
  end if;

  v_medical := coalesce(v_override, public.is_medical_profession(v_prof));
  if v_medical is true then
    return 'medical_specialist';
  end if;
  return 'nonmedical_specialist';
end; $$;
grant execute on function public.affiliate_type_for(uuid) to authenticated, service_role;
