-- ============================================================================
-- 0309 — El alta exige pais en el servidor, no solo en el navegador
--
-- Un perfil pudo quedarse sin pais: `complete_onboarding` aceptaba la cadena
-- vacia y la guardaba como nulo. El formulario SI exige el pais para todos los
-- tipos de registro, pero la comprobacion vivia solo en el navegador, asi que
-- cualquier llamada que no pasara por el formulario dejaba el perfil sin pais.
-- Un perfil sin pais no entra en el cupo de fundadores de su pais, no recibe
-- la cuota correcta y no aparece en los informes por pais.
--
-- Comprobado DOS VECES antes de poner el candado:
--   1. el pais es obligatorio en el esquema de registro para TODOS los tipos
--      (`reg.errRequired` en src/lib/schemas.ts);
--   2. la unica ruta viva que llama a esta funcion es ese formulario
--      (`completeProfile` en src/stores/authStore.ts; `completeOnboarding` no
--      se invoca desde ninguna pantalla).
-- El candado no puede bloquear ningun alta legitima.
--
-- Tambien se limpian con btrim el estado y el municipio, que podian guardarse
-- con espacios al principio o al final.
-- ============================================================================

create or replace function public.complete_onboarding(
  p_role text, p_provider_type text, p_full_name text, p_country text,
  p_state text, p_municipality text, p_rules_version text,
  p_school_grades text[] default '{}'::text[]
)
returns boolean
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid  uuid := auth.uid();
  v_done boolean := false;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_role not in ('patient', 'parent', 'provider') then
    raise exception 'Rol no permitido';
  end if;
  -- El pais es obligatorio: sin el, el perfil queda fuera del cupo de
  -- fundadores, de la cuota de su pais y de los informes.
  if coalesce(btrim(p_country), '') = '' then
    raise exception 'Falta el pais';
  end if;

  -- Bandera de privilegio: el disparador la exige para dejar escribir el rol y
  -- la aceptacion, y solo en el primer alta. Es local a la transaccion.
  perform set_config('app.perfil_privilegiado', '1', true);

  update public.profiles set
    role          = p_role,
    provider_type = case when p_role = 'provider' then nullif(p_provider_type, '') else null end,
    full_name     = coalesce(nullif(p_full_name, ''), full_name),
    country       = btrim(p_country),
    state         = nullif(btrim(p_state), ''),
    municipality  = nullif(btrim(p_municipality), ''),
    school_grades = case
                      when p_role = 'provider' and p_provider_type = 'school'
                        then coalesce(p_school_grades, '{}')
                      else '{}'
                    end,
    membership_status = case when p_role in ('parent', 'patient') then 'exempt' else 'pending' end,
    rules_version_accepted = p_rules_version,
    rules_accepted_at      = now()
  where id = v_uid
    and rules_version_accepted is null;

  get diagnostics v_done = row_count;

  perform set_config('app.perfil_privilegiado', '', true);

  if v_done then
    insert into public.user_agreements (user_id, user_type, doc_version)
    values (v_uid, p_role, p_rules_version)
    on conflict do nothing;
  end if;

  return v_done;
end;
$function$;
