-- 0078_promo_amount_email.sql
-- Amplía los códigos promocionales (0077):
--   (1) DESCUENTO DE MONTO FIJO: benefit='amount' con amount_off + amount_currency
--       (el monto va en la moneda indicada; el checkout solo lo aplica si coincide
--        con la moneda de cobro del país).
--   (2) CANDADO POR CORREO: bound_email opcional. Si está puesto, solo puede
--       canjearlo la persona cuyo correo de la cuenta coincide → evita que se
--       comparta el código.
-- Idempotente.

-- ── A. Columnas + constraints ────────────────────────────────────────────────
alter table public.promo_codes add column if not exists amount_off      numeric(12,2);
alter table public.promo_codes add column if not exists amount_currency text;
alter table public.promo_codes add column if not exists bound_email     text;

-- benefit ahora admite 'amount'. Recreamos el CHECK (0077 solo tenía exempt/percent).
alter table public.promo_codes drop constraint if exists promo_codes_benefit_chk;
alter table public.promo_codes
  add constraint promo_codes_benefit_chk check (benefit in ('exempt', 'percent', 'amount'));

do $$ begin
  -- Coherencia: un código de monto fijo DEBE traer importe y moneda.
  if not exists (select 1 from pg_constraint where conname = 'promo_codes_amount_value_chk') then
    alter table public.promo_codes
      add constraint promo_codes_amount_value_chk
      check (benefit <> 'amount' or (amount_off is not null and amount_currency is not null));
  end if;
end $$;

-- ── B. Canje: valida correo (si aplica) y ramifica exempt/percent/amount ──────
create or replace function public.redeem_promo_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
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

  -- Candado por correo: el código está ligado a una cuenta concreta.
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

  -- Registrar canje (uno por usuario) e incrementar el contador.
  insert into public.promo_redemptions (code, user_id)
  values (c.code, auth.uid())
  on conflict (user_id) do nothing;

  update public.promo_codes set used_count = used_count + 1 where code = c.code;

  if c.benefit = 'percent' then
    update public.profiles set promo_code_used = c.code where id = auth.uid();
    return jsonb_build_object('ok', true, 'benefit', 'percent', 'percent_off', c.percent_off);
  elsif c.benefit = 'amount' then
    update public.profiles set promo_code_used = c.code where id = auth.uid();
    return jsonb_build_object('ok', true, 'benefit', 'amount',
                             'amount_off', c.amount_off, 'amount_currency', c.amount_currency);
  else
    update public.profiles
    set membership_status = 'exempt', promo_code_used = c.code
    where id = auth.uid();
    return jsonb_build_object('ok', true, 'benefit', 'exempt');
  end if;
end; $$;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- ── C. Descuento del promo del usuario para el checkout ──────────────────────
-- Sustituye a membership_promo_pct (0077): ahora devuelve tipo + valores.
drop function if exists public.membership_promo_pct(uuid);

create or replace function public.membership_promo(p_user uuid)
returns table (benefit text, percent_off integer, amount_off numeric, amount_currency text)
language sql stable security definer set search_path = public as $$
  select pc.benefit, pc.percent_off, pc.amount_off, pc.amount_currency
  from public.profiles p
  join public.promo_codes pc on pc.code = p.promo_code_used
  where p.id = p_user
    and pc.benefit in ('percent', 'amount')
    and pc.is_active
    and (pc.expires_at is null or pc.expires_at > now())
  limit 1;
$$;
revoke all on function public.membership_promo(uuid) from public;
grant execute on function public.membership_promo(uuid) to authenticated, service_role;
