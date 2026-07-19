// ============================================================================
// Supabase Edge Function: send-support
// Envía el correo de soporte/reporte de fallas a admin@neuromundi.com SIN abrir
// el cliente de correo del usuario. Usa Resend (https://resend.com) por HTTP.
//
// Variables de entorno (configúralas con `supabase secrets set ...`):
//   RESEND_API_KEY  → API key de Resend (obligatoria).
//   SUPPORT_TO      → destinatario. Por defecto: admin@neuromundi.com
//   SUPPORT_FROM    → remitente verificado en Resend.
//                     Por defecto: "Soporte Neuromundi <soporte@neuromundi.com>"
//                     (el dominio debe estar verificado en Resend).
//
// Despliegue:
//   supabase functions deploy send-support
//   supabase secrets set RESEND_API_KEY=re_xxx
//
// Se invoca desde el cliente con supabase.functions.invoke('send-support', { body }).
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPPORT_TO = Deno.env.get('SUPPORT_TO') ?? 'admin@neuromundi.com';
const SUPPORT_FROM = Deno.env.get('SUPPORT_FROM') ?? 'Soporte Neuromundi <soporte@neuromundi.com>';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

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

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' });

  if (!RESEND_API_KEY) {
    return json(500, { error: 'Falta configurar RESEND_API_KEY en el servidor.' });
  }

  let payload: {
    category?: string;
    message?: string;
    url?: string;
    userAgent?: string;
    locale?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Cuerpo inválido.' });
  }

  const message = (payload.message ?? '').trim();
  if (message.length < 3) return json(400, { error: 'El mensaje es obligatorio.' });
  if (message.length > 5000) return json(400, { error: 'El mensaje es demasiado largo.' });

  const category = (payload.category ?? 'other').slice(0, 40);

  // Identidad del usuario autenticado (si la hay), leída de su JWT.
  let userEmail = 'anónimo';
  let userId = '—';
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        userEmail = data.user.email ?? 'sin correo';
        userId = data.user.id;
      }
    }
  } catch {
    // Sin sesión o token inválido: se envía como anónimo.
  }

  const subject = `[Soporte Neuromundi] ${category}`;
  const meta = [
    `Categoría: ${category}`,
    `Usuario: ${userEmail} (${userId})`,
    `URL: ${payload.url ?? '—'}`,
    `Idioma: ${payload.locale ?? '—'}`,
    `User-Agent: ${payload.userAgent ?? '—'}`,
  ];

  const html = `
    <h2>Nueva solicitud de soporte</h2>
    <p><strong>Categoría:</strong> ${escapeHtml(category)}</p>
    <p><strong>Usuario:</strong> ${escapeHtml(userEmail)} (${escapeHtml(userId)})</p>
    <p style="white-space:pre-wrap;border-left:3px solid #ddd;padding-left:12px">${escapeHtml(message)}</p>
    <hr/>
    <p style="color:#888;font-size:12px">
      URL: ${escapeHtml(payload.url ?? '—')}<br/>
      Idioma: ${escapeHtml(payload.locale ?? '—')}<br/>
      User-Agent: ${escapeHtml(payload.userAgent ?? '—')}
    </p>`;

  const text = `${meta.join('\n')}\n\n${message}`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: SUPPORT_FROM,
      to: [SUPPORT_TO],
      subject,
      html,
      text,
      // Si el usuario está autenticado, permite responderle directamente.
      reply_to: userEmail.includes('@') ? userEmail : undefined,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json(502, { error: 'El proveedor de correo rechazó el envío.', detail });
  }

  return json(200, { ok: true });
});
