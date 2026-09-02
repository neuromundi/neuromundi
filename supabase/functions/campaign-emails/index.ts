// ============================================================================
// Supabase Edge Function: campaign-emails
// Secuencia de correos de la campaña de pre-registro (Resend):
//   · BIENVENIDA (una vez): entrega la recompensa según el tipo de perfil y
//     recuerda la fecha exacta de apertura del país.
//   · RECORDATORIO (cada 5 días): a los perfiles de PAGO que aún no cubren la
//     cuota, con el % de descuento vigente según la etapa, hasta la apertura.
// La cola y el marcado de enviados vienen de las RPCs de la migración 0083.
//
// Secrets:
//   RESEND_API_KEY   → API key de Resend (obligatoria).
//   CAMPAIGN_FROM    → remitente verificado (por defecto admin@neuromundi.com).
//   PUBLIC_SITE_URL  → base para los enlaces (por defecto www.neuromundi.com).
//
// Despliegue (la llama el cron, sin sesión):
//   supabase functions deploy campaign-emails --no-verify-jwt
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CAMPAIGN_FROM') ?? 'Neuromundi <admin@neuromundi.com>';
const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.neuromundi.com';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  return r.ok;
}

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

function shell(title: string, bodyHtml: string, ctaText: string, ctaUrl: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(90deg,#0ea5e9,#0369a1);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-weight:800;letter-spacing:.04em">NEUROMUNDI</div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:22px 20px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
      <p style="margin:22px 0 8px"><a href="${ctaUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${ctaText}</a></p>
      <p style="color:#64748b;font-size:12px;margin-top:18px">Neuromundi — comunidad global para la neurodivergencia.</p>
    </div>
  </div>`;
}

function welcomeHtml(row: { name: string; role: string; provider_type: string | null; opens_at: string | null }): { subject: string; html: string } {
  const opens = fmtDate(row.opens_at);
  const isConsumer = row.role === 'parent' || row.role === 'patient';
  const isOrg = row.provider_type === 'company' || row.provider_type === 'ngo';
  let reward: string;
  if (isConsumer) {
    reward = `<p>Tu membresía es <b>gratuita, nivel Fundador, de por vida</b>. Además participas en el programa de referidos y en el sorteo del día del lanzamiento.</p>`;
  } else if (isOrg) {
    reward = `<p>Tu membresía es <b>siempre gratuita</b> y obtienes la <b>Insignia de Miembro Fundador</b> en tu perfil público, además del curso de bienvenida.</p>`;
  } else {
    reward = `<p>Como <b>Miembro Fundador</b> tienes hasta <b>50% de descuento</b> en tu membresía anual si pagas dentro de los primeros 15 días (25% del día 16 al 30), y tu <b>cuota queda congelada de por vida</b>.</p>`;
  }
  const html = shell(
    `¡Bienvenido, ${row.name}!`,
    `<p>Gracias por asegurar tu lugar como Miembro Fundador de Neuromundi.</p>${reward}${opens ? `<p>El directorio abre en tu país el <b>${opens}</b>.</p>` : ''}<p>Mientras tanto, conoce todos tus beneficios:</p>`,
    'Ver mis beneficios',
    `${SITE}/beneficios`,
  );
  return { subject: '¡Bienvenido a Neuromundi, Miembro Fundador!', html };
}

function reminderHtml(row: { name: string; pct: number; opens_at: string | null }): { subject: string; html: string } {
  const opens = fmtDate(row.opens_at);
  const pctLine = row.pct > 0
    ? `<p>Tu descuento de Fundador vigente es del <b>${row.pct}%</b> sobre la membresía anual. Baja con el paso de los días, así que conviene pagar pronto.</p>`
    : `<p>Completa tu pago para conservar tu estatus de Fundador y la <b>congelación vitalicia</b> de tu cuota.</p>`;
  const html = shell(
    `${row.name}, aún puedes asegurar tu lugar`,
    `${pctLine}${opens ? `<p>El directorio abre en tu país el <b>${opens}</b>: completa tu pago antes para no perder tu pre-registro, descuento y recompensas.</p>` : ''}`,
    'Completar mi pago',
    `${SITE}/panel`,
  );
  return { subject: row.pct > 0 ? `Tu ${row.pct}% de descuento de Fundador te espera` : 'Asegura tu estatus de Fundador', html };
}

Deno.serve(async () => {
  if (!RESEND_API_KEY) return json(500, { error: 'Falta RESEND_API_KEY' });
  let welcome = 0, reminders = 0;

  // Bienvenidas pendientes
  const { data: wq } = await admin.rpc('campaign_welcome_queue');
  for (const row of (wq ?? []) as Array<{ user_id: string; email: string; name: string; role: string; provider_type: string | null; opens_at: string | null }>) {
    try {
      const { subject, html } = welcomeHtml(row);
      if (await sendEmail(row.email, subject, html)) {
        await admin.rpc('campaign_email_sent', { p_user: row.user_id, p_kind: 'welcome' });
        welcome++;
      }
    } catch { /* no romper el lote por un correo */ }
  }

  // Recordatorios de pago
  const { data: rq } = await admin.rpc('campaign_reminder_queue');
  for (const row of (rq ?? []) as Array<{ user_id: string; email: string; name: string; pct: number; opens_at: string | null }>) {
    try {
      const { subject, html } = reminderHtml(row);
      if (await sendEmail(row.email, subject, html)) {
        await admin.rpc('campaign_email_sent', { p_user: row.user_id, p_kind: 'reminder' });
        reminders++;
      }
    } catch { /* idem */ }
  }

  return json(200, { ok: true, welcome, reminders });
});
