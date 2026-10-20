// ============================================================================
// Supabase Edge Function: eventos-de-correo
//
// Recibe los avisos (webhooks) de Resend y los aplica a la base:
//   · email.bounced / suppressed / failed  -> la ficha queda marcada como
//     rebotada y sale de la cola de invitaciones, sin que nadie lo haga a mano.
//   · email.complained (queja de spam)     -> igual, y ademas se CANCELA la
//     invitacion: a quien marca como spam no se le vuelve a escribir, ni con un
//     recordatorio. Es la senal que de verdad puede hundir la reputacion del
//     dominio.
//   · email.delivered / opened / clicked   -> quedan registrados para el panel.
//
// Hasta el 20 de octubre de 2026 los rebotes solo llegaban como correo al buzon
// del administrador y las quejas no se veian en ningun lado.
//
// SEGURIDAD: el endpoint es PUBLICO (Resend no puede mandar cabeceras secretas),
// asi que TODO depende de la firma. Sin firma valida se responde 401 y no se
// escribe nada. El secreto vive en RESEND_WEBHOOK_SECRET.
//
// Despliegue: supabase functions deploy eventos-de-correo --no-verify-jwt
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { firmaEsValida } from '../_compartido/firmaSvix.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const SECRETO = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? '';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Eventos que SI nos interesan. Cualquier otro se responde 200 sin escribir:
// un 4xx haria que Resend reintentara para siempre un aviso que no usamos.
const CONOCIDOS = new Set([
  'email.delivered', 'email.bounced', 'email.complained', 'email.failed',
  'email.suppressed', 'email.opened', 'email.clicked', 'email.delivery_delayed',
]);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Solo POST' });
  if (!SECRETO) return json(500, { error: 'Falta RESEND_WEBHOOK_SECRET' });

  // El cuerpo se lee como TEXTO y se firma tal cual: volver a serializar el
  // JSON cambia un espacio y la firma deja de coincidir.
  const cuerpo = await req.text();
  const id = req.headers.get('svix-id') ?? req.headers.get('webhook-id') ?? '';
  const timestamp = req.headers.get('svix-timestamp') ?? req.headers.get('webhook-timestamp') ?? '';
  const firmas = req.headers.get('svix-signature') ?? req.headers.get('webhook-signature') ?? '';

  if (!(await firmaEsValida({ cuerpo, id, timestamp, firmas, secreto: SECRETO }))) {
    return json(401, { error: 'Firma no valida' });
  }

  let aviso: { type?: string; created_at?: string; data?: Record<string, unknown> } = {};
  try { aviso = JSON.parse(cuerpo); } catch { return json(400, { error: 'Cuerpo que no es JSON' }); }

  const evento = String(aviso.type ?? '');
  if (!CONOCIDOS.has(evento)) return json(200, { ok: true, ignorado: evento || '(sin tipo)' });

  // El destinatario viene en data.to, que puede ser texto o lista.
  const destino = aviso.data?.to;
  const correo = Array.isArray(destino) ? String(destino[0] ?? '') : String(destino ?? '');
  const mensajeId = String(aviso.data?.email_id ?? '');
  const ocurrido = aviso.created_at ?? null;

  const { data, error } = await admin.rpc('registrar_evento_de_correo', {
    p_evento: evento,
    p_correo: correo,
    p_aviso_id: id,
    p_mensaje_id: mensajeId,
    p_ocurrido: ocurrido,
    p_datos: aviso.data ?? {},
  });

  // Un 500 hace que Resend reintente, que es lo correcto si la base falla.
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true, evento, resultado: data });
});
