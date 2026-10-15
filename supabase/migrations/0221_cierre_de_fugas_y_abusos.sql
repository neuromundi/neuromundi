-- 0221 — Cierre de las fugas y abusos restantes de la auditoria del 14 oct.
--
-- Cinco cosas, todas confirmadas leyendo el codigo en produccion.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. estado_exencion filtraba el expediente fiscal de CUALQUIER perfil
--
-- Era SECURITY DEFINER, ejecutable por anon, sin ningun control, y devolvia
-- folio (RFC o CLUNI) y la URL del documento comprobatorio de cualquier uuid.
-- Los uuid de perfil se obtienen de varias vistas publicas, asi que no hacia
-- falta adivinarlos. Hoy esos campos estan vacios en los tres perfiles que
-- existen; en cuanto alguien suba su constancia, deja de estarlo.
create or replace function public.estado_exencion(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare r jsonb;
begin
  -- El expediente es del titular y del administrador. De nadie mas.
  if auth.uid() is null or (auth.uid() <> p_id and not public.is_admin()) then
    return jsonb_build_object('error', 'no_autorizado');
  end if;
  select jsonb_build_object(
    'aplica',     coalesce(public.exento_de_cuota(p.sector, p.provider_type), false),
    'sector',     p.sector,
    'tipo',       p.exencion_tipo,
    'folio',      p.exencion_folio,
    'documento',  p.exencion_documento,
    'solicitada', p.exencion_solicitada_en,
    'aprobada',   p.exencion_aprobada_en,
    'vence',      p.exencion_vigente_hasta,
    'vencida',    (p.exencion_vigente_hasta is not null and p.exencion_vigente_hasta <= now()),
    'permanente', (p.exencion_tipo in ('publico','empresa','ong')),
    'rechazo',    p.exencion_rechazo,
    'dias',       case when p.exencion_vigente_hasta is null then null
                       else greatest(0, (date_part('day', p.exencion_vigente_hasta - now()))::int) end
  ) into r from public.profiles p where p.id = p_id;
  return coalesce(r, jsonb_build_object('aplica', false));
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. membership_promo revelaba el beneficio del codigo de cualquiera
create or replace function public.membership_promo(p_user uuid)
-- OJO: percent_off es INTEGER, no numeric. Es el tipo que ya tiene la funcion
-- en produccion, y Postgres no deja cambiar el tipo de retorno con
-- CREATE OR REPLACE: habria que eliminarla primero, con lo que se pierden sus
-- permisos y se rompe lo que dependa de ella. Se respeta la firma tal cual.
returns table (benefit text, percent_off integer, amount_off numeric, amount_currency text)
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or (auth.uid() <> p_user and not public.is_admin()) then
    return;
  end if;
  return query
  select pc.benefit, pc.percent_off, pc.amount_off, pc.amount_currency
  from public.profiles p
  join public.promo_codes pc on pc.code = p.promo_code_used
  where p.id = p_user
    and pc.benefit in ('percent', 'amount')
    and pc.is_active
    and (pc.expires_at is null or pc.expires_at > now())
  limit 1;
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. redeem_promo_code: se podian quemar los usos de un codigo ajeno
--
-- El insert en promo_redemptions era idempotente (on conflict do nothing),
-- pero el contador de usos subia SIEMPRE. Invocando la funcion veinte veces
-- con el mismo codigo se agotaba un codigo de max_uses = 20 para los demas.
-- Y como promo_code_used se sobrescribia sin restriccion, se podia cambiar de
-- codigo a voluntad, incluso pisando un codigo de alianza ya registrado y
-- dejando al aliado sin su credito.
create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c        public.promo_codes%rowtype;
  u_role   text;
  u_email  text;
  v_nuevo  boolean;
  v_previo text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'No autenticado');
  end if;

  -- Un canje por persona. Antes se podia cambiar de codigo indefinidamente.
  select code into v_previo from public.promo_redemptions where user_id = auth.uid();
  if v_previo is not null and lower(v_previo) <> lower(trim(p_code)) then
    return jsonb_build_object('ok', false, 'error', 'ya_canjeado');
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
  v_nuevo := found;

  -- El contador SOLO sube en el primer canje de esta persona.
  if v_nuevo then
    update public.promo_codes set used_count = used_count + 1 where code = c.code;
  end if;

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
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Inventario: se podia vender mas de lo que hay
--
-- El stock se validaba al CREAR la sesion de pago y se descontaba al PAGARLA.
-- decrement_stock no bajaba de cero, pero tampoco rechazaba: con una unidad,
-- cinco compradores podian abrir el pago y pagar los cinco. Ahora devuelve si
-- de verdad descontó, para que quien la llame pueda enterarse.
-- Se conserva `returns void`: la funcion ya existe asi, y cambiar el tipo de
-- retorno obligaria a eliminarla primero. Quien la llama (el webhook) no usa
-- el valor devuelto, de modo que el aviso a los administradores basta para que
-- el caso deje de pasar inadvertido.
create or replace function public.decrement_stock(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare v_ok boolean;
begin
  update public.products
     set stock = stock - 1
   where id = p_product_id and stock is not null and stock > 0;
  get diagnostics v_ok = row_count;
  if not v_ok then
    perform public.notify_admins(
      'stock_agotado',
      'Se pagó un producto sin existencias',
      'El cobro entro y no habia unidades que descontar. Hay que resolverlo con el comprador.',
      jsonb_build_object('product_id', p_product_id));
  end if;
end;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Una cita no se puede pagar dos veces
--
-- create-consultation-checkout comprueba que la cita no este pagada, pero no
-- habia indice unico: dos sesiones simultaneas para la misma cita se creaban
-- y se pagaban las dos. El indice lo impide en la base, que es donde importa.
-- Parcial, porque una cita puede acumular intentos no pagados.
create unique index if not exists payments_una_cita_pagada
  on public.payments (appointment_id)
  where appointment_id is not null and status = 'paid';
