// ============================================================================
// Supabase Edge Function: send-campaign
// Envía una campaña del especialista a su lista de espera o a sus pacientes,
// por los canales elegidos: push/in-app, email (Resend) y SMS (Twilio).
//
// Body: { campaignId }  — requiere el JWT del dueño de la campaña.
//
// Secrets:
//   RESEND_API_KEY, SUPPORT_FROM            (email)
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM   (SMS; tiene costo)
// Si falta el secreto de un canal, ese canal se omite sin romper el resto.
//
// Despliegue:  supabase functions deploy send-campaign
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false },
});

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPPORT_FROM = Deno.env.get('SUPPORT_FROM') ?? 'Neuromundi <avisos@neuromundi.com>';
const TW_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TW_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TW_SMS_FROM = Deno.env.get('TWILIO_SMS_FROM') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: SUPPORT_FROM, to: [to], subject, text }),
  });
  return r.ok;
}

async function sendSms(toPhone: string, body: string): Promise<boolean> {
  if (!TW_SID || !TW_TOKEN || !TW_SMS_FROM || !toPhone) return false;
  const digits = toPhone.replace(/[^\d+]/g, '');
  const form = new URLSearchParams({ From: TW_SMS_FROM, To: digits, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${TW_SID}:${TW_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Identificar al llamante por su JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData } = await admin.auth.getUser(token);
  const uid = userData?.user?.id;
  if (!uid) return json({ error: 'auth' }, 401);

  const { campaignId } = await req.json().catch(() => ({ campaignId: null }));
  if (!campaignId) return json({ error: 'no campaignId' }, 400);

  const { data: camp } = await admin.from('campaigns').select('*').eq('id', campaignId).single();
  if (!camp) return json({ error: 'not_found' }, 404);
  if (camp.owner_id !== uid) return json({ error: 'forbidden' }, 403);
  if (camp.status === 'sent' || camp.status === 'sending') return json({ error: 'already' }, 409);

  await admin.from('campaigns').update({ status: 'sending' }).eq('id', campaignId);

  const { data: recipients } = await admin.rpc('campaign_recipients', { p_campaign_id: campaignId });
  const list = (recipients ?? []) as Array<{ user_id: string; full_name: string | null; phone: string | null }>;
  const channels: string[] = camp.channels ?? [];

  let sent = 0;
  for (const r of list) {
    let any = false;

    // Push nativo + in-app: al insertar la notificación se dispara send-push.
    if (channels.includes('push')) {
      const { error } = await admin.from('notifications').insert({
        user_id: r.user_id,
        type: 'campaign',
        title: camp.title,
        body: camp.body,
        data: { campaign_id: campaignId },
      });
      if (!error) any = true;
    }

    if (channels.includes('email')) {
      const { data: au } = await admin.auth.admin.getUserById(r.user_id);
      const email = au?.user?.email ?? '';
      if (await sendEmail(email, camp.title, camp.body)) any = true;
    }

    if (channels.includes('sms') && r.phone) {
      if (await sendSms(r.phone, `${camp.title}: ${camp.body}`)) any = true;
    }

    if (any) sent++;
  }

  await admin.from('campaigns').update({ status: 'sent', sent_count: sent }).eq('id', campaignId);
  return json({ ok: true, recipients: list.length, sent });
});
