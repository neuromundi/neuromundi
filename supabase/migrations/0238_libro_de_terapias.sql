-- 0238 · Las renovaciones de terapia dejan de no existir.
-- (Auditoría del 15 oct 2026, hallazgo A-11.)
--
-- La terapia es una suscripcion mensual con transferencia a la cuenta Connect
-- del prestador. El registro en public.payments solo se crea en el checkout y
-- se marca pagado en checkout.session.completed. Las renovaciones del mes 2 en
-- adelante llegan como invoice.paid, y ese caso busca al pagador por
-- stripe_customer_id del PERFIL, pero la sesion de terapia no pasa `customer`:
-- Stripe crea un cliente distinto que no esta en ningun perfil. Resultado: el
-- prestador no tiene constancia de once cobros al ano y el paciente no los ve.
--
-- Ademas public.payments NO tiene ninguna restriccion unica, asi que una
-- reentrega del evento duplicaria la fila.

alter table public.payments
  add column if not exists stripe_invoice_id text;

comment on column public.payments.stripe_invoice_id is
  'Factura de Stripe que origino este pago. Llave de idempotencia de las renovaciones de terapia.';

create unique index if not exists payments_una_por_factura
  on public.payments (stripe_invoice_id)
  where stripe_invoice_id is not null;

-- Asiento idempotente de una renovacion de terapia. La llama el webhook.
create or replace function public.registrar_renovacion_terapia(
  p_provider uuid,
  p_payer uuid,
  p_amount_cents integer,
  p_currency text,
  p_invoice text,
  p_subscription text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  if p_invoice is null or btrim(p_invoice) = '' then return false; end if;

  insert into public.payments
    (provider_id, payer_id, kind, amount_cents, currency, status,
     stripe_invoice_id, stripe_subscription_id, paid_at)
  values
    (p_provider, p_payer, 'therapy', p_amount_cents, lower(p_currency), 'paid',
     p_invoice, p_subscription, now())
  on conflict (stripe_invoice_id) do nothing
  returning id into v_id;

  if v_id is not null and p_provider is not null then
    insert into public.notifications (user_id, type, title, body)
    values (p_provider, 'pago_terapia', 'Se cobró una mensualidad de terapia',
            'Entró el pago mensual de una terapia. Lo verá en su panel de pagos.');
  end if;

  return v_id is not null;
end $function$;

revoke all on function public.registrar_renovacion_terapia(uuid,uuid,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.registrar_renovacion_terapia(uuid,uuid,integer,text,text,text) to service_role;

-- Y mis_pagos() pasa a incluir consultas y terapias: antes unia cuotas,
-- donativos y comisiones, y dejaba fuera justamente lo que un paciente paga
-- mes a mes.
create or replace function public.mis_pagos()
returns table (
  tipo text, concepto text, monto_cents bigint, currency text,
  fecha timestamptz, estado text, referencia text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select 'cuota'::text, mp.concepto, mp.amount_cents::bigint, mp.currency,
         mp.paid_at, mp.status, mp.stripe_ref
  from public.membership_payments mp
  where mp.user_id = (select auth.uid())
  union all
  select 'donativo', d.level, d.amount_cents::bigint, d.currency,
         d.paid_at, d.status, d.stripe_session_id
  from public.donations d
  where d.donor_user_id = (select auth.uid()) and d.status = 'paid'
  union all
  select 'comision',
         case when c.es_primer_pago then 'inscripcion' else 'renovacion' end,
         c.amount_cents::bigint, c.currency,
         coalesce(c.pagada_en, c.creada_en), c.status, c.stripe_ref
  from public.membership_commissions c
  where c.referrer_id = (select auth.uid())
  union all
  select case when pg.kind = 'therapy' then 'terapia' else 'consulta' end,
         null, pg.amount_cents::bigint, pg.currency,
         coalesce(pg.paid_at, pg.created_at), pg.status,
         coalesce(pg.stripe_invoice_id, pg.stripe_session_id)
  from public.payments pg
  where pg.payer_id = (select auth.uid()) and pg.status in ('paid','refunded')
  order by 5 desc nulls last;
$function$;

revoke all on function public.mis_pagos() from public, anon;
grant execute on function public.mis_pagos() to authenticated;
