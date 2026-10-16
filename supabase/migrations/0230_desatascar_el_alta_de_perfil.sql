-- 0230 · El alta de perfil quedaba en bucle, y dos columnas sin proteger.
--
-- (Auditoría del 15 oct 2026, hallazgos A-7 y A-19.)
--
-- A-7: la 0215 cerro bien una via de escalada —antes el rol solo se fijaba si
-- rules_version_accepted no era nulo, asi que bastaba vaciarlo para cambiarse
-- el rol— y paso a fijarlo SIEMPRE. Pero nadie ajusto complete_onboarding, que
-- es justo quien tiene que escribir el rol y la aceptacion la primera vez. El
-- alta no grababa nada y el usuario volvia a la pantalla de alta cada vez. No
-- se veia porque los perfiles existentes son anteriores a la 0215.
--
-- Se libera el rol y la aceptacion SOLO si se cumplen las dos cosas a la vez:
-- la bandera de privilegio esta puesta (solo la pone complete_onboarding, que
-- es security definer y el cliente no puede invocar con la bandera), y el
-- perfil aun no tiene aceptacion grabada. Una vez grabada quedan fijos para
-- siempre, que es lo que la 0215 queria.
--
-- A-19: badge_level e is_medical_override eran editables por el propio usuario
-- con un PATCH sobre su fila. Se anaden a las columnas fijadas, junto a
-- member_no.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare is_adm boolean; v_uid uuid; v_libre boolean; v_alta boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then return new; end if;
  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;
  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';

  v_alta := v_libre and old.rules_version_accepted is null;

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

create or replace function public.complete_onboarding(
  p_role text, p_provider_type text, p_full_name text, p_country text,
  p_state text, p_municipality text, p_rules_version text,
  p_school_grades text[] default '{}'::text[]
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid  uuid := auth.uid();
  v_done boolean := false;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_role not in ('patient', 'parent', 'provider') then
    raise exception 'Rol no permitido';
  end if;

  perform set_config('app.perfil_privilegiado', '1', true);

  update public.profiles set
    role          = p_role,
    provider_type = case when p_role = 'provider' then nullif(p_provider_type, '') else null end,
    full_name     = coalesce(nullif(p_full_name, ''), full_name),
    country       = nullif(p_country, ''),
    state         = nullif(p_state, ''),
    municipality  = nullif(p_municipality, ''),
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

revoke all on function public.complete_onboarding(text,text,text,text,text,text,text,text[]) from public, anon;
grant execute on function public.complete_onboarding(text,text,text,text,text,text,text,text[]) to authenticated;
