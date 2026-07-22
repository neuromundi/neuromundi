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
        }
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
