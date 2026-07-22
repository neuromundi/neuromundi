// ============================================================================
// Supabase Edge Function: send-reminders
// Procesa la cola public.appointment_reminders: envía los recordatorios cuyo
// send_at ya venció (24 h y 4 h antes de la cita), por correo (Resend) y/o
// WhatsApp (Twilio). Pensada para ejecutarse periódicamente (cada 5-15 min).
//
// Secrets (opcionales; si falta el de un canal, ese recordatorio se marca 'skipped'):
//   RESEND_API_KEY, SUPPORT_FROM
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM  (p. ej. 'whatsapp:+1415...')
//
// Despliegue:
//   supabase functions deploy send-reminders --no-verify-jwt
// Programación (ejemplo con pg_cron + extensión http, o un scheduler externo):
//   cada 10 min → POST https://<ref>.functions.supabase.co/send-reminders
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPPORT_FROM = Deno.env.get('SUPPORT_FROM') ?? 'Neuromundi <recordatorios@neuromundi.com>';
const TW_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TW_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TW_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') ?? '';

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) return 'skipped';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: SUPPORT_FROM, to: [to], subject, text }),
  });
  return r.ok ? 'sent' : 'failed';
}

async function sendWhatsApp(toPhone: string, body: string) {
  if (!TW_SID || !TW_TOKEN || !TW_FROM) return 'skipped';
  const digits = toPhone.replace(/[^\d+]/g, '');
  const form = new URLSearchParams({ From: TW_FROM, To: `whatsapp:${digits}`, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${TW_SID}:${TW_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  return r.ok ? 'sent' : 'failed';
}

Deno.serve(async () => {
  // Recordatorios vencidos y pendientes (tope para no saturar por corrida).
  const { data: due, error } = await admin
    .from('appointment_reminders')
    .select('id, channel, offset_hours, appointment_id, appointments(starts_at, video_link, patient_id, provider_id)')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .limit(100);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let processed = 0;
  for (const r of due ?? []) {
    const appt = (r as { appointments?: { starts_at: string; video_link: string | null; patient_id: string; provider_id: string } }).appointments;
    if (!appt) continue;

    // Datos de contacto del paciente.
    const { data: patient } = await admin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', appt.patient_id)
      .single();
    const { data: authUser } = await admin.auth.admin.getUserById(appt.patient_id);
    const email = authUser?.user?.email ?? '';
    const when = new Date(appt.starts_at).toLocaleString();
    const link = appt.video_link ? `\nEnlace: ${appt.video_link}` : '';
    const msg = `Recordatorio: tu cita en Neuromundi es el ${when} (en ${r.offset_hours} h).${link}`;

    let result = 'skipped';
    if (r.channel === 'email' && email) result = await sendEmail(email, 'Recordatorio de tu cita — Neuromundi', msg);
    else if (r.channel === 'whatsapp' && patient?.phone) result = await sendWhatsApp(patient.phone, msg);

    await admin.from('appointment_reminders').update({ status: result }).eq('id', r.id);
    processed++;
  }

  // ── Recordatorios por EMAIL de las citas aceptadas (appointment_requests) ──
  // La notificación IN-APP 24 h antes la genera el cron SQL (emit_all_due_*).
  let apptEmails = 0;
  const nowIso = new Date().toISOString();
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: appts } = await admin
    .from('appointment_requests')
    .select('id, recipient_id, specialist_id, title, starts_at, mode, online_url, location')
    .eq('status', 'accepted')
    .is('email_reminded_at', null)
    .gt('starts_at', nowIso)
    .lte('starts_at', soon)
    .limit(100);
  for (const a of (appts ?? []) as Array<{ id: string; recipient_id: string; specialist_id: string; title: string; starts_at: string; mode: string; online_url: string | null; location: string | null }>) {
    const { data: authUser } = await admin.auth.admin.getUserById(a.recipient_id);
    const email = authUser?.user?.email ?? '';
    const { data: spec } = await admin.from('profiles').select('full_name, business_name').eq('id', a.specialist_id).single();
    const specName = spec?.business_name || spec?.full_name || 'tu especialista';
    const when = new Date(a.starts_at).toLocaleString('es-MX');
    const where = a.mode === 'online'
      ? (a.online_url ? `\nSala de video: ${a.online_url}` : '\nModalidad: en línea')
      : (a.location ? `\nLugar: ${a.location}` : '\nModalidad: presencial');
    const body = `Recordatorio: tu cita "${a.title}" con ${specName} es el ${when}.${where}\n\nSi no puedes asistir, avísale al especialista con anticipación.`;
    if (email) await sendEmail(email, 'Recordatorio de tu cita — Neuromundi', body);
    await admin.from('appointment_requests').update({ email_reminded_at: new Date().toISOString() }).eq('id', a.id);
    apptEmails++;
  }

  return new Response(JSON.stringify({ processed, apptEmails }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
