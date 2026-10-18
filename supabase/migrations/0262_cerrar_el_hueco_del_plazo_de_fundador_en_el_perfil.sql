-- 0262: tapar el hueco que abrio la 0261.
--
-- Que estaba mal: la 0261 agrego profiles.fundador_hasta y puso a
-- founder_eligible() a obedecer esa columna por encima de la fecha del pais.
-- Pero el disparador protect_profile_columns protege por lista explicita, y la
-- columna nueva no estaba en la lista. Resultado comprobado con una prueba:
-- cualquier usuario con sesion podia correr
--     update profiles set fundador_hasta = '2099-01-01' where id = auth.uid()
-- y quedarse con tarifa de fundador para siempre, saltandose ademas el cierre
-- de la campana. No hacia falta ser admin ni nada parecido.
--
-- Como se cierra, en dos capas:
--   1. El disparador devuelve la columna a su valor anterior salvo que la
--      escritura venga del reclamo de ficha, que se identifica con una marca
--      de transaccion que el cliente no puede poner.
--   2. founder_eligible() toma ademas el menor entre el plazo del perfil y el
--      del pais, asi que aunque alguna via futura escribiera una fecha tardia,
--      el cierre de la campana sigue mandando.

create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare is_adm boolean; v_uid uuid; v_libre boolean; v_alta boolean; v_reacepta boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then return new; end if;
  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;
  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';
  v_reacepta := coalesce(current_setting('app.reacepta_reglamento', true), '') = '1';

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

  -- 0262: el plazo de fundador solo lo escribe el reclamo de ficha. Ni el
  -- usuario ni las vias "privilegiadas" de alta pueden tocarlo.
  if coalesce(current_setting('app.sella_plazo_fundador', true), '') <> '1' then
    new.fundador_hasta := old.fundador_hasta;
  end if;

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
end $$;

-- El reclamo levanta la marca solo para su propia escritura y la baja enseguida.
create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_ficha uuid; v_hasta timestamptz;
begin
  select i.directorio_id, i.fundador_hasta into v_ficha, v_hasta
  from public.directorio_invitaciones i
  where i.token = p_token
    and i.usada_en is null
    and i.baja_en is null
    and i.cancelada_en is null
    and i.expira_en > now();

  if v_ficha is null then return false; end if;

  update public.directorio
     set reclamada_por = p_perfil, reclamada_en = now(), actualizada_en = now()
   where id = v_ficha;

  if v_hasta is not null then
    perform set_config('app.sella_plazo_fundador', '1', true);
    update public.profiles
       set fundador_hasta = v_hasta
     where id = p_perfil and fundador_hasta is null;
    perform set_config('app.sella_plazo_fundador', '0', true);
  end if;

  update public.directorio_invitaciones set usada_en = now() where token = p_token;
  return true;
end $$;

-- Segunda capa: la fecha del pais sigue siendo el tope, se mire por donde se mire.
create or replace function public.founder_eligible(p_id uuid)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare v_kind text; v_country text; v_wants boolean; v_usados int;
        v_limite timestamptz; v_auth boolean; v_propio timestamptz; v_pais_lim timestamptz;
begin
  if exists (select 1 from public.founder_members where user_id = p_id) then return true; end if;
  select p.country, p.wants_founder, coalesce(p.fundador_autorizado, false), p.fundador_hasta
    into v_country, v_wants, v_auth, v_propio
  from public.profiles p where p.id = p_id;
  if coalesce(v_auth, false) then return true; end if;
  if v_wants is false then return false; end if;
  v_kind := public.founder_kind_for(p_id);
  if v_kind is null then return false; end if;
  if coalesce(v_country,'') = '' then return false; end if;

  -- 0262: manda el MENOR entre el plazo sellado y el cierre del pais.
  v_pais_lim := public.founder_country_deadline(v_country);
  v_limite := least(coalesce(v_propio, v_pais_lim), coalesce(v_pais_lim, v_propio));
  if v_limite is not null and now() >= v_limite then return false; end if;

  select count(*) into v_usados
  from public.founder_members fm join public.profiles p on p.id = fm.user_id
  where fm.kind = v_kind and coalesce(p.is_internal,false) = false and p.country = v_country;
  return v_usados < public.founder_cap_for(v_country, v_kind);
end $$;
