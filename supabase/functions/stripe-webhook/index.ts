// ============================================================================
// Supabase Edge Function: stripe-webhook
// Recibe eventos de Stripe y actualiza el estado de membresía del usuario.
//
// Secrets:
//   STRIPE_SECRET_KEY      (obligatoria)
//   STRIPE_WEBHOOK_SECRET  (obligatoria, del endpoint del webhook en Stripe)
//
// Despliegue (sin verificación de JWT, Stripe firma con su secreto):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
// En Stripe → Developers → Webhooks, apunta a:
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// Eventos: checkout.session.completed, invoice.paid, invoice.payment_failed,
//          customer.subscription.deleted
// ============================================================================
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const toIso = (unixSeconds?: number | null) =>
  unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;

/**
 * Otorga al referente el crédito por un referido que acaba de pagar y, si ese
 * referente ya tiene una suscripción activa, le aplica el descuento acumulado
 * como cupón de un solo uso para que su PRÓXIMA factura salga rebajada.
 * Nunca lanza: un fallo aquí no debe tumbar el webhook del pago.
 */
async function applyReferralReward(
  admin: ReturnType<typeof createClient>,
  stripe: Stripe,
  referredUserId: string,
) {
  try {
    const { data } = await admin.rpc('grant_referral_credit', { p_referred: referredUserId });
    const row = Array.isArray(data) ? data[0] : data;
    const referrerId = row?.referrer_id as string | undefined;
    const creditPct = Number(row?.credit_pct ?? 0);
    const subId = row?.subscription_id as string | null | undefined;
    if (!referrerId || creditPct <= 0 || !subId) return;

    const coupon = await stripe.coupons.create({
      percent_off: Math.min(creditPct, 100),
      duration: 'once',
      name: `Recompensa por recomendar (-${creditPct}%)`,
      metadata: { user_id: referrerId, kind: 'referral' },
    });
    // Reemplaza cualquier cupón previo: el crédito ya es el acumulado total.
    await stripe.subscriptions.update(subId, { coupon: coupon.id });
  } catch (e) {
    console.error('applyReferralReward', e);
  }
}

Deno.serve(async (req: Request) => {
  const sig = req.headers.get('Stripe-Signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!sig || !secret) return new Response('Config faltante', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, cryptoProvider);
  } catch (err) {
    return new Response(`Firma inválida: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const kind = s.metadata?.kind;

        // Fase 6: compra de producto (mini-tienda).
        if (kind === 'product') {
          const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
          await admin
            .from('orders')
            .update({ status: 'paid', paid_at: new Date().toISOString(), stripe_session_id: s.id })
            .eq('stripe_session_id', s.id);
          void pi;
          break;
        }

        // Fase 3: pagos de consulta/terapia (registro en public.payments).
        if (kind === 'consultation' || kind === 'therapy') {          const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
          const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
          await admin
            .from('payments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_payment_intent: pi ?? null,
              stripe_subscription_id: subId ?? null,
            })
            .eq('stripe_session_id', s.id);
          if (s.metadata?.appointment_id) {
            await admin.from('appointment_requests')
              .update({ payment_status: 'paid' })
              .eq('id', s.metadata.appointment_id);
          }
          break;
        }

        // Membresía (Fase de afiliación).
        const userId = s.metadata?.user_id;
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
        let paidUntil: string | null = null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          paidUntil = toIso(sub.current_period_end);
        }
        if (userId) {
          await admin
            .from('profiles')
            .update({
              membership_status: 'active',
              stripe_customer_id: typeof s.customer === 'string' ? s.customer : s.customer?.id,
              stripe_subscription_id: subId,
              membership_paid_until: paidUntil,
            })
            .eq('id', userId);
          // El referente de este usuario gana su recompensa (si aplica).
          await applyReferralReward(admin, stripe, userId);
        }
        break;
      }

      // Reembolso de una compra: el pedido pasa a 'refunded' y el trigger
      // `trg_sync_affiliate_commission` (migración 0043) revierte la comisión
      // del promotor si aún no se le había pagado. Si ya se le pagó, la marca
      // como `refund_after_payment` para que el vendedor lo resuelva con él.
      case 'charge.refunded': {
        const ch = event.data.object as Stripe.Charge;
        const pi = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id;
        if (!pi) break;
        // El pedido se guarda con el id de la sesión, no del PaymentIntent, así
        // que hay que localizar la sesión que originó este cobro.
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
        const sessionId = sessions.data[0]?.id;
        if (!sessionId) break;
        await admin
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_session_id', sessionId);
        break;
      }

      // Estado de la cuenta conectada del prestador (habilita cobros).
      case 'account.updated': {
        const acct = event.data.object as Stripe.Account;
        await admin
          .from('profiles')
          .update({ stripe_charges_enabled: acct.charges_enabled === true })
          .eq('stripe_connect_id', acct.id);
        break;
      }
      case 'invoice.paid': {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
        const paidUntil = toIso(inv.lines?.data?.[0]?.period?.end ?? null);
        if (customerId) {
          await admin
            .from('profiles')
            .update({ membership_status: 'active', membership_paid_until: paidUntil })
            .eq('stripe_customer_id', customerId);

          const { data: payer } = await admin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
          const payerId = payer?.id as string | undefined;
          if (payerId) {
            // Si esta factura se cobró con el cupón de recomendación, el
            // crédito ya se usó: se pone a cero.
            const usedReferralCoupon =
              (inv.discount?.coupon?.metadata as Record<string, string> | undefined)?.kind === 'referral';
            if (usedReferralCoupon) {
              await admin.rpc('consume_referral_credit', { p_user: payerId });
            }
            // Y su propio referente cobra recompensa (solo la primera vez).
            await applyReferralReward(admin, stripe, payerId);
          }
        }
        break;
      }
      case 'invoice.payment_failed':
      case 'customer.subscription.deleted': {
        const obj = event.data.object as { customer?: string | { id: string } };
        const customerId = typeof obj.customer === 'string' ? obj.customer : obj.customer?.id;
        if (customerId) {
          await admin
            .from('profiles')
            .update({ membership_status: 'past_due' })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return new Response(`Error procesando evento: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
