-- 0241 · M-18: la version del reglamento se guardaba y nunca se volvia a
-- preguntar. (Auditoria del 15 oct 2026.)
--
-- Medido: la barrera de alta solo comprueba que rules_version_accepted NO SEA
-- NULO, no que coincida con la version vigente. El dia que se actualice el
-- reglamento, nadie lo volvera a aceptar y el campo quedara mintiendo.
--
-- Tres decisiones:
--
-- 1. La version vigente pasa a vivir en el SERVIDOR. Hoy esta escrita a mano en
--    tres sitios (src/lib/legal.ts, la funcion de borde reclamar-ficha y el
--    alta) y ya es la clase de constante que se desincroniza. Quien acepta no
--    declara QUE version acepta: el servidor se lo dice.
--
-- 2. NO se endurece la barrera de alta. Si needsOnboarding pasara a comparar
--    versiones, al cambiar el texto legal TODOS los miembros quedarian
--    encerrados en el formulario de alta completo, que es otra cosa. La
--    re-aceptacion es un aviso aparte, ligero, que no cierra la plataforma
--    (src/components/legal/ReglamentoActualizado.tsx).
--
-- 3. protect_profile_columns congelaba la columna en cuanto se escribia una vez:
--    con la bandera de privilegio puesta pero el campo ya con valor, v_alta
--    queda en falso y el guardia REVIERTE la escritura en silencio. Se abre una
--    sola puerta nombrada, que solo pone aceptar_reglamento().

create or replace function public.reglamento_vigente()
returns text
language sql
immutable
as $function$ select '2026-07'::text; $function$;

comment on function public.reglamento_vigente() is
  'Version vigente del reglamento. UNICA fuente de verdad: el frontend y las funciones de borde la leen de aqui.';

grant execute on function public.reglamento_vigente() to anon, authenticated, service_role;

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare is_adm boolean; v_uid uuid; v_libre boolean; v_alta boolean; v_reacepta boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then return new; end if;
  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;
  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';
  v_reacepta := coalesce(current_setting('app.reacepta_reglamento', true), '') = '1';

  -- Alta: primera aceptacion. Re-aceptacion: el reglamento cambio y el usuario
  -- lo vuelve a aceptar por la via de aceptar_reglamento().
  v_alta := v_libre and (old.rules_version_accepted is null or v_reacepta);

  if not v_alta then
    new.role := old.role;
    new.rules_version_accepted := old.rules_version_accepted;
  end if;

  new.is_verified := old.is_verified;
  new.is_advisor  := old.is_advisor;
  new.badge_level := old.badge_level;
  new.is_medical_override := old.is_medical_override;
  new.member_no   := old.member_no;

  if not v_libre then
    new.sector                 := old.sector;
    new.membership_status      := old.membership_status;
    new.membership_due_at      := old.membership_due_at;
    new.membership_paid_until  := old.membership_paid_until;
    new.membership_cancelada_en := old.membership_cancelada_en;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.promo_code_used        := old.promo_code_used;
    new.referral_credit_pct    := old.referral_credit_pct;
    new.referred_by            := old.referred_by;
    new.referred_at            := old.referred_at;
    new.fundador_autorizado     := old.fundador_autorizado;
    new.fundador_autorizado_en  := old.fundador_autorizado_en;
    new.fundador_autorizado_por := old.fundador_autorizado_por;
    new.empresa_plazo_desde    := old.empresa_plazo_desde;
    new.empresa_limitada       := old.empresa_limitada;
    new.exencion_tipo          := old.exencion_tipo;
    new.exencion_folio         := old.exencion_folio;
    new.exencion_documento     := old.exencion_documento;
    new.exencion_solicitada_en := old.exencion_solicitada_en;
    new.exencion_aprobada_en   := old.exencion_aprobada_en;
    new.exencion_aprobada_por  := old.exencion_aprobada_por;
    new.exencion_vigente_hasta := old.exencion_vigente_hasta;
    new.exencion_rechazo       := old.exencion_rechazo;
    new.suspended_at           := old.suspended_at;
    new.suspend_until          := old.suspend_until;
    new.winback_until          := old.winback_until;
    new.pre_suspend_published  := old.pre_suspend_published;
  end if;
  return new;
end;
$function$;

create or replace function public.aceptar_reglamento()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_ver text; v_rol text; v_quedo text;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'motivo', 'sin_sesion'); end if;
  v_ver := public.reglamento_vigente();
  select role into v_rol from public.profiles where id = v_me;
  if v_rol is null then return jsonb_build_object('ok', false, 'motivo', 'sin_perfil'); end if;

  perform set_config('app.perfil_privilegiado', '1', true);
  perform set_config('app.reacepta_reglamento', '1', true);
  update public.profiles
     set rules_version_accepted = v_ver,
         rules_accepted_at = now()
   where id = v_me
  returning rules_version_accepted into v_quedo;
  perform set_config('app.reacepta_reglamento', '0', true);
  perform set_config('app.perfil_privilegiado', '0', true);

  -- Se comprueba lo que QUEDO en la fila, no lo que se intento escribir: el
  -- guardia es un disparador BEFORE y puede revertir en silencio.
  if v_quedo is distinct from v_ver then
    return jsonb_build_object('ok', false, 'motivo', 'no_se_pudo_registrar');
  end if;

  insert into public.user_agreements (user_id, user_type, doc_version, accepted_at)
  values (v_me, v_rol, v_ver, now());

  return jsonb_build_object('ok', true, 'version', v_ver);
end $function$;

revoke all on function public.aceptar_reglamento() from public, anon;
grant execute on function public.aceptar_reglamento() to authenticated;

comment on function public.aceptar_reglamento() is
  'Registra la aceptacion del reglamento VIGENTE por el usuario de la sesion. No recibe la version: la pone el servidor.';
