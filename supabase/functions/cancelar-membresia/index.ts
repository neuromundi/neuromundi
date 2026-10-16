// ============================================================================
// Supabase Edge Function: cancelar-membresia
//
// Por qué existe (15 oct 2026, auditoría, hallazgo C-9): la membresía es una
// suscripción anual de Stripe y NO había forma de darla de baja. No existía en
// todo el repositorio una sola llamada a la cancelación de suscripciones ni al
// portal de facturación. Quien se daba de baja, se suspendía o borraba su
// cuenta seguía con la suscripción viva y le volvían a cobrar. La única salida
// real del usuario era el contracargo, que es justo lo que avisar-renovacion se
// escribió para evitar.
//
// Qué hace: cancela AL FINAL DEL PERIODO, no al instante. Los días ya pagados
// siguen siendo suyos; lo que se detiene es el próximo cobro.
//
// Despliegue: supabase functions deploy cancelar-membresia
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

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    if (!stripeKey) return json(500, { error: 'Falta STRIPE_SECRET_KEY en el servidor.' });
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

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

    const { data: perfil, error: errPerfil } = await admin
      .from('profiles')
      .select('stripe_subscription_id, membership_paid_until')
      .eq('id', u.user.id)
      .maybeSingle();
    if (errPerfil) return json(500, { error: 'No se pudo leer su membresía.' });
    if (!perfil) return json(404, { error: 'Perfil no encontrado' });

    if (!perfil.stripe_subscription_id) {
      // Sin suscripción no hay nada que cancelar, pero sí se deja constancia:
      // así la pantalla no sigue ofreciendo un botón que no hace nada.
      await admin.rpc('marcar_baja_de_membresia', { p_user: u.user.id });
      return json(200, { ok: true, sin_suscripcion: true, vigente_hasta: perfil.membership_paid_until });
    }

    // AL FINAL DEL PERIODO. Cancelar al instante le quitaría días que ya pagó.
    const sub = await stripe.subscriptions.update(perfil.stripe_subscription_id, {
      cancel_at_period_end: true,
      metadata: { cancelada_por: 'usuario', cancelada_en: new Date().toISOString() },
    });

    const { error: errMarca } = await admin.rpc('marcar_baja_de_membresia', { p_user: u.user.id });
    if (errMarca) {
      // La suscripción YA quedó cancelada en Stripe. Si no se pudo dejar
      // constancia, se avisa a los administradores en vez de callar: la
      // pantalla diría que sigue activa cuando ya no se va a renovar.
      console.error('marcar_baja_de_membresia', errMarca.message);
      await admin.rpc('notify_admins', {
        p_type: 'baja_sin_registrar',
        p_title: 'Se canceló una membresía y no se pudo registrar',
        p_body: 'La suscripción quedó cancelada en Stripe pero no se marcó en el perfil. Revisar.',
        p_data: { user_id: u.user.id, subscription: perfil.stripe_subscription_id },
      }).catch(() => { /* best-effort */ });
    }

    const fin = typeof sub.current_period_end === 'number'
      ? new Date(sub.current_period_end * 1000).toISOString()
      : perfil.membership_paid_until;

    return json(200, { ok: true, vigente_hasta: fin });
  } catch (e) {
    console.error('[cancelar-membresia]', e);
    return json(500, { error: 'No se pudo cancelar la membresía. Inténtelo de nuevo.' });
  }
});
