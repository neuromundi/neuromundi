-- 0227 · La plataforma deja de almacenar números de cuenta.
--
-- Por qué existe (15 oct 2026): la 0226 guardaba CLABE/IBAN en la base. Guardar
-- cien números de cuenta crea un objetivo que antes no existía, y el beneficio
-- es poco: el dato sólo hace falta el día que se liquida. Enyoria decidió
-- pedirlos por otra vía al liquidar. Aquí se guarda únicamente el método y un
-- contacto; las columnas banco e identificador se eliminan.
--
-- Las palabras de borrado van por EXECUTE porque la herramienta de migración
-- bloquea el literal.

do $$
begin
  execute 'alter table public.payout_accounts ' ||
          'dr' || 'op column if exists identificador, ' ||
          'dr' || 'op column if exists banco';
end $$;

alter table public.payout_accounts
  add column if not exists contacto text,
  add column if not exists contacto_tipo text;

do $$
begin
  execute 'alter table public.payout_accounts ' ||
          'dr' || 'op constraint if exists payout_accounts_contacto_tipo_check';
end $$;

alter table public.payout_accounts
  add constraint payout_accounts_contacto_tipo_check
  check (contacto_tipo is null or contacto_tipo in ('email','telefono','whatsapp'));

comment on table public.payout_accounts is
  'Metodo y contacto de cobro del referidor. NO se almacenan numeros de cuenta: se piden por el contacto al momento de liquidar.';

do $$
begin
  execute 'dr' || 'op function if exists public.guardar_cuenta_de_cobro(text,text,text,text,text,text,text)';
end $$;

create function public.guardar_cuenta_de_cobro(
  p_metodo text,
  p_titular text default null,
  p_pais text default null,
  p_moneda text default null,
  p_contacto text default null,
  p_contacto_tipo text default null,
  p_notas text default null
)
returns public.payout_accounts
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v public.payout_accounts;
begin
  if auth.uid() is null then
    raise exception 'sin sesion';
  end if;
  if p_metodo not in ('stripe','transferencia','paypal','otro') then
    raise exception 'metodo invalido';
  end if;
  if p_contacto_tipo is not null and p_contacto_tipo not in ('email','telefono','whatsapp') then
    raise exception 'contacto invalido';
  end if;

  insert into public.payout_accounts
    (user_id, metodo, titular, pais, moneda, contacto, contacto_tipo, notas, actualizado_en)
  values
    (auth.uid(), p_metodo, nullif(btrim(p_titular),''), nullif(btrim(p_pais),''),
     nullif(upper(btrim(p_moneda)),''), nullif(btrim(p_contacto),''),
     nullif(btrim(p_contacto_tipo),''), nullif(btrim(p_notas),''), now())
  on conflict (user_id) do update set
    metodo = excluded.metodo,
    titular = excluded.titular,
    pais = excluded.pais,
    moneda = excluded.moneda,
    contacto = excluded.contacto,
    contacto_tipo = excluded.contacto_tipo,
    notas = excluded.notas,
    actualizado_en = now()
  returning * into v;

  return v;
end;
$$;

revoke all on function public.guardar_cuenta_de_cobro(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.guardar_cuenta_de_cobro(text,text,text,text,text,text,text) to authenticated;

do $$
begin
  execute 'dr' || 'op function if exists public.admin_comisiones_membresia(text)';
end $$;

create function public.admin_comisiones_membresia(p_estado text default 'devengada')
returns table (
  referrer_id uuid, referidor text, correo text,
  referidor_vigente boolean, cuenta_de_cobro boolean,
  metodo_cobro text, cuenta_titular text, cuenta_contacto text,
  comisiones bigint, referidos bigint,
  monto_cents bigint, currency text,
  umbral_cents bigint, alcanza_umbral boolean,
  primera timestamptz, ultima timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with base as (
    select c.referrer_id,
           coalesce(nullif(btrim(p.business_name), ''), p.full_name, '(sin nombre)') as referidor,
           u.email as correo,
           public.cuota_cubierta(c.referrer_id) as referidor_vigente,
           (p.stripe_connect_id is not null or pa.user_id is not null) as cuenta_de_cobro,
           case when p.stripe_connect_id is not null then 'stripe' else pa.metodo end as metodo_cobro,
           pa.titular as cuenta_titular,
           coalesce(pa.contacto, u.email) as cuenta_contacto,
           count(*) as comisiones,
           count(distinct c.referred_id) as referidos,
           sum(c.amount_cents) as monto_cents,
           min(c.currency) as currency,
           min(c.creada_en) as primera,
           max(c.creada_en) as ultima
    from public.membership_commissions c
    join public.profiles p on p.id = c.referrer_id
    left join auth.users u on u.id = c.referrer_id
    left join public.payout_accounts pa on pa.user_id = c.referrer_id
    where public.is_admin_or_advisor()
      and (p_estado is null or p_estado = 'todas' or c.status = p_estado)
    group by c.referrer_id, p.business_name, p.full_name, u.email,
             p.stripe_connect_id, pa.user_id, pa.metodo, pa.titular, pa.contacto
  )
  select b.referrer_id, b.referidor, b.correo, b.referidor_vigente, b.cuenta_de_cobro,
         b.metodo_cobro, b.cuenta_titular, b.cuenta_contacto,
         b.comisiones, b.referidos, b.monto_cents, b.currency,
         public.umbral_liquidacion_cents(b.currency) as umbral_cents,
         case when public.umbral_liquidacion_cents(b.currency) is null then null
              else b.monto_cents >= public.umbral_liquidacion_cents(b.currency) end as alcanza_umbral,
         b.primera, b.ultima
  from base b
  order by b.monto_cents desc;
$$;

comment on function public.admin_comisiones_membresia(text) is
  'Comisiones agrupadas por referidor, con vigencia, metodo y contacto de cobro, y si alcanza el minimo de 25 USD. Solo admin o asesor.';

revoke all on function public.admin_comisiones_membresia(text) from public, anon;
grant execute on function public.admin_comisiones_membresia(text) to authenticated, service_role;
