-- ============================================================================
-- 0061 — Arregla el onboarding social: el rol quedaba en 'parent' aunque el
-- usuario eligiera especialista/comercio/escuela.
--
-- CAUSA: el trigger anti-escalada `protect_profile_columns` (BEFORE UPDATE en
-- profiles) hace `NEW.role := OLD.role` para todo no-admin. El alta por login
-- social fija el tipo con `complete_onboarding`, que hace un UPDATE; ese trigger
-- REVERTÍA el rol a 'parent' pero dejaba el `provider_type`, produciendo perfiles
-- incoherentes (role='parent' + provider_type='service_provider'). El alta por
-- correo no se veía afectada porque fija el rol en el INSERT (handle_new_user),
-- que este trigger no intercepta.
--
-- SOLUCIÓN: permitir que el rol se fije UNA vez, durante el onboarding inicial
-- (mientras `rules_version_accepted` aún es NULL). Después queda bloqueado, así
-- que se conserva la protección anti-escalada. Idempotente. Aplicar tras 0060.
-- ============================================================================

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_adm boolean;
begin
  select (role = 'admin') into is_adm from public.profiles where id = auth.uid();
  if coalesce(is_adm, false) = false then
    -- El rol solo se puede fijar durante el onboarding inicial (aún sin
    -- reglamento aceptado). `OLD` es el valor PREVIO al update: en la primera
    -- vez es NULL, así que complete_onboarding sí puede fijar el rol; en
    -- ediciones posteriores ya no (anti-escalada).
    if old.rules_version_accepted is not null then
      new.role := old.role;
    end if;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

-- Reparación de datos: perfiles cuyo rol quedó revertido a 'parent' pese a haber
-- elegido un tipo de prestador (provider_type presente). Se corrigen a provider
-- y, si habían quedado exentos de cuota por ser "consumidor", pasan a 'pending'.
update public.profiles
set role = 'provider',
    membership_status = case when membership_status = 'exempt' then 'pending' else membership_status end
where role = 'parent'
  and provider_type is not null;
