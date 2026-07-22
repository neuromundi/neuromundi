-- ============================================================================
-- Recompensa del referente aplicada sobre la SUSCRIPCIÓN VIVA
-- ----------------------------------------------------------------------------
-- Modelo de "crédito": en vez de recalcular el porcentaje cada vez, el referente
-- acumula un crédito (profiles.referral_credit_pct) que se otorga UNA sola vez
-- por cada referido que efectivamente paga. Ese crédito:
--   · se empuja de inmediato a su suscripción de Stripe como cupón de un solo
--     uso, para que su PRÓXIMA factura salga con descuento; y
--   · si aún no tiene suscripción, queda guardado y se aplica en su checkout.
-- Al cobrarse una factura con ese cupón, el crédito se consume (vuelve a 0).
-- Idempotente. Requiere 0034.
-- ============================================================================

alter table public.profiles
  add column if not exists referral_credit_pct numeric not null default 0;

alter table public.referrals
  add column if not exists reward_counted_at timestamptz;

-- ── Otorga el crédito al referente cuando su referido paga ─────────────────
-- Devuelve a quién hay que aplicárselo y su suscripción, para que la Edge
-- Function actualice el cupón en Stripe. Sólo cuenta una vez por referido.
create or replace function public.grant_referral_credit(p_referred uuid)
returns table (referrer_id uuid, credit_pct numeric, subscription_id text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_ref record;
  v_cfg public.referral_config%rowtype;
  v_paid boolean;
  v_new numeric;
begin
  select * into v_cfg from public.referral_config where id = 1;
  if not found then return; end if;

  select rf.id, rf.referrer_id, rf.is_paying_type, rf.reward_counted_at
    into v_ref
  from public.referrals rf
  where rf.referred_id = p_referred;
  if v_ref is null then return; end if;
  if v_ref.reward_counted_at is not null then return; end if;  -- ya contado
  if not v_ref.is_paying_type then return; end if;             -- gratuitos no premian

  -- El referido debe haber pagado de verdad.
  select (p.membership_paid_until is not null and p.membership_paid_until > now())
    into v_paid
  from public.profiles p where p.id = p_referred;
  if not coalesce(v_paid, false) then return; end if;

  update public.referrals set reward_counted_at = now() where id = v_ref.id;

  update public.profiles p
     set referral_credit_pct = least(
           coalesce(p.referral_credit_pct, 0) + v_cfg.referrer_step_pct,
           v_cfg.referrer_max_pct)
   where p.id = v_ref.referrer_id
  returning p.referral_credit_pct into v_new;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_ref.referrer_id, 'referral_reward', 'Ganaste un descuento',
          'Un referido tuyo pagó su membresía. Tu descuento acumulado es ' || v_new || '%.',
          json_build_object('credit_pct', v_new));

  return query
  select v_ref.referrer_id, v_new, p.stripe_subscription_id
  from public.profiles p where p.id = v_ref.referrer_id;
end; $$;
revoke all on function public.grant_referral_credit(uuid) from public, anon;
grant execute on function public.grant_referral_credit(uuid) to service_role;

-- ── Consume el crédito cuando se cobra la factura con descuento ────────────
create or replace function public.consume_referral_credit(p_user uuid)
returns void
language sql security definer set search_path = public as $$
  update public.profiles set referral_credit_pct = 0 where id = p_user;
$$;
revoke all on function public.consume_referral_credit(uuid) from public, anon;
grant execute on function public.consume_referral_credit(uuid) to service_role;

-- ── El descuento del referente ahora sale del crédito acumulado ────────────
create or replace function public.membership_discount(p_user uuid)
returns table (referral_pct numeric, referrer_pct numeric, total_pct numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_cfg public.referral_config%rowtype;
  v_ref numeric := 0;
  v_own numeric := 0;
  v_has_paid boolean;
  v_role text;
  v_referred_by bigint;
  v_referred_at timestamptz;
begin
  select * into v_cfg from public.referral_config where id = 1;
  if not found then
    return query select 0::numeric, 0::numeric, 0::numeric; return;
  end if;

  select p.role, p.referred_by, p.referred_at,
         (p.membership_paid_until is not null and p.membership_paid_until > now()),
         coalesce(p.referral_credit_pct, 0)
    into v_role, v_referred_by, v_referred_at, v_has_paid, v_own
  from public.profiles p where p.id = p_user;

  if v_referred_by is not null
     and v_role = 'provider'
     and coalesce(v_has_paid, false) = false
     and v_referred_at is not null
     and now() <= v_referred_at + make_interval(days => v_cfg.validity_days)
  then
    v_ref := v_cfg.discount_pct;
  end if;

  v_own := least(coalesce(v_own, 0), v_cfg.referrer_max_pct);

  return query select
    v_ref,
    v_own,
    round((1 - (1 - v_ref/100.0) * (1 - v_own/100.0)) * 100, 2)::numeric;
end; $$;
revoke all on function public.membership_discount(uuid) from public;
grant execute on function public.membership_discount(uuid) to authenticated, service_role;

-- ── Resumen del usuario: el acumulado ahora es el crédito ──────────────────
create or replace function public.my_referral_summary()
returns table (
  total_uses int, paying_uses int, rewarded_uses int,
  accrued_pct numeric, max_pct numeric, step_pct numeric, validity_days int
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from public.referrals rf where rf.referrer_id = auth.uid()),
    (select count(*)::int from public.referrals rf
       where rf.referrer_id = auth.uid() and rf.is_paying_type = true),
    (select count(*)::int from public.referrals rf
      where rf.referrer_id = auth.uid() and rf.reward_counted_at is not null),
    (select coalesce(p.referral_credit_pct, 0) from public.profiles p where p.id = auth.uid()),
    (select referrer_max_pct from public.referral_config where id = 1),
    (select referrer_step_pct from public.referral_config where id = 1),
    (select validity_days from public.referral_config where id = 1);
$$;
revoke all on function public.my_referral_summary() from public;
grant execute on function public.my_referral_summary() to authenticated;
