-- ===========================================================================
-- 0209 · El tipo 'company' se clasificaba distinto en el correo y en el cobro.
--
-- Medido el 14 oct 2026. Las dos funciones que clasifican discrepaban:
--   ficha_affiliate_type('company', ...) -> 'company'   (lo que cotiza el correo)
--   affiliate_type_for(usuario)          -> 'nonmedical_specialist' (lo que cobra)
--
-- Hay 17 fichas de empresa. Hoy son exentas y no pagan, asi que nadie ha pagado
-- de mas, pero la discrepancia estaba viva y habria aparecido el dia que una
-- empresa pagara.
--
-- OJO: NO existe renglon de precio para 'company' en ningun pais (medido: los
-- 10 affiliate_type con precio son caregiver, clinic, legal, medical_specialist,
-- merchant, ngo, nonmedical_specialist, school, tourism, wellness). Con este
-- cambio, una empresa que llegara al cobro recibe un error claro en vez de que
-- se le cobre en silencio la tarifa de especialista. Si algun dia las empresas
-- dejan de ser gratuitas, hay que configurarles precio ANTES.
--
-- Incluye ademas el ayudante ficha_pais_por_token, que permite a reclamar-ficha
-- tomar el pais de la ficha en vez de grabar 'México' a mano en todo perfil.
-- No se toca ficha_por_token: cambiar su tipo de retorno exige borrarla, y el
-- canal de administracion agota su tiempo con los borrados.
-- ===========================================================================

create or replace function public.affiliate_type_for(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
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
  -- 'company' agregado (0209): antes caia al calculo de especialista y devolvia
  -- un tipo distinto del que cotiza el correo.
  if v_ptype in ('company', 'merchant', 'school', 'clinic', 'wellness', 'legal', 'tourism', 'caregiver') then
    return v_ptype;
  end if;
  v_medical := coalesce(v_override, public.is_medical_profession(v_prof));
  if v_medical is true then
    return 'medical_specialist';
  end if;
  return 'nonmedical_specialist';
end; $$;

create or replace function public.ficha_pais_por_token(p_token text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(d.pais, 'México')
  from public.directorio_invitaciones i
  join public.directorio d on d.id = i.directorio_id
  where i.token = p_token
  limit 1;
$$;

comment on function public.ficha_pais_por_token(text) is
  'Pais de la ficha de una invitacion. Lo usa reclamar-ficha para no grabar México a mano en todos los perfiles (migracion 0209).';

revoke all on function public.ficha_pais_por_token(text) from public, anon;
grant execute on function public.ficha_pais_por_token(text) to authenticated, service_role;
