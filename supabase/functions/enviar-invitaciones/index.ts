// ============================================================================
// Supabase Edge Function: enviar-invitaciones
//
// Envía la invitación "reclama tu ficha y únete a Neuromundi" a los contactos
// del directorio (tabla directorio_invitaciones). Sustituye al script obsoleto
// scripts/invite-providers.mjs.
//
// SEGMENTACIÓN (3 tandas, distinto mensaje):
//   · nuevos           → nunca contactados: primera invitación.
//   · ya_publico_social → ya contactados el 8-sep y son público/social: mensaje
//                         CORRECTIVO (su membresía es gratuita; repara el error
//                         del 8-sep donde recibieron oferta de pago).
//   · ya_privado       → ya contactados el 8-sep y privados: seguimiento suave.
//
// GARANTÍAS DE SEGURIDAD:
//   1) DRY-RUN por defecto: solo envía con {"send": true}.
//   2) Candado fail-closed: header x-cron-secret == CRON_SECRET. Sin cron.
//   3) La cola (directorio_invitaciones_cola) filtra no-enviada/cancelada/usada/
//      baja/expirada, correo válido, ficha publicada, no reclamada, no rebotado.
//   4) Sector decide el encuadre: público/social SIN oferta de pago.
//   5) Marca enviada_en solo tras éxito + Idempotency-Key por token en Resend
//      (evita doble envío si se reintenta).
//
// Body: { send?: boolean, limit?: number, segment?: 'nuevos'|'ya_publico_social'
//         |'ya_privado'|'todos' }
// Secrets: RESEND_API_KEY, CAMPAIGN_FROM, PUBLIC_SITE_URL, CRON_SECRET.
// Despliegue: supabase functions deploy enviar-invitaciones --no-verify-jwt
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CAMPAIGN_FROM') ?? 'Neuromundi <admin@admin.neuromundi.com>';
const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.neuromundi.com';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendEmail(to: string, subject: string, html: string, idemKey: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idemKey, // evita doble entrega si se reintenta (ventana 24h)
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  return r.ok;
}

interface Row {
  token: string; correo: string; nombre: string;
  provider_type: string | null; sector: string | null;
  estado: string | null; ciudad: string | null; ya_contactado_8sep: boolean;
}

const esFree = (r: Row) =>
  r.sector === 'publico' || r.sector === 'social' || r.provider_type === 'ngo' || r.provider_type === 'company';

function segmentOf(r: Row): 'nuevos' | 'ya_publico_social' | 'ya_privado' {
  if (!r.ya_contactado_8sep) return 'nuevos';
  return esFree(r) ? 'ya_publico_social' : 'ya_privado';
}

function shell(title: string, bodyHtml: string, ctaText: string, ctaUrl: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(90deg,#0ea5e9,#0369a1);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-weight:800;letter-spacing:.04em">NEUROMUNDI</div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:22px 20px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
      <p style="margin:22px 0 8px"><a href="${ctaUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${ctaText}</a></p>
      <p style="color:#64748b;font-size:12px;margin-top:18px">Recibes este correo porque tu organización aparece en el directorio público de Neuromundi, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Si no deseas aparecer, el mismo enlace te permite solicitar la baja.</p>
    </div>
  </div>`;
}

function buildEmail(r: Row): { subject: string; html: string } {
  const claim = `${SITE}/reclamar/${r.token}`;
  const nombre = r.nombre || 'tu organización';
  const seg = segmentOf(r);

  if (seg === 'ya_publico_social') {
    // Correctivo: repara el correo del 8-sep que pudo mencionar una cuota.
    const cuerpo = `<p>Hola, equipo de <b>${nombre}</b>:</p>
      <p>Hace unos días te escribimos sobre tu perfil en el directorio de Neuromundi. Si aquel mensaje daba a entender que había una cuota, <b>una disculpa</b>: para una organización como la tuya la membresía es <b>gratuita</b>.</p>
      <p>Te invitamos a <b>reclamar tu perfil</b> para completarlo, responder mensajes de familias y obtener la Insignia de Miembro Fundador.</p>`;
    return { subject: `${nombre}: tu perfil en Neuromundi es gratuito — reclámalo`, html: shell('Reclama tu perfil (membresía gratuita)', cuerpo, 'Reclamar mi perfil', claim) };
  }

  if (seg === 'ya_privado') {
    // Seguimiento suave: reconoce el contacto previo.
    const cuerpo = `<p>Hola, equipo de <b>${nombre}</b>:</p>
      <p>Hace unos días te invitamos a reclamar tu perfil en el directorio de Neuromundi. Por si se te pasó, aquí está de nuevo el enlace.</p>
      <p>Al reclamarlo entras como <b>Miembro Fundador</b>, con beneficios preferentes de por vida.</p>`;
    return { subject: `${nombre}: te reservamos tu perfil en Neuromundi`, html: shell('Tu perfil te espera en Neuromundi', cuerpo, 'Reclamar mi perfil', claim) };
  }

  // nuevos: primera invitación (gratuita vs. normal según sector).
  const cuerpo = esFree(r)
    ? `<p>Hola, equipo de <b>${nombre}</b>:</p>
       <p>Tu organización ya aparece en el <b>directorio público de Neuromundi</b>. Te invitamos a <b>reclamar tu perfil</b> para completarlo y responder mensajes de familias.</p>
       <p>Para tu tipo de organización la membresía es <b>gratuita</b>, y al reclamar obtienes la <b>Insignia de Miembro Fundador</b>.</p>`
    : `<p>Hola, equipo de <b>${nombre}</b>:</p>
       <p>Tu ficha ya aparece en el <b>directorio público de Neuromundi</b>, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Te invitamos a <b>reclamar tu perfil</b>.</p>
       <p>Si lo reclamas ahora, entras como <b>Miembro Fundador</b>, con beneficios preferentes de por vida.</p>`;
  return { subject: `${nombre}: reclama tu perfil en Neuromundi`, html: shell('Reclama tu perfil en Neuromundi', cuerpo, 'Reclamar mi perfil', claim) };
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json(401, { error: 'No autorizado' });
  }

  let body: { send?: boolean; limit?: number; segment?: string } = {};
  try { body = await req.json(); } catch { /* vacío = dry-run, todos */ }
  const doSend = body.send === true;
  const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 1000);
  const segment = ['nuevos', 'ya_publico_social', 'ya_privado', 'todos'].includes(body.segment ?? '')
    ? (body.segment as string) : 'todos';

  const { data, error } = await admin.rpc('directorio_invitaciones_cola', { p_limit: 1000 });
  if (error) return json(500, { error: error.message });
  let rows = (data ?? []) as Row[];
  if (segment !== 'todos') rows = rows.filter((r) => segmentOf(r) === segment);

  if (!doSend) {
    const conteo: Record<string, number> = { nuevos: 0, ya_publico_social: 0, ya_privado: 0 };
    for (const r of rows) conteo[segmentOf(r)]++;
    return json(200, {
      dry_run: true, segment, total_en_segmento: rows.length, conteo_por_tanda: conteo,
      ejemplos: rows.slice(0, 5).map((r) => ({ correo: r.correo, nombre: r.nombre, tanda: segmentOf(r) })),
      nota: 'DRY-RUN: no se envió ni se marcó nada. Para enviar: {"send": true, "segment": "...", "limit": N}.',
    });
  }

  if (!RESEND_API_KEY) return json(500, { error: 'Falta RESEND_API_KEY' });
  const lote = rows.slice(0, limit);
  let enviados = 0, fallidos = 0;
  for (const r of lote) {
    try {
      const { subject, html } = buildEmail(r);
      if (await sendEmail(r.correo, subject, html, `inv-${r.token}`)) {
        await admin.rpc('directorio_invitacion_enviada', { p_token: r.token });
        enviados++;
      } else { fallidos++; }
    } catch { fallidos++; }
    await sleep(700);
  }
  return json(200, { ok: true, segment, enviados, fallidos, procesados: lote.length });
});
