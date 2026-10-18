-- 0264: invertir la proteccion de perfiles de lista negra a lista blanca.
--
-- El problema de fondo: protect_profile_columns enumeraba lo PROHIBIDO. Toda
-- columna nueva nacia permitida y nadie se enteraba. Asi se colo fundador_hasta
-- el 17 de octubre, y asi llevaban tiempo coladas otras que encontre midiendo:
--
--   · stripe_connect_id      -> la cuenta que recibe el dinero
--   · stripe_charges_enabled -> declararse habilitado para cobrar
--   · is_internal            -> salirse de los conteos de cupo y de metricas
--   · qr_token, public_key   -> identificadores propios
--   · org_doc_status / org_doc_reviewed_at -> el resultado de SU PROPIA revision
--
-- Comprobado con una sesion de usuario comun: las escribia sin obstaculo.
--
-- Como queda: lo de siempre se conserva tal cual, y al final se agrega una
-- reja. Se comparan la fila nueva y la vieja; si cambio alguna columna que no
-- esta en la lista de permitidas, la escritura se RECHAZA nombrandola. Una
-- columna nueva nace prohibida hasta que alguien la agregue aqui a proposito.
--
-- Nota: este disparador solo mira las escrituras que traen sesion de usuario.
-- Lo que hace el servidor con su propia llave no pasa por aqui, asi que los
-- cobros, las altas y las funciones de borde siguen escribiendo lo que deben.

create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  is_adm boolean; v_uid uuid; v_libre boolean; v_alta boolean; v_reacepta boolean;
  v_sella boolean; v_permitidas text[]; v_intrusas text[];
begin
  v_uid := auth.uid();
  if v_uid is null then return new; end if;
  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;
  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';
  v_reacepta := coalesce(current_setting('app.reacepta_reglamento', true), '') = '1';
  v_sella := coalesce(current_setting('app.sella_plazo_fundador', true), '') = '1';

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

  if not v_sella then
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

  -- ── La reja: lo que el usuario SI puede cambiar de su propio perfil ──
  v_permitidas := array[
    'accepts_neuromundi_id','accepts_payments','account_type','address','age_ranges',
    'avatar_url','bio','birth_date','booking_url','business_name','cedula_profesional',
    'certified_staff','city','comms_opt_in','condition','consultation_amount',
    'consultation_currency','country','dial_code','facebook','fiscal_country','fiscal_cp',
    'fiscal_direccion','fiscal_email','fiscal_razon_social','fiscal_regimen','fiscal_tax_id',
    'fiscal_uso_cfdi','full_name','gender','instagram','interests','intervention_areas',
    'is_company','is_inclusive_company','is_inclusive_school','is_institutional_ally',
    'is_published','latitude','life_stage','linkedin','longitude','membership_period',
    'modalities','municipality','neuro_conditions','neuroaffirming','org_doc_kind',
    'org_doc_note','org_doc_submitted_at','org_doc_url','phone','price_range',
    'product_categories','products_offered','profession','provider_details','provider_type',
    'rfc','sales_channels','school_grades','sections','services_offered','shipping_coverage',
    'specialties','state','tiktok','title_prefix','wants_founder','website','website_url',
    'whatsapp','year_started',
    -- las escriben otros disparadores que corren antes que este
    'updated_at','search_tsv'
  ];

  if v_alta then
    v_permitidas := v_permitidas || array['role','rules_version_accepted','rules_accepted_at'];
  end if;
  if v_sella then
    v_permitidas := v_permitidas || array['fundador_hasta'];
  end if;
  if v_libre then
    v_permitidas := v_permitidas || array[
      'sector','membership_status','membership_due_at','membership_paid_until',
      'membership_cancelada_en','stripe_customer_id','stripe_subscription_id',
      'promo_code_used','referral_credit_pct','referred_by','referred_at',
      'fundador_autorizado','fundador_autorizado_en','fundador_autorizado_por',
      'empresa_plazo_desde','empresa_limitada','exencion_tipo','exencion_folio',
      'exencion_documento','exencion_solicitada_en','exencion_aprobada_en',
      'exencion_aprobada_por','exencion_vigente_hasta','exencion_rechazo',
      'suspended_at','suspend_until','winback_until','pre_suspend_published',
      'rules_accepted_at'];
  end if;

  select array_agg(k order by k) into v_intrusas
  from jsonb_each(to_jsonb(new)) e(k, v)
  where not (k = any(v_permitidas))
    and to_jsonb(new) -> k is distinct from to_jsonb(old) -> k;

  if v_intrusas is not null then
    raise exception 'No se puede modificar desde el perfil: %', array_to_string(v_intrusas, ', ')
      using errcode = '42501';
  end if;

  return new;
end $$;

revoke all on function public.protect_profile_columns() from public, anon, authenticated;
