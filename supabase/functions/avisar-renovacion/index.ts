// ============================================================================
// Supabase Edge Function: avisar-renovacion
//
// Avisa por correo ANTES de que Stripe cobre la renovación automática.
//
// POR QUÉ EXISTE. La membresía es una suscripción anual que se cobra sola.
// Entre un cobro y el siguiente pasan doce meses: mucha gente no recuerda que
// se suscribió, ve el cargo y lo disputa. "Suscripción cancelada y cobrada
// igual" es de los motivos de contracargo más comunes, y cada disputa cuesta
// una comisión que Stripe no devuelve, se gane o se pierda. Avisar convierte un
// cargo sorpresa en un cargo esperado.
//
// SEGURIDAD: dry-run por defecto; header x-cron-secret == CRON_SECRET.
//   La constancia (marcar_aviso_renovacion) se escribe SOLO tras envío exitoso,
//   e Idempotency-Key por usuario+periodo+etapa evita el doble aviso.
//
// Body: { dias?: 7 | 1, send?: boolean, limit?: number }
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

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TZ = 'America/Mexico_City';
const fechaLarga = (d: Date) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d);

interface Fila {
  user_id: string; correo: string; nombre: string;
  renueva_el: string; etapa: string; periodo: string | null;
}

// Firma institucional: mismo bloque visual que la invitación (logo, correo,
// teléfono y sitio), en TEXTO porque Outlook bloquea imágenes por defecto.
//
// El nombre de la CEO se reserva para el correo de invitación al directorio,
// que es una presentación personal. Toda la demás correspondencia va firmada
// por el Equipo Comunidad Neuromundi.
function firmaOficial(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0">
    <tr>
      <td style="padding-right:14px;vertical-align:middle">
        <img src="${SITE}/icon-192.png" width="64" height="64" alt="Neuromundi"
             style="display:block;border:0;width:64px;height:64px">
      </td>
      <td style="vertical-align:middle;border-left:2px solid #e2e8f0;padding-left:14px;font-size:13px;line-height:1.5;color:#334155">
        <b style="font-size:15px;color:#0f172a">Equipo Comunidad Neuromundi</b><br>
        Atención a miembros &middot; Neuromundi<br>
        <a href="mailto:admin@neuromundi.com" style="color:#0369a1;text-decoration:none">admin@neuromundi.com</a>
        &middot; (442) 271 4419<br>
        <a href="${SITE}" style="color:#0369a1;text-decoration:none"><b>www.neuromundi.com</b></a>
      </td>
    </tr>
  </table>`;
}

function shell(title: string, bodyHtml: string, ctaText: string, ctaUrl: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(90deg,#0ea5e9,#0369a1);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-weight:800;letter-spacing:.04em">NEUROMUNDI</div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:22px 20px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
      <p style="margin:22px 0 8px"><a href="${ctaUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${ctaText}</a></p>
      ${firmaOficial()}
      <p style="color:#64748b;font-size:12px;margin-top:18px;line-height:1.5">
        Recibe este aviso porque tiene una membresía activa en Neuromundi. Puede cancelar la
        renovación en cualquier momento desde su panel, sin dar explicaciones.
        <br><br>Neuromundi &middot; comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas.
      </p>
    </div>
  </div>`;
}

function buildEmail(r: Fila): { subject: string; html: string } {
  const nombre = esc(r.nombre || 'su organización');
  const cuando = fechaLarga(new Date(`${r.renueva_el}T12:00:00Z`));
  const cada = r.periodo === 'monthly' ? 'mensual' : 'anual';
  const inminente = r.etapa === 'd1';

  const cuerpo = `<p>Hola, <b>${nombre}</b>:</p>
    <p>Le escribimos solo para avisarle, sin que tenga que hacer nada: su membresía ${cada} de
      Neuromundi <b>se renueva ${inminente ? 'mañana' : `el ${cuando}`}</b> y el cargo se hará
      automáticamente con el método de pago que dejó registrado.</p>
    <p>Preferimos decírselo antes a que le aparezca un cargo que no esperaba.</p>
    <p>Si todo está bien, no tiene que hacer nada: su perfil y sus herramientas siguen igual.</p>
    <p>Si prefiere <b>no renovar</b>, puede cancelarla desde su panel antes de esa fecha, sin dar
      explicaciones y sin perder el acceso durante los días que ya tiene cubiertos.</p>`;

  return {
    subject: inminente
      ? `${r.nombre}: su membresía Neuromundi se renueva mañana`
      : `${r.nombre}: su membresía Neuromundi se renueva el ${cuando}`,
    html: shell('Su renovación está cerca', cuerpo, 'Ver mi membresía', `${SITE}/ajustes`),
  };
}

async function sendEmail(to: string, subject: string, html: string, idemKey: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const bajaMailto = (FROM.match(/<([^>]+)>/)?.[1] ?? FROM).trim();
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({
      from: FROM, to: [to], subject, html,
      headers: { 'List-Unsubscribe': `<mailto:${bajaMailto}?subject=baja>` },
    }),
  });
  return r.ok;
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json(401, { error: 'No autorizado' });
  }

  let body: { dias?: number; send?: boolean; limit?: number } = {};
  try { body = await req.json(); } catch { /* vacío = dry-run a 7 días */ }
  const dias = body.dias === 1 ? 1 : 7;
  const doSend = body.send === true;
  const limit = Math.min(Math.max(Number(body.limit ?? 200), 1), 500);

  const { data, error } = await admin.rpc('renovaciones_por_avisar', { p_dias: dias });
  if (error) return json(500, { error: error.message });
  const rows = ((data ?? []) as Fila[]).slice(0, limit);

  if (!doSend) {
    return json(200, {
      dry_run: true, dias, total: rows.length, remitente: FROM,
      ejemplos: rows.slice(0, 5).map((r) => ({ correo: r.correo, nombre: r.nombre, renueva_el: r.renueva_el })),
      nota: 'DRY-RUN: no se envió ni se marcó nada.',
    });
  }

  if (!RESEND_API_KEY) return json(500, { error: 'Falta RESEND_API_KEY' });

  let enviados = 0, fallidos = 0;
  for (const r of rows) {
    try {
      const { subject, html } = buildEmail(r);
      const idem = `renov-${r.user_id}-${r.renueva_el}-${r.etapa}`;
      if (await sendEmail(r.correo, subject, html, idem)) {
        // La constancia SOLO tras el envío exitoso.
        await admin.rpc('marcar_aviso_renovacion', {
          p_user: r.user_id, p_periodo: r.renueva_el, p_etapa: r.etapa,
        });
        enviados++;
      } else { fallidos++; }
    } catch { fallidos++; }
    await sleep(700);
  }
  return json(200, { ok: true, dias, enviados, fallidos, procesados: rows.length });
});
