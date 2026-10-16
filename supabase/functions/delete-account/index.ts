// ============================================================================
// Supabase Edge Function: delete-account
// Borra la cuenta del usuario autenticado. El borrado de auth.users requiere la
// service_role key (NO se expone al cliente), por eso vive en una Edge Function.
// Al eliminar el usuario, el ON DELETE CASCADE de `profiles` arrastra su perfil
// y datos asociados.
//
// Despliegue:
//   supabase functions deploy delete-account
// (usa automáticamente SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno).
//
// Se invoca desde el cliente con supabase.functions.invoke('delete-account').
// ============================================================================
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json(401, { error: 'No autenticado' });

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey) return json(500, { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' });

  // 1) Identificar al usuario a partir de su propio JWT.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: 'Sesión inválida' });

  const userId = userData.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 2) CANCELAR LA SUSCRIPCIÓN ANTES DE BORRAR.
  //
  // Antes esta función sólo borraba al usuario y confiaba en la cascada. Pero la
  // membresía es una suscripción anual de Stripe, que vive FUERA de esta base:
  // borrar la cuenta no la detiene, así que al año siguiente se le volvía a
  // cobrar a alguien que ya no existe en la plataforma. Y como la cascada
  // destruye el perfil con los identificadores de Stripe, después nadie sabía
  // qué suscripción cancelar: la única salida era el contracargo.
  // (Auditoría del 15 oct 2026, hallazgo C-9.)
  //
  // Aquí se cancela de inmediato, no al final del periodo: la persona se está
  // yendo de la plataforma, no pidiendo conservar lo pagado.
  const { data: perfil } = await admin
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .maybeSingle();

  if (perfil?.stripe_subscription_id) {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    if (!stripeKey) {
      // Sin la clave NO se borra: dejar la cuenta sin suscripción cancelada es
      // peor que no borrarla, porque después no hay a quién atribuir el cobro.
      return json(500, { error: 'No se pudo cancelar su suscripción. Escriba a admin@neuromundi.com antes de borrar la cuenta.' });
    }
    try {
      const stripe = new Stripe(stripeKey, {
        apiVersion: '2024-06-20',
        httpClient: Stripe.createFetchHttpClient(),
      });
      await stripe.subscriptions.cancel(perfil.stripe_subscription_id);
    } catch (e) {
      console.error('[delete-account] cancelar suscripcion', e);
      await admin.rpc('notify_admins', {
        p_type: 'baja_sin_cancelar',
        p_title: 'Pidió borrar su cuenta y no se pudo cancelar su suscripción',
        p_body: 'No se borró la cuenta para no perder el rastro del cobro. Cancelar a mano en Stripe y avisar.',
        p_data: { user_id: userId, subscription: perfil.stripe_subscription_id },
      }).catch(() => { /* best-effort */ });
      return json(500, { error: 'No se pudo cancelar su suscripción. Escriba a admin@neuromundi.com y la resolvemos.' });
    }
  }

  // 3) Borrar el usuario con privilegios de servicio (cascada sobre profiles).
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return json(500, { error: 'No se pudo eliminar la cuenta.', detail: delErr.message });

  return json(200, { ok: true });
});
