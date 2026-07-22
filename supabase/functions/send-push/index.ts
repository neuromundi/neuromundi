// ============================================================================
// Supabase Edge Function: send-push
// Envía notificaciones Web Push (VAPID) a las suscripciones de un usuario.
// La invoca el trigger trg_notify_push al crear una notificación in-app.
//
// Secrets:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   (genera con: npx web-push generate-vapid-keys)
//   VAPID_SUBJECT                         (p. ej. mailto:admin@neuromundi.com)
// El VITE_VAPID_PUBLIC_KEY del front debe ser IGUAL a VAPID_PUBLIC_KEY.
//
// Despliegue:
//   supabase functions deploy send-push --no-verify-jwt
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const PUB = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIV = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@neuromundi.com';
if (PUB && PRIV) webpush.setVapidDetails(SUBJECT, PUB, PRIV);

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (!PUB || !PRIV) return json({ skipped: 'no-vapid' });
  const body = await req.json().catch(() => ({}));
  const userId = body?.user_id as string | undefined;
  if (!userId) return json({ error: 'no user_id' }, 400);

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  const payload = JSON.stringify({
    title: body?.title || 'Neuromundi',
    body: body?.body || '',
    data: body?.data || {},
  });

  let sent = 0, gone = 0;
  for (const s of (subs ?? []) as Array<{ endpoint: string; p256dh: string; auth: string }>) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        gone++;
      }
    }
  }
  return json({ sent, gone });
});
