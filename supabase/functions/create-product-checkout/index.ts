// ============================================================================
// Supabase Edge Function: create-product-checkout
// Mini-tienda transaccional. Crea una sesión de Stripe Checkout (pago único) con
// "destination charge" al vendedor. El servidor no toca tarjetas.
//
// DINERO: la plataforma NO retiene nada. El vendedor recibe el 100% de su venta
// (menos la comisión de Stripe) y es él quien le paga a su promotor. Si viene un
// código de afiliado solo se CALCULA y REGISTRA la comisión en el pedido; de ahí
// la recoge el libro de comisiones (migración 0043) para que el vendedor la
// administre y la liquide.
//
// Antes esto mandaba `application_fee_amount` con la comisión, lo que la desviaba
// al balance de Stripe de Neuromundi y obligaba a liquidarla desde la plataforma.
// Se quitó a propósito: NO lo vuelvas a poner sin cambiar también el libro de
// comisiones, o el promotor quedaría cobrando dos veces.
//
// body: { productId, affiliateCode? }
// Secrets: STRIPE_SECRET_KEY
// Despliegue: supabase functions deploy create-product-checkout
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

  let body: { productId?: string; affiliateCode?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'Cuerpo inválido' }); }
  if (!body.productId) return json(400, { error: 'Falta productId' });

  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json(401, { error: 'Sesión inválida' });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });

  const { data: product } = await admin
    .from('products')
    .select('id, name, price, currency, vendor_id, is_active, stock')
    .eq('id', body.productId)
    .single();
  if (!product || !product.is_active) return json(404, { error: 'Producto no disponible' });
  if (!product.price) return json(400, { error: 'El producto no tiene precio.' });
  // Inventario: stock null = sin control; 0 = agotado.
  if (product.stock != null && product.stock <= 0) return json(409, { error: 'Producto agotado.' });

  const { data: vendor } = await admin
    .from('profiles')
    .select('stripe_connect_id, stripe_charges_enabled, accepts_payments')
    .eq('id', product.vendor_id)
    .single();
  if (!vendor?.accepts_payments || !vendor.stripe_connect_id || !vendor.stripe_charges_enabled) {
    return json(400, { error: 'El vendedor aún no tiene pagos habilitados.' });
  }

  const currency = String(product.currency).toLowerCase();
  const unitAmount = ZERO_DECIMAL.has(currency) ? Math.round(Number(product.price)) : Math.round(Number(product.price) * 100);

  // Afiliado (opcional).
  let affiliateId: string | null = null;
  let commissionCents = 0;
  if (body.affiliateCode) {
    const { data: aff } = await admin.rpc('resolve_affiliate', { p_code: body.affiliateCode });
    const row = Array.isArray(aff) ? aff[0] : null;
    if (row && row.provider_id && row.provider_id !== product.vendor_id) {
      affiliateId = row.provider_id;
      commissionCents = Math.round((unitAmount * Number(row.commission_pct)) / 100);
    }
  }

  const { data: buyer } = await admin.from('profiles').select('full_name, business_name').eq('id', u.user.id).single();
  const buyerName = buyer?.business_name || buyer?.full_name || u.user.email || '';

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
  const origin = req.headers.get('origin') ?? new URL(req.url).origin;

  const metadata: Record<string, string> = { kind: 'product', product_id: product.id, buyer_id: u.user.id, vendor_id: product.vendor_id };
  if (affiliateId) metadata.affiliate_id = affiliateId;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency, unit_amount: unitAmount, product_data: { name: product.name } } }],
    payment_intent_data: {
      // Sin application_fee: el importe íntegro va al vendedor. La comisión del
      // promotor se registra en `orders.commission_cents` y la paga el vendedor.
      transfer_data: { destination: vendor.stripe_connect_id },
    },
    metadata,
    success_url: `${origin}/tienda?buy=ok`,
    cancel_url: `${origin}/tienda?buy=cancel`,
  });

  await admin.from('orders').insert({
    product_id: product.id,
    buyer_id: u.user.id,
    vendor_id: product.vendor_id,
    affiliate_id: affiliateId,
    product_name: product.name,
    amount_cents: unitAmount,
    currency,
    commission_cents: commissionCents,
    status: 'pending',
    buyer_name: buyerName,
    stripe_session_id: session.id,
  });

  return json(200, { url: session.url });
});
