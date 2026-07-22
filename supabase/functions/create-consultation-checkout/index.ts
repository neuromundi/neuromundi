// ============================================================================
// Supabase Edge Function: create-consultation-checkout
// Crea una sesión de Stripe Checkout para pagar una consulta (pago único) o una
// terapia recurrente (suscripción mensual). Usa "destination charges": el 100%
// del importe va a la cuenta conectada del prestador. La app no toca tarjetas.
//
// body: { providerId, appointmentId?, kind?: 'consultation'|'therapy', payerRfc? }
// Secrets: STRIPE_SECRET_KEY
// Despliegue: supabase functions deploy create-consultation-checkout
// ============================================================================
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const ZERO_DECIMAL = new Set(['jpy', 'krw', 'clp', 'vnd']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!stripeKey) return json(500, { error: 'Falta STRIPE_SECRET_KEY' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json(401, { error: 'No autenticado' });

  let body: { providerId?: string; appointmentId?: string; kind?: string; payerRfc?: string; amount?: number; currency?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'Cuerpo inválido' }); }
  const kind = body.kind === 'therapy' ? 'therapy' : 'consultation';
  if (!body.providerId) return json(400, { error: 'Falta providerId' });

  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json(401, { error: 'Sesión inválida' });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  const { data: provider } = await admin
    .from('profiles')
    .select('full_name, business_name, stripe_connect_id, stripe_charges_enabled, accepts_payments, consultation_amount, consultation_currency')
    .eq('id', body.providerId)
    .single();
  if (!provider) return json(404, { error: 'Prestador no encontrado' });
  if (!provider.accepts_payments || !provider.stripe_connect_id || !provider.stripe_charges_enabled) {
    return json(400, { error: 'El prestador aún no tiene pagos habilitados.' });
  }
  if ((body.amount == null || Number(body.amount) <= 0) && (!provider.consultation_amount || !provider.consultation_currency)) {
    return json(400, { error: 'El prestador no configuró el precio de la consulta.' });
  }

  // Importe: si el cuerpo trae un monto (cobro por cita con % del especialista) se usa
  // ese; si no, el precio fijo de consulta del prestador.
  const currency = String(body.currency || provider.consultation_currency).toLowerCase();
  const amount = body.amount != null && Number(body.amount) > 0 ? Number(body.amount) : Number(provider.consultation_amount);
  const unitAmount = ZERO_DECIMAL.has(currency) ? Math.round(amount) : Math.round(amount * 100);

  // Datos del pagador para el reporte de facturación.
  const { data: payer } = await admin.from('profiles').select('full_name, business_name, rfc').eq('id', u.user.id).single();
  const payerName = payer?.business_name || payer?.full_name || u.user.email || '';
  const payerRfc = body.payerRfc || payer?.rfc || '';

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
  const origin = req.headers.get('origin') ?? new URL(req.url).origin;
  const productName = kind === 'therapy' ? 'Terapia mensual (Neuromundi)' : 'Consulta (Neuromundi)';

  const metadata: Record<string, string> = {
    kind,
    provider_id: body.providerId,
    payer_id: u.user.id,
    payer_name: payerName,
    payer_rfc: payerRfc,
  };
  if (body.appointmentId) metadata.appointment_id = body.appointmentId;

  const session = await stripe.checkout.sessions.create(
    kind === 'therapy'
      ? {
          mode: 'subscription',
          line_items: [{
            quantity: 1,
            price_data: {
              currency,
              unit_amount: unitAmount,
              recurring: { interval: 'month' },
              product_data: { name: productName },
            },
          }],
          subscription_data: { transfer_data: { destination: provider.stripe_connect_id }, metadata },
          metadata,
          success_url: `${origin}/panel?pay=ok`,
          cancel_url: `${origin}/panel?pay=cancel`,
        }
      : {
          mode: 'payment',
          line_items: [{
            quantity: 1,
            price_data: { currency, unit_amount: unitAmount, product_data: { name: productName } },
          }],
          payment_intent_data: { transfer_data: { destination: provider.stripe_connect_id } },
          metadata,
          success_url: `${origin}/panel?pay=ok`,
          cancel_url: `${origin}/panel?pay=cancel`,
        },
  );

  // Registro 'pending' (el webhook lo marcará 'paid').
  await admin.from('payments').insert({
    provider_id: body.providerId,
    payer_id: u.user.id,
    appointment_id: body.appointmentId ?? null,
    kind,
    amount_cents: unitAmount,
    currency,
    status: 'pending',
    payer_name: payerName,
    payer_rfc: payerRfc,
    stripe_session_id: session.id,
  });

  return json(200, { url: session.url });
});
