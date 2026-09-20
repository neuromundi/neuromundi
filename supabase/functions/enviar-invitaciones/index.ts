// ============================================================================
// Supabase Edge Function: enviar-invitaciones
//
// Envía la invitación "reclama tu ficha y únete a Neuromundi" a los contactos
// del directorio (tabla directorio_invitaciones). Sustituye al script obsoleto
// scripts/invite-providers.mjs (modelo viejo, retirado).
//
// GARANTÍAS DE SEGURIDAD (por diseño):
//   1) DRY-RUN POR DEFECTO. Solo envía si el cuerpo trae {"send": true}.
//      Sin ese flag, lista a quién enviaría y NO envía ni marca nada.
//   2) Candado de invocación fail-closed: exige header x-cron-secret == CRON_SECRET.
//      Sin secreto configurado o sin header correcto → 401 (evita el vector del
//      incidente del 2026-09-08). NO hay cron que la dispare: solo manual.
//   3) La cola (directorio_invitaciones_cola) ya filtra: no enviada, no cancelada,
//      no usada, no baja, no expirada, correo válido, ficha publicada, no
//      reclamada y correo NO rebotado.
//   4) El `sector` decide el encuadre: público/social SIN oferta de pago.
//   5) Marca enviada_en solo tras un envío exitoso (no reenvía).
//
// Secrets (Supabase):
//   RESEND_API_KEY, CAMPAIGN_FROM (remitente verificado), PUBLIC_SITE_URL,
//   CRON_SECRET.
//
// Despliegue:
//   supabase functions deploy enviar-invitaciones --no-verify-jwt
//
// Uso (cuando se autorice el envío):
//   Dry-run (no envía):  POST {} con header x-cron-secret
//   Envío real:          POST {"send": true, "limit": 50} con header x-cron-secret
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

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  return r.ok;
}

interface Row {
  token: string; correo: string; nombre: string;
  provider_type: string | null; sector: string | null;
  estado: string | null; ciudad: string | null;
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

function inviteHtml(row: Row): { subject: string; html: string } {
  const claim = `${SITE}/reclamar/${row.token}`;
  const nombre = row.nombre || 'tu organización';
  // El sector manda: público (gobierno/DIF) y social (A.C./I.A.P./ONG) NO
  // reciben oferta de pago; su membresía es gratuita. Privado recibe el
  // encuadre normal de Miembro Fundador (beneficio, sin fecha límite agresiva).
  const isFree = row.sector === 'publico' || row.sector === 'social'
    || row.provider_type === 'ngo' || row.provider_type === 'company';
  const cuerpo = isFree
    ? `<p>Hola, equipo de <b>${nombre}</b>:</p>
       <p>Tu organización ya aparece en el <b>directorio público de Neuromundi</b>. Te invitamos a <b>reclamar tu perfil</b> para completarlo, responder mensajes de familias y aparecer con tu información al día.</p>
       <p>Para tu tipo de organización la membresía es <b>gratuita</b>, y al reclamar obtienes la <b>Insignia de Miembro Fundador</b> en tu perfil público.</p>`
    : `<p>Hola, equipo de <b>${nombre}</b>:</p>
       <p>Tu ficha ya aparece en el <b>directorio público de Neuromundi</b>, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Te invitamos a <b>reclamar tu perfil</b> para editarlo, recibir contactos y aparecer al día.</p>
       <p>Si lo reclamas ahora, entras como <b>Miembro Fundador</b>, con beneficios preferentes de por vida.</p>`;
  return {
    subject: `${nombre}: reclama tu perfil en Neuromundi`,
    html: shell('Reclama tu perfil en Neuromundi', cuerpo, 'Reclamar mi perfil', claim),
  };
}

Deno.serve(async (req: Request) => {
  // Candado fail-closed: sin CRON_SECRET correcto, no se hace nada.
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json(401, { error: 'No autorizado' });
  }

  let body: { send?: boolean; limit?: number } = {};
  try { body = await req.json(); } catch { /* cuerpo vacío = dry-run */ }
  const doSend = body.send === true;                 // envío real SOLO con {"send": true}
  const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 1000);

  const { data, error } = await admin.rpc('directorio_invitaciones_cola', { p_limit: limit });
  if (error) return json(500, { error: error.message });
  const rows = (data ?? []) as Row[];

  // DRY-RUN: no envía ni marca; devuelve el panorama para revisar.
  if (!doSend) {
    const porSector: Record<string, number> = {};
    for (const r of rows) porSector[r.sector ?? 'privado'] = (porSector[r.sector ?? 'privado'] ?? 0) + 1;
    return json(200, {
      dry_run: true,
      en_cola: rows.length,
      por_sector: porSector,
      ejemplos: rows.slice(0, 5).map((r) => ({ correo: r.correo, nombre: r.nombre, sector: r.sector, con_oferta_pago: !(r.sector === 'publico' || r.sector === 'social' || r.provider_type === 'ngo' || r.provider_type === 'company') })),
      nota: 'DRY-RUN: no se envió ni se marcó nada. Para enviar de verdad: {"send": true}.',
    });
  }

  if (!RESEND_API_KEY) return json(500, { error: 'Falta RESEND_API_KEY' });

  let enviados = 0, fallidos = 0;
  for (const r of rows) {
    try {
      const { subject, html } = inviteHtml(r);
      if (await sendEmail(r.correo, subject, html)) {
        await admin.rpc('directorio_invitacion_enviada', { p_token: r.token });
        enviados++;
      } else {
        fallidos++;
      }
    } catch { fallidos++; }
    await sleep(700); // ~1.4/seg: cuida el límite de Resend y la reputación
  }
  return json(200, { ok: true, enviados, fallidos, procesados: rows.length });
});
