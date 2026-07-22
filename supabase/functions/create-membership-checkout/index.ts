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
  // Periodicidad elegida por el usuario en el modal de pago.
  const reqBody = await req.json().catch(() => ({}));
  const period: 'monthly' | 'annual' = reqBody?.period === 'monthly' ? 'monthly' : 'annual';

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

  // El tipo NO se toma de provider_type: eso agrupaba a todos los especialistas
  // como 'service_provider' e impedía cobrar la cuota médica. affiliate_type_for
  // aplica la clasificación (profesión + override del admin).
  const { data: typeData } = await admin.rpc('affiliate_type_for', { p_user: u.user.id });
  const affiliateType =
    (typeof typeData === 'string' && typeData) ||
    (profile.role === 'provider' ? (profile.provider_type ?? 'nonmedical_specialist') : profile.role);

  // Clase de miembro: los fundadores tienen su propia tarifa.
  const { data: founderData } = await admin.rpc('is_founder', { p_id: u.user.id });
  const memberClass = founderData === true ? 'founder' : 'ordinary';

  // Precio efectivo por tipo de afiliado y país: el explícito del panel manda;
  // si no hay, cae al cálculo base_usd × FX. Misma fuente que ve el usuario.
  const { data: priceRows } = await admin.rpc('membership_price_for', {
    p_type: affiliateType,
    p_country: profile.country ?? '',
    p_class: memberClass,
    p_period: period,
  });
  const price = Array.isArray(priceRows) ? priceRows[0] : priceRows;
  if (!price?.currency || price.amount == null) {
    return json(400, { error: 'No hay cuota configurada para este tipo de afiliado y país.' });
  }
  const pricing = { currency: String(price.currency), zero_decimal: price.zero_decimal === true };
  const amountLocal = Number(price.amount);
  const unitAmount = pricing.zero_decimal ? Math.round(amountLocal) : Math.round(amountLocal * 100);

  // ── Descuentos del programa de recomendación ──────────────────────────────
  // referral_pct: 5% por llegar con un enlace vigente (solo el primer pago).
  // referrer_pct: 5% acumulado por cada referido suyo que ya pagó (con tope).
  // Se combinan de forma compuesta; el RPC ya devuelve el total equivalente.
  let discountPct = 0;
  try {
    const { data: disc } = await admin.rpc('membership_discount', { p_user: u.user.id });
    const row = Array.isArray(disc) ? disc[0] : disc;
    discountPct = Math.min(Number(row?.total_pct ?? 0), 90);
  } catch {
    discountPct = 0; // nunca bloquear el cobro por un fallo del descuento
  }

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

  // El descuento aplica SOLO al primer pago: cupón `duration: 'once'`.
  let discounts: Array<{ coupon: string }> | undefined;
  if (discountPct > 0) {
    const coupon = await stripe.coupons.create({
      percent_off: discountPct,
      duration: 'once',
      name: `Recomendación Neuromundi (-${discountPct}%)`,
      metadata: { user_id: u.user.id, kind: 'referral' },
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    ...(discounts ? { discounts } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pricing.currency.toLowerCase(),
          unit_amount: unitAmount,
          recurring: { interval: period === 'monthly' ? 'month' : 'year' },
          product_data: {
            name: `Cuota de afiliación Neuromundi — ${affiliateType} · ${memberClass === 'founder' ? 'fundador' : 'ordinaria'} · ${period === 'monthly' ? 'mensual' : 'anual'}`,
          },
        },
      },
    ],
    metadata: {
      user_id: u.user.id,
      affiliate_type: affiliateType,
      member_class: memberClass,
      period,
      discount_pct: String(discountPct),
    },
    subscription_data: { metadata: { user_id: u.user.id } },
    success_url: `${origin}/panel?membership=ok`,
    cancel_url: `${origin}/panel?membership=cancel`,
  });

  return json(200, { url: session.url });
});
