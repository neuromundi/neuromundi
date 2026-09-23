// ============================================================================
// Supabase Edge Function: notify-admin-signup
// Envía un correo a admin@neuromundi.com cada vez que se crea un perfil nuevo
// (registro directo o reclamo de ficha por invitación). La invoca el trigger
// tg_notify_admin_signup (pg_net) al insertarse una fila en public.profiles.
//
// Secrets: RESEND_API_KEY (obligatoria), CRON_SECRET (guarda de acceso),
//          ADMIN_NOTICE_TO (opcional, por defecto admin@neuromundi.com),
//          CAMPAIGN_FROM (remitente verificado en Resend).
// Despliegue: supabase functions deploy notify-admin-signup --no-verify-jwt
// ============================================================================
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CAMPAIGN_FROM') ?? 'Neuromundi <admin@admin.neuromundi.com>';
const TO = Deno.env.get('ADMIN_NOTICE_TO') ?? 'admin@neuromundi.com';
const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.neuromundi.com';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  // Endpoint interno: solo lo invoca el trigger con el secreto compartido.
  const cs = Deno.env.get('CRON_SECRET') ?? '';
  if (!cs || req.headers.get('x-cron-secret') !== cs) return json(401, { error: 'no autorizado' });
  if (!RESEND_API_KEY) return json(200, { skipped: 'no-resend' });

  const b = await req.json().catch(() => ({}));
  const name = String(b?.name || 'Sin nombre');
  const role = String(b?.role || '');
  const providerType = String(b?.provider_type || '');
  const country = String(b?.country || '');
  const memberNo = b?.member_no != null ? String(b.member_no) : '';

  const tipo = providerType || role || '—';
  const folio = memberNo ? `NM-${String(memberNo).padStart(6, '0')}` : '—';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <div style="background:#0369a1;color:#fff;padding:14px 18px;border-radius:12px 12px 0 0;font-weight:800">NEUROMUNDI</div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:18px">
      <h1 style="font-size:18px;margin:0 0 10px">Nuevo perfil creado</h1>
      <p style="margin:4px 0"><b>Nombre:</b> ${esc(name)}</p>
      <p style="margin:4px 0"><b>Tipo:</b> ${esc(tipo)}</p>
      <p style="margin:4px 0"><b>País:</b> ${esc(country || '—')}</p>
      <p style="margin:4px 0"><b>Folio:</b> ${esc(folio)}</p>
      <p style="margin:14px 0 0"><a href="${SITE}/panel" style="color:#0369a1">Ver en el panel</a></p>
    </div>
  </div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [TO], subject: `Nuevo perfil: ${name} (${tipo})`, html }),
  });
  return json(r.ok ? 200 : 502, { sent: r.ok });
});
