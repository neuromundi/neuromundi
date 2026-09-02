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

  // ── Descuentos ────────────────────────────────────────────────────────────
  // (1) Programa de recomendación (membership_discount → total_pct):
  //     referral_pct + referrer_pct combinados, solo el primer pago.
  // (2) Código promocional canjeado: 'percent' (se compone con la recomendación)
  //     o 'amount' (monto fijo en su moneda; solo aplica si coincide con la de
  //     cobro del país). Stripe admite un solo cupón por checkout: si hay monto
  //     fijo válido, prevalece; si no, se usa el porcentaje combinado.
  let referralPct = 0;
  try {
    const { data: disc } = await admin.rpc('membership_discount', { p_user: u.user.id });
    const row = Array.isArray(disc) ? disc[0] : disc;
    referralPct = Number(row?.total_pct ?? 0);
  } catch {
    referralPct = 0; // nunca bloquear el cobro por un fallo del descuento
  }

  let promoBenefit = '';
  let promoPct = 0;
  let promoAmount = 0;
  let promoCurrency = '';
  try {
    const { data: pr } = await admin.rpc('membership_promo', { p_user: u.user.id });
    const row = Array.isArray(pr) ? pr[0] : pr;
    if (row) {
      promoBenefit = String(row.benefit ?? '');
      promoPct = Number(row.percent_off ?? 0);
      promoAmount = Number(row.amount_off ?? 0);
      promoCurrency = String(row.amount_currency ?? '').toLowerCase();
    }
  } catch {
    promoBenefit = '';
  }

  // (3) Descuento de FUNDADOR por etapa (campaña de pre-registro): 50% ≤ día 15,
  //     25% día 16–30, 0% después. SOLO en el periodo anual. Las etapas y la fecha
  //     de inicio las edita el admin en campaign_config.
  let founderPct = 0;
  if (period === 'annual') {
    try {
      const { data: camp } = await admin.rpc('campaign_status');
      if (camp?.active && camp.start_at) {
        const days = (Date.now() - new Date(camp.start_at).getTime()) / 86400000;
        if (days >= 0 && Array.isArray(camp.founder_discount)) {
          const stages = [...camp.founder_discount].sort((a, b) => Number(a.days) - Number(b.days));
          for (const s of stages) { if (days <= Number(s.days)) { founderPct = Number(s.pct) || 0; break; } }
        }
      }
    } catch {
      founderPct = 0;
    }
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
  const curr = pricing.currency.toLowerCase();
  let discounts: Array<{ coupon: string }> | undefined;

  if (promoBenefit === 'amount' && promoAmount > 0 && promoCurrency === curr) {
    // Monto fijo en la moneda de cobro; se acota al total para no ir negativo.
    const offMinor = pricing.zero_decimal ? Math.round(promoAmount) : Math.round(promoAmount * 100);
    const amountOff = Math.min(offMinor, unitAmount);
    if (amountOff > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: amountOff,
        currency: curr,
        duration: 'once',
        name: 'Descuento Neuromundi',
        metadata: { user_id: u.user.id, kind: 'promo_amount' },
      });
      discounts = [{ coupon: coupon.id }];
    }
  } else {
    // Porcentaje: recomendación ∘ promo (%) ∘ fundador, acotado al 90%.
    const pct = promoBenefit === 'percent' ? promoPct : 0;
    const combinedPct = (1 - (1 - referralPct / 100) * (1 - pct / 100) * (1 - founderPct / 100)) * 100;
    const discountPct = Math.min(Math.round(combinedPct), 90);
    if (discountPct > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: discountPct,
        duration: 'once',
        name: `Descuento Neuromundi (-${discountPct}%)`,
        metadata: { user_id: u.user.id, kind: 'discount', referral_pct: String(referralPct), promo_pct: String(pct), founder_pct: String(founderPct) },
      });
      discounts = [{ coupon: coupon.id }];
    }
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
    success_url: `${origin}/panel?membership=ok&period=${period}`,
    cancel_url: `${origin}/panel?membership=cancel`,
  });

  return json(200, { url: session.url });
});
