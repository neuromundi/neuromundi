-- 0210b · Devengo de la comision. La llama el webhook de Stripe en cada pago
-- de membresia confirmado (primer pago y renovaciones).
--
-- Devuelve jsonb con lo ocurrido, para que el webhook pueda registrarlo sin
-- tener que interpretar excepciones. NUNCA lanza por causas de negocio: un
-- fallo del libro no debe tumbar el procesamiento de un pago.

create or replace function public.devengar_comision_membresia(
  p_referred    uuid,
  p_base_cents  integer,
  p_currency    text,
  p_stripe_ref  text,
  p_primer_pago boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cfg   public.membership_commission_config%rowtype;
  v_refer uuid;
  v_activo boolean;
  v_monto integer;
begin
  select * into v_cfg from public.membership_commission_config where id = 1;
  if not found or not v_cfg.activo then
    return jsonb_build_object('ok', false, 'motivo', 'programa_inactivo');
  end if;

  if coalesce(p_base_cents, 0) <= 0 or coalesce(btrim(p_stripe_ref), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'datos_insuficientes');
  end if;

  -- Solo el primer pago si la politica no es recurrente.
  if not v_cfg.recurrente and not coalesce(p_primer_pago, false) then
    return jsonb_build_object('ok', false, 'motivo', 'solo_primer_pago');
  end if;

  -- Quien lo trajo. referrals.referrer_id es el perfil del referidor.
  select rf.referrer_id into v_refer
  from public.referrals rf where rf.referred_id = p_referred;

  if v_refer is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_referidor');
  end if;
  if v_refer = p_referred then
    return jsonb_build_object('ok', false, 'motivo', 'autorreferido');
  end if;

  -- La condicion observable que sustituye a "demostrar labor de renovacion":
  -- se cobra mientras el referidor siga siendo parte de la plataforma.
  if v_cfg.exige_referidor_activo then
    select public.cuota_cubierta(v_refer) into v_activo;
    if not coalesce(v_activo, false) then
      return jsonb_build_object('ok', false, 'motivo', 'referidor_inactivo');
    end if;
  end if;

  v_monto := floor(p_base_cents * v_cfg.comision_pct / 100.0)::int;
  if v_monto <= 0 then
    return jsonb_build_object('ok', false, 'motivo', 'monto_cero');
  end if;

  insert into public.membership_commissions
    (referrer_id, referred_id, stripe_ref, es_primer_pago,
     base_cents, comision_pct, amount_cents, currency)
  values
    (v_refer, p_referred, btrim(p_stripe_ref), coalesce(p_primer_pago, false),
     p_base_cents, v_cfg.comision_pct, v_monto, lower(coalesce(p_currency, 'mxn')))
  on conflict (stripe_ref) do nothing;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'ya_registrada', 'stripe_ref', p_stripe_ref);
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_refer, 'referral_reward', 'Ganó una comisión',
          'Un perfil que usted recomendó cubrió su cuota. Su comisión quedó registrada.',
          jsonb_build_object('amount_cents', v_monto, 'currency', lower(coalesce(p_currency,'mxn'))));

  return jsonb_build_object('ok', true, 'referrer', v_refer,
                            'amount_cents', v_monto, 'currency', lower(coalesce(p_currency,'mxn')));
exception when others then
  return jsonb_build_object('ok', false, 'motivo', 'error', 'detalle', sqlerrm);
end;
$$;

comment on function public.devengar_comision_membresia(uuid, integer, text, text, boolean) is
  'Registra la comision del referidor por un pago de membresia. Idempotente por stripe_ref. Nunca lanza: devuelve el motivo.';

revoke all on function public.devengar_comision_membresia(uuid, integer, text, text, boolean) from public, anon, authenticated;
grant execute on function public.devengar_comision_membresia(uuid, integer, text, text, boolean) to service_role;
