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


/**
 * Idioma del portal de pago de Stripe.
 *
 * Por que (20 oct 2026, detectado por Enyoria en el arranque): sin `locale`,
 * Stripe decide por su cuenta y a un usuario de Mexico le aparecia el portal
 * ENTERO EN INGLES mientras pagaba. Pagar es el momento con menos tolerancia
 * a la confusion de toda la plataforma.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });
  try {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!stripeKey) return json(500, { error: 'Falta STRIPE_SECRET_KEY' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json(401, { error: 'No autenticado' });

  let body: { providerId?: string; appointmentId?: string; kind?: string; payerRfc?: string; amount?: number; currency?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'Cuerpo inválido' }); }
  // Idioma con el que la persona esta usando Neuromundi. Si el cliente no lo
  // manda, se cae al que declare el navegador en la peticion.
  const idiomaPedido: string = ((body as { locale?: string }).locale)
    ?? req.headers.get('accept-language')?.split(',')[0] ?? '';
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
  // Importe SIEMPRE calculado en el servidor (NUNCA se confía en body.amount/
  // body.currency, que un pagador podría manipular). Con appointmentId, se toma
  // del cobro guardado en la cita, validando que la cita sea de ESTE prestador y
  // de ESTE paciente; sin cita, el precio fijo de consulta del prestador.
  let amount: number;
  let currency: string;
  if (body.appointmentId) {
    const { data: appt } = await admin
      .from('appointment_requests')
      .select('specialist_id, recipient_id, charge_total, charge_currency, payment_status')
      .eq('id', body.appointmentId)
      .single();
    if (!appt) return json(404, { error: 'Cita no encontrada' });
    if (appt.specialist_id !== body.providerId || appt.recipient_id !== u.user.id) {
      return json(403, { error: 'La cita no corresponde a este pago.' });
    }
    if (appt.payment_status === 'paid') return json(400, { error: 'La cita ya está pagada.' });
    amount = Number(appt.charge_total);
    currency = String(appt.charge_currency || provider.consultation_currency || '').toLowerCase();
    if (!(amount > 0) || !currency) return json(400, { error: 'La cita no tiene un cobro configurado.' });
  } else {
    amount = Number(provider.consultation_amount);
    currency = String(provider.consultation_currency || '').toLowerCase();
    if (!(amount > 0) || !currency) return json(400, { error: 'El prestador no configuró el precio de la consulta.' });
  }
  const unitAmount = ZERO_DECIMAL.has(currency) ? Math.round(amount) : Math.round(amount * 100);
  // Red de seguridad igual que en la membresía: si un importe configurado acaba
  // por debajo de 100 unidades mínimas, es un error de datos o de moneda, no
  // una oferta. Mejor fallar ruidosamente que cobrar cien veces de menos.
  if (amount > 0 && unitAmount < 100) {
    return json(400, { error: 'Importe mal configurado para esta moneda. Avise al administrador.' });
  }

  // Datos del pagador para el reporte de facturación.
  const { data: payer } = await admin.from('profiles').select('full_name, business_name, rfc').eq('id', u.user.id).single();
  const payerName = payer?.business_name || payer?.full_name || u.user.email || '';
  const payerRfc = body.payerRfc || payer?.rfc || '';

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });
  // Allowlist de origen para las URL de retorno de Stripe: evita que un cliente
  // forje `Origin` y redirija el post-pago a un dominio ajeno.
  const ALLOWED_ORIGINS = ['https://www.neuromundi.com', 'https://neuromundi.com'];
  const reqOrigin = req.headers.get('origin') ?? '';
  const origin = ALLOWED_ORIGINS.includes(reqOrigin)
    ? reqOrigin
    : (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.neuromundi.com');
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
          locale: idiomaDeStripe(idiomaPedido) as 'auto',
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
          locale: idiomaDeStripe(idiomaPedido) as 'auto',
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

  // SI NO QUEDA REGISTRO, NO SE ENTREGA LA URL DE PAGO.
  //
  // Antes este insert no revisaba su `error` —supabase-js no lanza, devuelve
  // { data, error }— y la sesion de Stripe YA estaba creada: si el registro
  // fallaba, el comprador pagaba igual y el webhook buscaba despues una fila
  // que no existia. Venta cobrada sin pedido, sin comision y sin descuento de
  // inventario, y nadie se enteraba.
  //
  // Ahora se expira la sesion y se devuelve error: mejor que no pueda pagar a
  // que pague sin que quede constancia.
  const { error: errReg } = await admin.from('payments').insert({
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
  if (errReg) {
    console.error('registro de pago', errReg.message);
    try { await stripe.checkout.sessions.expire(session.id); } catch { /* ya expirada o no expirable */ }
    return json(500, { error: 'No se pudo registrar la operacion. Intentelo de nuevo.' });
  }

  return json(200, { url: session.url });
  } catch (e) {
    console.error('[create-consultation-checkout]', e);
    return json(500, { error: e instanceof Error ? e.message : 'Error interno del servidor' });
  }
});
