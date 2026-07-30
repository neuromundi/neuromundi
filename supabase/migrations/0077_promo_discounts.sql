-- 0077_promo_discounts.sql
-- Códigos promocionales con DESCUENTO parcial, además de la exención total que ya
-- existía. El admin elige el beneficio de cada código:
--   benefit = 'exempt'  → acceso gratuito (membresía exenta) [comportamiento previo]
--   benefit = 'percent' → descuento porcentual sobre la cuota; NO exenta: el
--                         checkout de Stripe lo aplica (compuesto con el de
--                         recomendación) en el primer pago.
-- Todo idempotente (columnas/constraints/función con IF NOT EXISTS o guardas).

-- ── A. Columnas nuevas en promo_codes ────────────────────────────────────────
alter table public.promo_codes
  add column if not exists benefit     text not null default 'exempt';
alter table public.promo_codes
  add column if not exists percent_off  integer;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'promo_codes_benefit_chk') then
    alter table public.promo_codes
      add constraint promo_codes_benefit_chk check (benefit in ('exempt', 'percent'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'promo_codes_percent_range_chk') then
    alter table public.promo_codes
      add constraint promo_codes_percent_range_chk
      check (percent_off is null or (percent_off between 1 and 100));
  end if;
  -- Coherencia: un código de descuento DEBE traer su porcentaje.
  if not exists (select 1 from pg_constraint where conname = 'promo_codes_benefit_value_chk') then
    alter table public.promo_codes
      add constraint promo_codes_benefit_value_chk
      check (benefit <> 'percent' or percent_off is not null);
  end if;
end $$;

-- ── B. Canje: ramifica según el beneficio ────────────────────────────────────
-- Mantiene la firma (jsonb) → no requiere DROP. Añade 'benefit' y, si aplica,
-- 'percent_off' a la respuesta para que la UI muestre el mensaje correcto.
create or replace function public.redeem_promo_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c      public.promo_codes%rowtype;
  u_role text;
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
    -- Descuento: guarda el código en el perfil; el checkout aplicará el %.
    -- (NO exenta: el usuario sigue debiendo pagar la cuota rebajada.)
    update public.profiles set promo_code_used = c.code where id = auth.uid();
    return jsonb_build_object('ok', true, 'benefit', 'percent', 'percent_off', c.percent_off);
  else
    -- Exención total: acceso gratuito.
    update public.profiles
    set membership_status = 'exempt', promo_code_used = c.code
    where id = auth.uid();
    return jsonb_build_object('ok', true, 'benefit', 'exempt');
  end if;
end; $$;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- ── C. Porcentaje de descuento activo del usuario (lo lee el checkout) ────────
-- Devuelve el percent_off del código de descuento canjeado por el usuario, si
-- sigue activo y no ha expirado; 0 en cualquier otro caso.
create or replace function public.membership_promo_pct(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((
    select pc.percent_off
    from public.profiles p
    join public.promo_codes pc on pc.code = p.promo_code_used
    where p.id = p_user
      and pc.benefit = 'percent'
      and pc.is_active
      and (pc.expires_at is null or pc.expires_at > now())
    limit 1
  ), 0);
$$;
revoke all on function public.membership_promo_pct(uuid) from public;
grant execute on function public.membership_promo_pct(uuid) to authenticated, service_role;
