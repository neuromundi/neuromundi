// ============================================================================
// Supabase Edge Function: create-membership-checkout
// Crea una sesión de Stripe Checkout (suscripción ANUAL) para la cuota de
// afiliación del usuario, con el precio calculado a partir de la cuota base en
// USD y la configuración por país (tablas membership_fees / country_pricing).
//
// Secrets:
//   STRIPE_SECRET_KEY   (obligatoria)
// Usa SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY del entorno.
//
// Despliegue:
//   supabase functions deploy create-membership-checkout
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
// ============================================================================
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!stripeKey) return json(500, { error: 'Falta STRIPE_SECRET_KEY en el servidor.' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json(401, { error: 'No autenticado' });

  // Usuario autenticado.
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json(401, { error: 'Sesión inválida' });

  // Perfil + configuración (service role).
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
  const { data: profile } = await admin
    .from('profiles')
    .select('role, provider_type, country, membership_status, stripe_customer_id')
    .eq('id', u.user.id)
    .single();
  if (!profile) return json(404, { error: 'Perfil no encontrado' });
  if (profile.membership_status === 'exempt') return json(400, { error: 'Tu cuenta está exenta de pago.' });

  const affiliateType =
    profile.role === 'provider' ? (profile.provider_type ?? 'service_provider') : profile.role;

  const { data: fee } = await admin
    .from('membership_fees')
    .select('base_usd')
    .eq('affiliate_type', affiliateType)
    .eq('is_active', true)
    .maybeSingle();
  if (!fee) return json(400, { error: 'No hay cuota configurada para este tipo de afiliado.' });

  const label = (profile.country ?? '').trim().toLowerCase();
  const { data: pricingRows } = await admin
    .from('country_pricing')
    .select('country_label, currency, fx_per_usd, zero_decimal')
    .in('country_label', [label, 'default']);
  const pricing =
    pricingRows?.find((r) => r.country_label === label) ??
    pricingRows?.find((r) => r.country_label === 'default');
  if (!pricing) return json(400, { error: 'No hay precio por país configurado.' });

  const amountLocal = Number(fee.base_usd) * Number(pricing.fx_per_usd);
  const unitAmount = pricing.zero_decimal ? Math.round(amountLocal) : Math.round(amountLocal * 100);

  const origin = req.headers.get('origin') ?? new URL(req.url).origin;

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });

  // Cliente de Stripe (reutiliza si ya existe).
  let customerId = profile.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: u.user.email ?? undefined,
      metadata: { user_id: u.user.id },
    });
    customerId = customer.id;
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', u.user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pricing.currency.toLowerCase(),
          unit_amount: unitAmount,
          recurring: { interval: 'year' },
          product_data: { name: `Cuota de afiliación Neuromundi (${affiliateType})` },
        },
      },
    ],
    metadata: { user_id: u.user.id, affiliate_type: affiliateType },
    subscription_data: { metadata: { user_id: u.user.id } },
    success_url: `${origin}/panel?membership=ok`,
    cancel_url: `${origin}/panel?membership=cancel`,
  });

  return json(200, { url: session.url });
});
