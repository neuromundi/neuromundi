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
// Monedas SIN decimales según Stripe: el importe va tal cual, sin ×100.
//
// La lista anterior ('jpy','krw','clp','vnd') dejaba fuera DOCE monedas, entre
// ellas PYG, que este proyecto ya usa para Paraguay: una consulta de
// PYG 150 000 se habría cobrado como PYG 15 000 000, cien veces más. Es el
// mismo error de factor cien que ya ocurrió en la membresía, aquí todavía
// latente porque ningún prestador tiene moneda de cobro configurada.
const ZERO_DECIMAL = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);
const LEVELS = ['seed', 'ally', 'driver', 'ambassador'] as const;

function levelFor(amount: number, thresholds: Record<string, number>): string | null {
  if (!(amount > 0)) return null;
  let match: string | null = null;
  for (const l of LEVELS) if (amount >= thresholds[l]) match = l;
  return match;
}


/**
 * Idioma del portal de pago de Stripe.
 *
 * Por que (20 oct 2026, detectado por Enyoria en el arranque): sin `locale`,
 * Stripe decide por su cuenta y a un usuario de Mexico le aparecia el portal
 * ENTERO EN INGLES mientras pagaba su cuota. Pagar es el momento con menos
 * tolerancia a la confusion de toda la plataforma.
 *
 * Stripe no admite todos nuestros idiomas: el hebreo no esta en su lista, asi
 * que para ese caso se devuelve 'auto' y decide el navegador. El espanol de
 * America ('es-419') se prefiere sobre el de Espana porque la campana arranca
 * en Mexico y Latinoamerica.
 */
function idiomaDeStripe(lang: string | null | undefined): string {
  const l = (lang ?? '').toLowerCase().slice(0, 5);
  const base = l.slice(0, 2);
  if (base === 'es') return 'es-419';
  if (base === 'pt') return 'pt-BR';
  // 'ar' NO esta en la lista de Stripe (verificado el 23 oct 2026 contra la
  // referencia de la API): mandarlo devuelve 400 y el usuario arabe NO llega
  // a la pantalla de pago. Cae a 'auto' igual que el hebreo.
  const admitidos = ['en', 'fr', 'de', 'it', 'ja', 'ko', 'zh'];
  return admitidos.includes(base) ? base : 'auto';
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
  // Idioma con el que la persona esta usando Neuromundi. Si el cliente no lo
  // manda, se cae al que declare el navegador en la peticion.
  const idiomaPedido: string = ((body as { locale?: string }).locale)
    ?? req.headers.get('accept-language')?.split(',')[0] ?? '';

  const amount = Number(body.amount);
  const currency = String(body.currency ?? '').toUpperCase();

  // Los campos libres acaban en la base y en el muro: se acotan.
  const demasiadoLargo = ['email', 'contactName', 'orgName', 'publishAs', 'shipRecipient',
    'shipAddress', 'shipCity', 'shipPostal', 'shipCountry', 'note']
    .some((k) => typeof body[k] === 'string' && (body[k] as string).length > 300);
  if (demasiadoLargo) return json(400, { error: 'Alguno de los datos es demasiado largo.' });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

  // CONTROL DE TASA. Esta es la única función de borde abierta sin candado:
  // se llama sin ninguna credencial y, antes de crear la sesión de Stripe,
  // inserta una fila en `donations` con nombre, correo y domicilio tal como
  // vienen del cliente. Sin tope, un bucle llena la tabla de donativos con
  // datos inventados y crea sesiones de Checkout sin límite.
  //
  // Sus dos hermanas abiertas SÍ se protegen —send-support limita a 5 envíos
  // por IP cada 10 minutos y reclamar-ficha a 10 por hora, las dos sobre
  // support_throttle—; aquí no se había usado.
  // (Auditoría del 15 oct 2026, hallazgo A-20.)
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  try {
    const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('support_throttle')
      .select('id', { count: 'exact', head: true })
      .eq('ip', `donativo:${ip}`)
      .gte('created_at', desde);
    if ((count ?? 0) >= 8) {
      return json(429, { error: 'Demasiados intentos. Espere unos minutos y vuelva a intentarlo.' });
    }
    await admin.from('support_throttle').insert({ ip: `donativo:${ip}` });
  } catch (e) {
    // Si el control de tasa falla, no se bloquea un donativo legítimo.
    console.error('throttle donativo', e);
  }

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
  // Red de seguridad igual que en la membresía: si un importe configurado acaba
  // por debajo de 100 unidades mínimas, es un error de datos o de moneda, no
  // una oferta. Mejor fallar ruidosamente que cobrar cien veces de menos.
  if (amount > 0 && unitAmount < 100) {
    return json(400, { error: 'Importe mal configurado para esta moneda. Avise al administrador.' });
  }

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
  // Allowlist de origen para las URL de retorno de Stripe: evita que un cliente
  // forje `Origin` y redirija el post-pago a un dominio ajeno.
  const ALLOWED_ORIGINS = ['https://www.neuromundi.com', 'https://neuromundi.com'];
  const reqOrigin = req.headers.get('origin') ?? '';
  const origin = ALLOWED_ORIGINS.includes(reqOrigin)
    ? reqOrigin
    : (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.neuromundi.com');

  const session = await stripe.checkout.sessions.create({
    locale: idiomaDeStripe(idiomaPedido) as 'auto',
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
