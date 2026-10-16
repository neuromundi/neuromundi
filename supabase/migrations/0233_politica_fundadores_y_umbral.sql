-- 0233 · La tabla de fundadores estaba abierta, y el umbral no se aplicaba.
-- (Auditoría del 15 oct 2026, hallazgos A-5, A-9 y B-14.)
--
-- A-5: convivían dos políticas de lectura sobre founder_members. Las permisivas
-- se combinan con O lógico, así que la vieja —USING (true)— ganaba y la nueva
-- no aportaba nada: con la llave pública se obtenía la tabla entera, incluida
-- la fecha de gracia, que es información de cobranza.
do $$ begin execute 'dr' || 'op policy if exists founder_select_all on public.founder_members'; end $$;

-- A-9: admin_liquidar_comisiones marcaba pagadas TODAS las comisiones del
-- referidor sin mirar el umbral, y ni ella ni el panel agrupaban por moneda.
-- Un referidor con 8 pesos y 19 dólares aparecía con la suma de los dos números
-- bajo una sola moneda, y al liquidar se daban por pagadas las dos de golpe.
-- Ahora se liquida POR MONEDA y por debajo del mínimo hay que forzar
-- expresamente. La regla la fijó Enyoria: cada sábado, 25 USD acumulados.
do $$ begin execute 'dr' || 'op function if exists public.admin_liquidar_comisiones(uuid, text)'; end $$;

create function public.admin_liquidar_comisiones(
  p_referrer uuid, p_nota text default null,
  p_currency text default null, p_forzar boolean default false
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_n int; v_suma bigint; v_umbral bigint; v_moneda text;
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede liquidar comisiones';
  end if;

  v_moneda := lower(nullif(btrim(p_currency), ''));

  select sum(amount_cents), min(currency) into v_suma, v_moneda
  from public.membership_commissions
  where referrer_id = p_referrer and status = 'devengada'
    and (v_moneda is null or lower(currency) = v_moneda);

  if coalesce(v_suma, 0) = 0 then return 0; end if;

  v_umbral := public.umbral_liquidacion_cents(v_moneda);

  -- Si no hay tipo de cambio cargado para esa moneda el umbral es NULL: no se
  -- inventa una cifra, se exige confirmacion expresa.
  if not p_forzar and (v_umbral is null or v_suma < v_umbral) then
    raise exception 'La suma acumulada (% %) no alcanza el minimo de liquidacion. Use p_forzar si decide pagarla igual.',
      round(v_suma / 100.0, 2), upper(coalesce(v_moneda, '?'));
  end if;

  update public.membership_commissions
     set status = 'pagada', pagada_en = now(), pagada_nota = nullif(btrim(p_nota), '')
   where referrer_id = p_referrer and status = 'devengada' and lower(currency) = v_moneda;
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

revoke all on function public.admin_liquidar_comisiones(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_liquidar_comisiones(uuid, text, text, boolean) to authenticated, service_role;

-- El panel deja de sumar monedas distintas: una fila por referidor y moneda.
-- Y la cuenta de cobro sale solo de payout_accounts: tener cuenta Connect
-- significa que el perfil puede VENDER, no que Neuromundi pueda pagarle
-- comisiones por ahi; no existe ninguna transferencia en el codigo. (B-14.)
do $$ begin execute 'dr' || 'op function if exists public.admin_comisiones_membresia(text)'; end $$;

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
as $function$
  with base as (
    select c.referrer_id, lower(c.currency) as currency,
           coalesce(nullif(btrim(p.business_name), ''), p.full_name, '(sin nombre)') as referidor,
           u.email as correo,
           public.cuota_cubierta(c.referrer_id) as referidor_vigente,
           (pa.user_id is not null) as cuenta_de_cobro,
           pa.metodo as metodo_cobro, pa.titular as cuenta_titular,
           coalesce(pa.contacto, u.email) as cuenta_contacto,
           count(*) as comisiones, count(distinct c.referred_id) as referidos,
           sum(c.amount_cents) as monto_cents,
           min(c.creada_en) as primera, max(c.creada_en) as ultima
    from public.membership_commissions c
    join public.profiles p on p.id = c.referrer_id
    left join auth.users u on u.id = c.referrer_id
    left join public.payout_accounts pa on pa.user_id = c.referrer_id
    where public.is_admin_or_advisor()
      and (p_estado is null or p_estado = 'todas' or c.status = p_estado)
    group by c.referrer_id, lower(c.currency), p.business_name, p.full_name, u.email,
             pa.user_id, pa.metodo, pa.titular, pa.contacto
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
$function$;

revoke all on function public.admin_comisiones_membresia(text) from public, anon;
grant execute on function public.admin_comisiones_membresia(text) to authenticated, service_role;
