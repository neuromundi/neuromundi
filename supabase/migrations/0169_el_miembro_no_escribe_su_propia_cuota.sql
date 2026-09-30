-- 0169: cierra un hueco anterior a la exención.
--
-- La política de RLS permite a cada quien actualizar su propio perfil, y el
-- guardián solo protegía role, is_verified e is_advisor. Medido: un miembro
-- podía ponerse membership_status = 'exempt' y quedar con la cuota cubierta,
-- publicarse y abrir las funciones de pago sin pagar. También podía levantarse
-- su propia suspensión. Aquí se protegen las columnas de dinero, sector,
-- exención y suspensión.
--
-- Las funciones SECURITY DEFINER que escriben esas columnas en nombre del
-- miembro (reclamar ficha, canjear promoción, solicitar exención) levantan la
-- bandera app.perfil_privilegiado durante su transacción.

create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare is_adm boolean; v_uid uuid; v_libre boolean;
begin
  v_uid := auth.uid();
  -- Sin sesión de usuario final (rol de servicio: webhook de Stripe, cron,
  -- funciones de borde) no se toca nada: esas rutas son de confianza.
  if v_uid is null then return new; end if;

  select (role = 'admin') into is_adm from public.profiles where id = v_uid;
  if coalesce(is_adm, false) then return new; end if;

  v_libre := coalesce(current_setting('app.perfil_privilegiado', true), '') = '1';

  if old.rules_version_accepted is not null then
    new.role := old.role;
  end if;
  new.is_verified := old.is_verified;
  new.is_advisor  := old.is_advisor;

  if not v_libre then
    new.sector                 := old.sector;
    new.membership_status      := old.membership_status;
    new.membership_due_at      := old.membership_due_at;
    new.membership_paid_until  := old.membership_paid_until;
    new.stripe_customer_id     := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.promo_code_used        := old.promo_code_used;
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
end; $$;

-- Las tres rutas legítimas del miembro levantan la bandera --------------------

create or replace function public.solicitar_exencion(
  p_tipo text, p_folio text, p_documento text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'sesion requerida'; end if;
  if p_tipo not in ('publico','donataria','cluni') then
    raise exception 'tipo de exencion no valido';
  end if;
  if btrim(coalesce(p_folio,'')) = '' then
    raise exception 'falta el RFC o la CLUNI';
  end if;

  perform set_config('app.perfil_privilegiado', '1', true);
  update public.profiles
     set exencion_tipo = p_tipo,
         exencion_folio = btrim(p_folio),
         exencion_documento = nullif(btrim(coalesce(p_documento,'')), ''),
         exencion_solicitada_en = now(),
         exencion_aprobada_en = null,
         exencion_aprobada_por = null,
         exencion_rechazo = null
   where id = auth.uid();
  perform set_config('app.perfil_privilegiado', '0', true);
  if not found then raise exception 'perfil no encontrado'; end if;

  perform public.admin_log_account_action(auth.uid(), 'exencion_solicitada', p_tipo || ' ' || btrim(p_folio));
  return true;
end $$;

create or replace function public.marcar_ficha_reclamada(p_token text, p_perfil uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare v_ficha uuid;
begin
  select i.directorio_id into v_ficha
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

  update public.directorio_invitaciones set usada_en = now() where token = p_token;

  perform set_config('app.perfil_privilegiado', '1', true);
  update public.profiles p
     set provider_type      = coalesce(p.provider_type, d.provider_type),
         profession         = coalesce(p.profession, d.profession),
         sector             = coalesce(p.sector, d.sector),
         sections           = case when coalesce(array_length(p.sections, 1), 0) = 0
                                   then coalesce(d.sections, '{}') else p.sections end,
         neuro_conditions   = case when coalesce(array_length(p.neuro_conditions, 1), 0) = 0
                                   then coalesce(d.neuro_conditions, '{}') else p.neuro_conditions end,
         specialties        = case when coalesce(array_length(p.specialties, 1), 0) = 0
                                   then coalesce(d.specialties, '{}') else p.specialties end,
         intervention_areas = case when coalesce(array_length(p.intervention_areas, 1), 0) = 0
                                   then coalesce(d.intervention_areas, '{}') else p.intervention_areas end,
         product_categories = case when coalesce(array_length(p.product_categories, 1), 0) = 0
                                   then coalesce(d.product_categories, '{}') else p.product_categories end,
         services_offered   = coalesce(nullif(btrim(coalesce(p.services_offered, '')), ''), d.especializacion)
    from public.directorio d
   where d.id = v_ficha
     and p.id = p_perfil;
  perform set_config('app.perfil_privilegiado', '0', true);

  perform public.publicar_si_procede(p_perfil);
  return true;
end $$;

create or replace function public.redeem_promo_code(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  c        public.promo_codes%rowtype;
  u_role   text;
  u_email  text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'No autenticado');
  end if;

  select * into c from public.promo_codes
  where lower(code) = lower(trim(p_code)) for update;

  if not found or c.is_active = false then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;

  if c.bound_email is not null and length(trim(c.bound_email)) > 0 then
    select email into u_email from auth.users where id = auth.uid();
    if u_email is null or lower(trim(u_email)) <> lower(trim(c.bound_email)) then
      return jsonb_build_object('ok', false, 'error', 'email');
    end if;
  end if;

  select role into u_role from public.profiles where id = auth.uid();
  if c.scope = 'consumer' and u_role not in ('parent', 'patient') then
    return jsonb_build_object('ok', false, 'error', 'scope');
  elsif c.scope = 'provider' and u_role <> 'provider' then
    return jsonb_build_object('ok', false, 'error', 'scope');
  end if;

  insert into public.promo_redemptions (code, user_id)
  values (c.code, auth.uid())
  on conflict (user_id) do nothing;

  update public.promo_codes set used_count = used_count + 1 where code = c.code;

  perform set_config('app.perfil_privilegiado', '1', true);
  if c.benefit = 'percent' then
    update public.profiles set promo_code_used = c.code where id = auth.uid();
    perform set_config('app.perfil_privilegiado', '0', true);
    return jsonb_build_object('ok', true, 'benefit', 'percent', 'percent_off', c.percent_off);
  elsif c.benefit = 'amount' then
    update public.profiles set promo_code_used = c.code where id = auth.uid();
    perform set_config('app.perfil_privilegiado', '0', true);
    return jsonb_build_object('ok', true, 'benefit', 'amount',
                             'amount_off', c.amount_off, 'amount_currency', c.amount_currency);
  else
    update public.profiles
    set membership_status = 'exempt', promo_code_used = c.code
    where id = auth.uid();
    perform set_config('app.perfil_privilegiado', '0', true);
    return jsonb_build_object('ok', true, 'benefit', 'exempt');
  end if;
end; $$;
