// ============================================================================
// Supabase Edge Function: connect-onboarding
// Crea (o reutiliza) la cuenta de Stripe Connect (Express) del prestador y
// devuelve un Account Link para que complete su alta y registre su CLABE. La app
// no ve datos bancarios: todo ocurre en Stripe.
//
// Secrets: STRIPE_SECRET_KEY
// Despliegue: supabase functions deploy connect-onboarding
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

// País del prestador → código ISO de Stripe (por defecto MX).
function isoCountry(label: string): string {
  const l = (label ?? '').trim().toLowerCase();
  if (/m[eé]xico/.test(l)) return 'MX';
  if (/united states|estados unidos|usa|eua/.test(l)) return 'US';
  if (/espa/.test(l)) return 'ES';
  if (/argentina/.test(l)) return 'AR';
  if (/colombia/.test(l)) return 'CO';
  if (/chile/.test(l)) return 'CL';
  return 'MX';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!stripeKey) return json(500, { error: 'Falta STRIPE_SECRET_KEY' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json(401, { error: 'No autenticado' });

  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json(401, { error: 'Sesión inválida' });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });
  const { data: profile } = await admin
    .from('profiles')
    .select('role, country, stripe_connect_id')
    .eq('id', u.user.id)
    .single();
  if (!profile || profile.role !== 'provider') return json(403, { error: 'Solo para prestadores/proveedores.' });

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20', httpClient: Stripe.createFetchHttpClient() });

  let accountId = profile.stripe_connect_id ?? '';
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: isoCountry(profile.country ?? ''),
      email: u.user.email ?? undefined,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { user_id: u.user.id },
    });
    accountId = account.id;
    await admin.from('profiles').update({ stripe_connect_id: accountId }).eq('id', u.user.id);
  }

  const origin = req.headers.get('origin') ?? new URL(req.url).origin;
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/ajustes?connect=refresh`,
    return_url: `${origin}/ajustes?connect=done`,
    type: 'account_onboarding',
  });

  return json(200, { url: link.url });
});
