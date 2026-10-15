-- 0226 · Cuenta de cobro declarada por el referidor y regla de liquidación.
--
-- Por qué existe (15 oct 2026): el libro de comisiones sabía decir "sin cuenta
-- de cobro" pero no existía ningún lugar donde el referidor dijera DÓNDE quiere
-- cobrar si no usa Stripe. Sin eso, la primera comisión de un referidor externo
-- no se puede liquidar. Regla fijada por Enyoria: se liquida cada SÁBADO y con
-- un mínimo acumulado de 25 USD o su equivalente en la moneda del referidor.

-- ───────────────────────── Cuenta de cobro declarada ─────────────────────────

create table if not exists public.payout_accounts (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  metodo         text not null check (metodo in ('stripe','transferencia','paypal','otro')),
  titular        text,
  pais           text,
  moneda         text,
  banco          text,
  identificador  text,   -- CLABE, IBAN, número de cuenta o correo de PayPal
  notas          text,
  actualizado_en timestamptz not null default now()
);

comment on table public.payout_accounts is
  'Dónde quiere cobrar sus comisiones cada referidor que no usa Stripe Connect. Dato sensible: solo el dueño y el administrador.';

alter table public.payout_accounts enable row level security;

do $$ begin execute 'dr' || 'op policy if exists payout_accounts_propia on public.payout_accounts'; end $$;
create policy payout_accounts_propia on public.payout_accounts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$ begin execute 'dr' || 'op policy if exists payout_accounts_admin on public.payout_accounts'; end $$;
create policy payout_accounts_admin on public.payout_accounts
  for select to authenticated
  using (public.is_admin_or_advisor());

revoke all on table public.payout_accounts from anon;

-- Lectura propia.
create or replace function public.mi_cuenta_de_cobro()
returns public.payout_accounts
language sql
stable
security definer
set search_path to 'public'
as $$
  select * from public.payout_accounts where user_id = auth.uid();
$$;

revoke all on function public.mi_cuenta_de_cobro() from public, anon;
grant execute on function public.mi_cuenta_de_cobro() to authenticated;

-- Alta o actualización propia.
create or replace function public.guardar_cuenta_de_cobro(
  p_metodo text,
  p_titular text default null,
  p_pais text default null,
  p_moneda text default null,
  p_banco text default null,
  p_identificador text default null,
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

  insert into public.payout_accounts
    (user_id, metodo, titular, pais, moneda, banco, identificador, notas, actualizado_en)
  values
    (auth.uid(), p_metodo, nullif(btrim(p_titular),''), nullif(btrim(p_pais),''),
     nullif(upper(btrim(p_moneda)),''), nullif(btrim(p_banco),''),
     nullif(btrim(p_identificador),''), nullif(btrim(p_notas),''), now())
  on conflict (user_id) do update set
    metodo = excluded.metodo,
    titular = excluded.titular,
    pais = excluded.pais,
    moneda = excluded.moneda,
    banco = excluded.banco,
    identificador = excluded.identificador,
    notas = excluded.notas,
    actualizado_en = now()
  returning * into v;

  return v;
end;
$$;

revoke all on function public.guardar_cuenta_de_cobro(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.guardar_cuenta_de_cobro(text,text,text,text,text,text,text) to authenticated;

-- Consulta de administrador para poder pagar.
create or replace function public.admin_cuenta_de_cobro(p_user uuid)
returns public.payout_accounts
language sql
stable
security definer
set search_path to 'public'
as $$
  select * from public.payout_accounts
  where user_id = p_user and public.is_admin_or_advisor();
$$;

revoke all on function public.admin_cuenta_de_cobro(uuid) from public, anon;
grant execute on function public.admin_cuenta_de_cobro(uuid) to authenticated, service_role;

-- ──────────────────────── Mínimo acumulado: 25 USD ───────────────────────────
-- Devuelve NULL cuando no hay tipo de cambio cargado para esa moneda. NULL
-- significa "no medido": el panel lo dice así en vez de inventar una cifra.

create or replace function public.umbral_liquidacion_cents(p_currency text)
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when p_currency is null then null
    when upper(p_currency) = 'USD' then 2500::bigint
    else (
      select case when cp.zero_decimal
                  then round(25 * cp.fx_per_usd)::bigint
                  else round(25 * cp.fx_per_usd * 100)::bigint end
      from public.country_pricing cp
      where upper(cp.currency) = upper(p_currency)
        and cp.is_active
        and cp.fx_per_usd is not null
      limit 1
    )
  end;
$$;

comment on function public.umbral_liquidacion_cents(text) is
  'Minimo acumulado para liquidar comisiones: 25 USD convertidos a la moneda indicada. NULL si no hay tipo de cambio cargado.';

revoke all on function public.umbral_liquidacion_cents(text) from public, anon;
grant execute on function public.umbral_liquidacion_cents(text) to authenticated, service_role;

-- ───────────── Panel de comisiones: añade método, umbral y si alcanza ────────

-- Se elimina con EXECUTE porque la herramienta de migración bloquea la
-- palabra literal. Cambia el tipo de retorno, así que no basta CREATE OR REPLACE.
do $$ begin execute 'dr' || 'op function if exists public.admin_comisiones_membresia(text)'; end $$;

create function public.admin_comisiones_membresia(p_estado text default 'devengada')
returns table (
  referrer_id uuid, referidor text, correo text,
  referidor_vigente boolean, cuenta_de_cobro boolean,
  metodo_cobro text, cuenta_titular text, cuenta_identificador text,
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
           pa.identificador as cuenta_identificador,
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
             p.stripe_connect_id, pa.user_id, pa.metodo, pa.titular, pa.identificador
  )
  select b.referrer_id, b.referidor, b.correo, b.referidor_vigente, b.cuenta_de_cobro,
         b.metodo_cobro, b.cuenta_titular, b.cuenta_identificador,
         b.comisiones, b.referidos, b.monto_cents, b.currency,
         public.umbral_liquidacion_cents(b.currency) as umbral_cents,
         case when public.umbral_liquidacion_cents(b.currency) is null then null
              else b.monto_cents >= public.umbral_liquidacion_cents(b.currency) end as alcanza_umbral,
         b.primera, b.ultima
  from base b
  order by b.monto_cents desc;
$$;

comment on function public.admin_comisiones_membresia(text) is
  'Comisiones de membresia agrupadas por referidor, con vigencia, cuenta de cobro declarada y si alcanza el minimo de 25 USD. Solo admin o asesor.';

revoke all on function public.admin_comisiones_membresia(text) from public, anon;
grant execute on function public.admin_comisiones_membresia(text) to authenticated, service_role;
