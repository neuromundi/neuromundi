// ============================================================================
// Supabase Edge Function: create-donation-checkout
// Crea una sesión de Stripe Checkout de PAGO ÚNICO para una donación a
// Neuromundi. Puede donar cualquiera, CON O SIN cuenta: si llega un token de
// usuario válido se asocia la donación a su perfil; si no, es un invitado.
//
// El importe y el nivel se RECALCULAN aquí a partir del monto y la moneda: no se
// confía en lo que mande el cliente (podría inflar el nivel de recompensa).
//
// La donación la cobra la propia plataforma (su cuenta Stripe): NO va por
// Connect ni lleva transfer_data — el dinero es para la causa, no para un
// prestador.
//
// body: {
//   amount, currency, isCompany, contactName, orgName?, email,
//   publishConsent, publishAs?, waivePhysical,
//   shipUseRegistered?, shipRecipient?, shipAddress?, shipCity?, shipPostal?, shipCountry?
// }
// Secrets: STRIPE_SECRET_KEY
// Despliegue: supabase functions deploy create-donation-checkout --use-api
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

// Respaldo si la tabla donation_tiers no estuviera disponible. Los importes
// "de verdad" se leen de la base (el admin los edita); esto es solo una red.
const FALLBACK_THRESHOLDS: Record<string, Record<string, number>> = {
  USD: { seed: 10, ally: 50, driver: 100, ambassador: 150 },
  MXN: { seed: 200, ally: 1000, driver: 2000, ambassador: 3000 },
  EUR: { seed: 10, ally: 50, driver: 100, ambassador: 150 },
};
const ZERO_DECIMAL = new Set(['jpy', 'krw', 'clp', 'vnd']);
const LEVELS = ['seed', 'ally', 'driver', 'ambassador'] as const;

function levelFor(amount: number, thresholds: Record<string, number>): string | null {
  if (!(amount > 0)) return null;
  let match: string | null = null;
  for (const l of LEVELS) if (amount >= thresholds[l]) match = l;
  return match;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  try {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!stripeKey) return json(500, { error: 'Falta STRIPE_SECRET_KEY' });
  const url = Deno.env.get('SUPABASE_URL') ?? '';

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json(400, { error: 'Cuerpo inválido' }); }

  const amount = Number(body.amount);
  const currency = String(body.currency ?? '').toUpperCase();

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  // Importes REALES desde la base (el admin los edita). Si la moneda no está
  // activa ahí, se rechaza; si la tabla no respondiera, se usa el respaldo.
  let thresholds: Record<string, number> | null = null;
  const { data: tier } = await admin
    .from('donation_tiers')
    .select('seed_amount, ally_amount, driver_amount, ambassador_amount')
    .eq('currency', currency)
    .eq('is_active', true)
    .maybeSingle();
  if (tier) {
    thresholds = {
      seed: Number(tier.seed_amount),
      ally: Number(tier.ally_amount),
      driver: Number(tier.driver_amount),
      ambassador: Number(tier.ambassador_amount),
    };
  } else if (FALLBACK_THRESHOLDS[currency]) {
    thresholds = FALLBACK_THRESHOLDS[currency];
  }
  if (!thresholds) return json(400, { error: 'Moneda no soportada.' });

  const level = levelFor(amount, thresholds);
  if (!level) return json(400, { error: 'El monto es menor al mínimo para donar.' });

  const email = String(body.email ?? '').trim();
  const contactName = String(body.contactName ?? '').trim();
  if (!email || !contactName) return json(400, { error: 'Faltan datos de contacto.' });

  const isCompany = body.isCompany === true;
  const waivePhysical = body.waivePhysical === true;
  const hasPhysical = LEVELS.indexOf(level as typeof LEVELS[number]) >= LEVELS.indexOf('ally');

  // ¿Miembro? Token opcional: si viene y es válido, se asocia.
  let donorUserId: string | null = null;
  const authHeader = req.headers.get('Authorization') ?? '';
  // El apikey anónimo también llega como Bearer; getUser devuelve null para él,
  // así que esto distingue bien a un usuario real de un invitado.
  if (authHeader) {
    try {
      const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await userClient.auth.getUser();
      donorUserId = u?.user?.id ?? null;
    } catch { donorUserId = null; }
  }

  const cur = currency.toLowerCase();
  const unitAmount = ZERO_DECIMAL.has(cur) ? Math.round(amount) : Math.round(amount * 100);

  // Recompensas digitales automáticas: solo si es miembro (hay a quién otorgar).
  const grantCourse = donorUserId != null;
  const grantBadge = donorUserId != null && level === 'ambassador';

  // Guardamos la donación en 'pending' ANTES de crear la sesión, para tener el
  // registro aunque el usuario abandone el checkout.
  const { data: donation, error: insErr } = await admin
    .from('donations')
    .insert({
      donor_user_id: donorUserId,
      amount_cents: unitAmount,
      currency: cur,
      level,
      is_company: isCompany,
      contact_name: contactName,
      org_name: isCompany ? String(body.orgName ?? '').trim() || null : null,
      email,
      publish_consent: body.publishConsent === true,
      publish_as: (body.publishAs ? String(body.publishAs).trim() : null) || null,
      waive_physical: waivePhysical,
      ship_use_registered: hasPhysical && !waivePhysical ? body.shipUseRegistered === true : false,
      ship_recipient: hasPhysical && !waivePhysical ? String(body.shipRecipient ?? '').trim() || null : null,
      ship_address: hasPhysical && !waivePhysical ? String(body.shipAddress ?? '').trim() || null : null,
      ship_city: hasPhysical && !waivePhysical ? String(body.shipCity ?? '').trim() || null : null,
      ship_postal: hasPhysical && !waivePhysical ? String(body.shipPostal ?? '').trim() || null : null,
      ship_country: hasPhysical && !waivePhysical ? String(body.shipCountry ?? '').trim() || null : null,
      grant_course: grantCourse,
      grant_badge: grantBadge,
      status: 'pending',
    })
    .select('id')
    .single();
  if (insErr || !donation) return json(500, { error: 'No se pudo registrar la donación.' });

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
  const origin = req.headers.get('origin') ?? new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: cur,
        unit_amount: unitAmount,
        product_data: { name: 'Donativo a Neuromundi' },
      },
    }],
    metadata: { kind: 'donation', donation_id: donation.id },
    success_url: `${origin}/donar?estado=ok`,
    cancel_url: `${origin}/donar?estado=cancelado`,
  });

  await admin.from('donations').update({ stripe_session_id: session.id }).eq('id', donation.id);

  return json(200, { url: session.url });
  } catch (e) {
    // CUALQUIER excepción (p. ej. Stripe rechaza la clave) debe responder CON
    // cabeceras CORS y el mensaje real; si no, el navegador solo ve un error de
    // CORS y se oculta la causa. El detalle queda también en los logs.
    console.error('[create-donation-checkout]', e);
    return json(500, { error: e instanceof Error ? e.message : 'Error interno' });
  }
});
