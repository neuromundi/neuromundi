-- 0215 — CIERRE DE DOS ESCALADAS A ADMINISTRADOR.
--
-- Halladas en la auditoria del 14 de octubre de 2026. Las dos estaban VIVAS en
-- produccion y las dos entregan control total de la plataforma.
--
-- FALLA 1 — Alta publica con rol a eleccion.
--   handle_new_user tomaba el rol de los metadatos que manda el navegador en
--   /auth/v1/signup y lo insertaba tal cual en profiles.role:
--       v_role := COALESCE(NULLIF(m->>'role',''), 'parent');
--   El CHECK de la columna admite 'admin'. Bastaba una sola peticion HTTP sin
--   sesion, con {"data":{"role":"admin"}}, para nacer administrador: las 81
--   funciones admin_*, las politicas que confian en is_admin(), los correos
--   del directorio y los tokens de invitacion.
--   CORRECCION: lista blanca. Solo 'patient', 'parent' y 'provider' pueden
--   llegar por esta via; cualquier otra cosa cae a 'parent'. 'admin' se otorga
--   a mano en la base y nunca por el alta publica.
--
-- FALLA 2 — Promocion a admin desde una cuenta ya existente.
--   protect_profile_columns fijaba el rol SOLO si el perfil ya habia aceptado
--   el reglamento:
--       if old.rules_version_accepted is not null then new.role := old.role; end if;
--   y rules_version_accepted NO estaba en la lista de columnas protegidas. Dos
--   peticiones bastaban: poner rules_version_accepted en null, y luego
--   role='admin'. Una cuenta recien creada ya nace con ese campo en null, asi
--   que muchas veces ni hacia falta el primer paso.
--   CORRECCION: el rol se fija SIEMPRE para quien no es admin, y
--   rules_version_accepted pasa a ser columna protegida.
--
-- FALLA 3 (incluida aqui, misma lista) — Descuento autoconcedido.
--   referral_credit_pct, referred_by y referred_at no estaban protegidas, y
--   create-membership-checkout las usa para calcular el cupon de Stripe. Con
--   la configuracion actual (5 % / 50 % maximo) cualquiera podia regalarse
--   hasta un 52.5 % sobre su primera cuota editando su propio perfil.
--   CORRECCION: las tres pasan a columnas protegidas.
--
-- Verificado antes de escribir esto: el cliente NUNCA actualiza profiles.role
-- (ninguna llamada a .update() lo incluye), asi que fijarlo siempre no rompe
-- ningun flujo de la aplicacion.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare is_adm boolean; v_uid uuid; v_libre boolean;
begin
  v_uid := auth.uid();
  -- Sin sesión de usuario final (rol de servicio: webhook de Stripe, cron,
  -- funciones de borde) no se toca nada: esas rutas son de confianza.
  if v_uid is null then return new; end if;

  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;

  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';

  -- El rol se fija SIEMPRE, sin condicion. La version condicionada anterior
  -- era la escalada descrita arriba.
  new.role := old.role;
  -- Y la columna de la que dependia la condicion deja de ser editable, para
  -- que no vuelva a servir de palanca.
  new.rules_version_accepted := old.rules_version_accepted;
  new.is_verified := old.is_verified;
  new.is_advisor  := old.is_advisor;

  if not v_libre then
    -- dinero y clasificación que decide si se paga
    new.sector                 := old.sector;
    new.membership_status      := old.membership_status;
    new.membership_due_at      := old.membership_due_at;
    new.membership_paid_until  := old.membership_paid_until;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.promo_code_used        := old.promo_code_used;
    -- programa de recomendacion: alimenta el cupon de Stripe, no es editable
    new.referral_credit_pct    := old.referral_credit_pct;
    new.referred_by            := old.referred_by;
    new.referred_at            := old.referred_at;
    -- expediente de exención
    new.exencion_tipo          := old.exencion_tipo;
    new.exencion_folio         := old.exencion_folio;
    new.exencion_documento     := old.exencion_documento;
    new.exencion_solicitada_en := old.exencion_solicitada_en;
    new.exencion_aprobada_en   := old.exencion_aprobada_en;
    new.exencion_aprobada_por  := old.exencion_aprobada_por;
    new.exencion_vigente_hasta := old.exencion_vigente_hasta;
    new.exencion_rechazo       := old.exencion_rechazo;
    -- nadie levanta su propia suspensión
    new.suspended_at           := old.suspended_at;
    new.suspend_until          := old.suspend_until;
    new.winback_until          := old.winback_until;
    new.pre_suspend_published  := old.pre_suspend_published;
  end if;

  return new;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- FALLA 1: lista blanca de roles en el alta publica.
-- Cuerpo identico al anterior salvo la resolucion de v_role.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
DECLARE
  m        JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_pedido TEXT  := COALESCE(NULLIF(m->>'role', ''), 'parent');
  -- LISTA BLANCA: el rol lo manda el navegador y por tanto no es de fiar.
  -- 'admin' no se concede nunca por esta via.
  v_role   TEXT  := CASE WHEN v_pedido IN ('patient','parent','provider')
                         THEN v_pedido ELSE 'parent' END;
  v_rules TEXT  := NULLIF(m->>'rules_version', '');
  v_grades TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'school_grades') = 'array' THEN m->'school_grades' ELSE '[]'::jsonb END)), '{}');
  v_interests TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'interests') = 'array' THEN m->'interests' ELSE '[]'::jsonb END)), '{}');
  v_specialties TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'specialties') = 'array' THEN m->'specialties' ELSE '[]'::jsonb END)), '{}');
  v_modalities TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'modalities') = 'array' THEN m->'modalities' ELSE '[]'::jsonb END)), '{}');
  v_ages TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'age_ranges') = 'array' THEN m->'age_ranges' ELSE '[]'::jsonb END)), '{}');
  v_areas TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'intervention_areas') = 'array' THEN m->'intervention_areas' ELSE '[]'::jsonb END)), '{}');
  v_sections TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'sections') = 'array' THEN m->'sections' ELSE '[]'::jsonb END)), '{}');
  v_conditions TEXT[] := COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(m->'neuro_conditions') = 'array' THEN m->'neuro_conditions' ELSE '[]'::jsonb END)), '{}');
  v_details JSONB := CASE WHEN jsonb_typeof(m->'provider_details') = 'object' THEN m->'provider_details' ELSE '{}'::jsonb END;
BEGIN
  INSERT INTO public.profiles (
    id, role, full_name, provider_type, business_name, is_company,
    birth_date, gender, condition, country, state, municipality,
    address, phone, services_offered, latitude, longitude,
    website, instagram, tiktok, facebook, cedula_profesional,
    school_grades, account_type, life_stage, interests, comms_opt_in,
    title_prefix, profession, bio, whatsapp, booking_url, linkedin,
    specialties, modalities, age_ranges, intervention_areas, provider_details, rfc,
    sections, neuro_conditions,
    membership_status, rules_version_accepted, rules_accepted_at
  ) VALUES (
    NEW.id, v_role,
    COALESCE(NULLIF(m->>'full_name', ''), ''),
    NULLIF(m->>'provider_type', ''),
    NULLIF(m->>'business_name', ''),
    COALESCE((m->>'is_company')::boolean, FALSE),
    NULLIF(m->>'birth_date', '')::date,
    NULLIF(m->>'gender', ''),
    NULLIF(m->>'condition', ''),
    NULLIF(m->>'country', ''),
    NULLIF(m->>'state', ''),
    NULLIF(m->>'municipality', ''),
    NULLIF(m->>'address', ''),
    NULLIF(m->>'phone', ''),
    NULLIF(m->>'services_offered', ''),
    NULLIF(m->>'latitude', '')::double precision,
    NULLIF(m->>'longitude', '')::double precision,
    NULLIF(m->>'website', ''),
    NULLIF(m->>'instagram', ''),
    NULLIF(m->>'tiktok', ''),
    NULLIF(m->>'facebook', ''),
    NULLIF(m->>'cedula_profesional', ''),
    v_grades,
    NULLIF(m->>'account_type', ''),
    NULLIF(m->>'life_stage', ''),
    v_interests,
    COALESCE((m->>'comms_opt_in')::boolean, FALSE),
    NULLIF(m->>'title_prefix', ''),
    NULLIF(m->>'profession', ''),
    NULLIF(m->>'bio', ''),
    NULLIF(m->>'whatsapp', ''),
    NULLIF(m->>'booking_url', ''),
    NULLIF(m->>'linkedin', ''),
    v_specialties, v_modalities, v_ages, v_areas, v_details,
    NULLIF(m->>'rfc', ''),
    v_sections, v_conditions,
    CASE WHEN v_role IN ('parent', 'patient') THEN 'exempt' ELSE 'pending' END,
    v_rules,
    CASE WHEN v_rules IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_rules IS NOT NULL THEN
    INSERT INTO public.user_agreements (user_id, user_type, doc_version)
    VALUES (NEW.id, v_role, v_rules);
  END IF;

  RETURN NEW;
END;
$fn$;
