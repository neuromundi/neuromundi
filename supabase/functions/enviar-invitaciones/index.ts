// ============================================================================
// Supabase Edge Function: enviar-invitaciones
//
// Envía la invitación "reclama tu ficha y únete a Neuromundi" a los contactos
// del directorio (tabla directorio_invitaciones). Sustituye a scripts/invite-providers.mjs.
//
// SEGMENTACIÓN por TANDA (mensaje) y por TIPO de correo:
//   segment: 'nuevos' | 'ya_publico_social' | 'ya_privado' | 'todos'
//   tipo_correo: 'personal' | 'institucional' | 'todos'
//     · personal (gmail/hotmail/…) = dato de un individuo → LFPDPPP más estricta.
//
// SEGURIDAD: dry-run por defecto; header x-cron-secret == CRON_SECRET; sin cron;
//   la cola filtra por todas las guardas; sector decide el encuadre; marca
//   enviada_en solo tras éxito + Idempotency-Key por token (no doble envío).
//
// Body: { send?, limit?, segment?, tipo_correo? }
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
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  return r.ok;
}

interface Row {
  token: string; correo: string; nombre: string;
  provider_type: string | null; sector: string | null;
  estado: string | null; ciudad: string | null;
  ya_contactado_8sep: boolean; correo_personal: boolean;
}

const esFree = (r: Row) =>
  r.sector === 'publico' || r.sector === 'social' || r.provider_type === 'ngo' || r.provider_type === 'company';

function segmentOf(r: Row): 'nuevos' | 'ya_publico_social' | 'ya_privado' {
  if (!r.ya_contactado_8sep) return 'nuevos';
  return esFree(r) ? 'ya_publico_social' : 'ya_privado';
}

// Pie legal (LFPDPPP): origen del dato + aviso de privacidad + ARCO + baja.
function footerLegal(): string {
  return `<p style="color:#64748b;font-size:12px;margin-top:18px;line-height:1.5">
    Recibes este correo porque tu organización aparece en directorios públicos (como el DENUE del INEGI) relacionados con neurodesarrollo, neurodivergencia y afecciones neurológicas, y por eso figura en el directorio público de Neuromundi.
    Tratamos tus datos conforme a nuestro <a href="${SITE}/privacy" style="color:#0369a1">Aviso de Privacidad</a>. Puedes ejercer tus derechos ARCO (acceso, rectificación, cancelación u oposición) o pedir que retiremos tu ficha usando el enlace de arriba, o respondiendo a este correo.
    <br><br>Neuromundi · comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas.
  </p>`;
}

function shell(title: string, bodyHtml: string, ctaText: string, ctaUrl: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(90deg,#0ea5e9,#0369a1);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-weight:800;letter-spacing:.04em">NEUROMUNDI</div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:22px 20px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
      <p style="margin:22px 0 8px"><a href="${ctaUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${ctaText}</a></p>
      ${footerLegal()}
    </div>
  </div>`;
}

// Beneficios CURADOS por tipo de destinatario (2-3 puntos, NO feature-dump).
// Mejor práctica: relevancia por rol > lista exhaustiva; el detalle completo vive
// en la landing. Todos cierran con curso+kit gratis. Devuelve un <ul> con estilo.
function beneficios(r: Row, fundador = true): string {
  const pt = r.provider_type ?? '';
  // Cada viñeta lleva UN emoji relevante (calidez + escaneabilidad sin exceso;
  // glifos muy soportados para minimizar problemas de render en Outlook).
  let items: string[];
  if (pt === 'company') {
    items = [
      '🏷️&nbsp; Publica <b>vacantes y oportunidades inclusivas</b> y llega a talento neurodivergente.',
      '🏅&nbsp; Obtén el <b>distintivo de Empresa Inclusiva</b> descargable para tu web y redes.',
      '🆓&nbsp; Membresía <b>gratuita</b> para empresas inclusivas.',
    ];
  } else if (pt === 'ngo') {
    items = [
      '🆓&nbsp; Membresía <b>gratuita</b> para organizaciones de la sociedad civil.',
      '🤝&nbsp; Publica <b>oportunidades</b> (voluntariado, servicio social) y difunde tu labor.',
      '👪&nbsp; Aparece ante <b>familias</b> que buscan apoyo en tu región.',
    ];
  } else if (pt === 'school' || pt === 'clinic') {
    items = [
      '🏫&nbsp; Muestra tu <b>programa de inclusión</b>, grados y admisiones a las familias.',
      '📅&nbsp; Recibe solicitudes y <b>agenda citas</b> desde tu perfil.',
      '💬&nbsp; Mensajería directa con familias que buscan tus servicios.',
    ];
  } else if (pt === 'merchant') {
    items = [
      '🛍️&nbsp; Vende tus productos en la <b>Tienda</b> y cobra directo — Neuromundi <b>no retiene comisión</b>.',
      '🔎&nbsp; Aparece ante familias que buscan productos neuroafirmativos.',
      '⭐&nbsp; Recibe <b>reseñas</b> que dan confianza a nuevos clientes.',
    ];
  } else if (pt === 'tourism') {
    items = [
      '🌿&nbsp; Preséntate como <b>espacio de bajo impacto sensorial</b> con tus horarios amigables.',
      '🔎&nbsp; Aparece ante familias que buscan lugares de esparcimiento inclusivos.',
      '⭐&nbsp; Recibe <b>reseñas</b> de la comunidad.',
    ];
  } else {
    // especialistas y prestadores de servicio (service_provider, wellness, legal, caregiver, etc.)
    items = [
      '📅&nbsp; Recibe citas con tu <b>agenda y widget de reserva</b>, presencial o en línea.',
      '💬&nbsp; Mensajería directa con las <b>familias</b> que buscan tu especialidad.',
      '📈&nbsp; Consulta <b>métricas</b> de tu perfil (vistas y contactos).',
    ];
  }
  const li = items.map((t) => `<li style="margin:6px 0">${t}</li>`).join('');
  const founderLi = fundador
    ? '<li style="margin:6px 0">🏆&nbsp; <b>Distintivo Fundador Neuromundi</b> para tu perfil, tu web y tus redes.</li>'
    : '';
  return `<ul style="margin:8px 0 0;padding:0;list-style:none;color:#334155;font-size:14px;line-height:1.5">${li}
    <li style="margin:6px 0">🎓&nbsp; Acceso <b>gratuito</b> al <b>curso de bienvenida</b> y al <b>kit de herramientas</b>.</li>
    ${founderLi}
    <li style="margin:6px 0">📋&nbsp; Participa en la <b>primera encuesta internacional</b> de la comunidad y recibe sus resultados.</li>
  </ul>`;
}

// Tabla comparativa (versión CORREO, región México): HTML de tablas + estilos en
// línea + palomitas/taches de texto (Gmail/Outlook no soportan flex/grid ni SVG).
function tablaComparativa(): string {
  const yes = '<td align="center" style="padding:9px 4px;color:#16a34a;font-weight:bold;border-bottom:1px solid #f1f5f9">✓</td>';
  const yesNm = '<td align="center" style="padding:9px 4px;background:#eff9ff;color:#16a34a;font-weight:bold;border-bottom:1px solid #f1f5f9">✓</td>';
  const no = '<td align="center" style="padding:9px 4px;color:#cbd5e1;font-weight:bold;border-bottom:1px solid #f1f5f9">✗</td>';
  const feat = (t: string) => `<td style="padding:9px 6px;border-bottom:1px solid #f1f5f9">${t}</td>`;
  // filas: [label, nm, doctoralia, topdoctors, doctoreslat]
  const rows: [string, boolean, boolean, boolean, boolean][] = [
    ['Especializada en neurodivergencia, neurodesarrollo y afecciones neurológicas', true, false, false, false],
    ['Gratis para familias y pacientes', true, true, true, true],
    ['Agenda de citas en línea (presencial o video)', true, true, true, true],
    ['Reseñas de prestadores', true, true, true, true],
    ['Sello y reseñas neuroafirmativas', true, false, false, false],
    ['Comunidad de apoyo entre pares', true, false, false, false],
    ['Kit de herramientas y curso gratuitos', true, false, false, false],
    ['Inclusión laboral y escolar', true, false, false, false],
    ['Tienda especializada', true, false, false, false],
  ];
  const body = rows.map(([label, nm, d, td2, dl]) =>
    `<tr>${feat(label)}${nm ? yesNm : no}${d ? yes : no}${td2 ? yes : no}${dl ? yes : no}</tr>`).join('');
  return `
    <p style="margin:22px 0 8px;font-weight:800;font-size:16px">Cómo se compara Neuromundi</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <tr>
        <td style="padding:8px 6px;background:#f8fafc;color:#64748b;font-weight:bold;text-transform:uppercase;font-size:10px;border-bottom:1px solid #e2e8f0">Característica</td>
        <td align="center" style="padding:8px 4px;background:#0369a1;color:#fff;font-weight:bold;border-bottom:1px solid #e2e8f0">Neuromundi</td>
        <td align="center" style="padding:8px 4px;background:#f1f5f9;font-weight:bold;border-bottom:1px solid #e2e8f0">Doctoralia</td>
        <td align="center" style="padding:8px 4px;background:#f1f5f9;font-weight:bold;border-bottom:1px solid #e2e8f0">Top Doctors</td>
        <td align="center" style="padding:8px 4px;background:#f1f5f9;font-weight:bold;border-bottom:1px solid #e2e8f0">Doctores.lat</td>
      </tr>
      ${body}
      <tr>
        <td style="padding:9px 6px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">Precio<br><span style="font-weight:400;color:#64748b;font-size:10px">Cuota del prestador · pacientes siempre gratis</span></td>
        <td align="center" style="padding:9px 4px;background:#e0f2fe;color:#0369a1;font-weight:800;border-top:2px solid #e2e8f0">≈ $250–$800<br><span style="font-weight:500;color:#64748b;font-size:10px">MXN/mes · fundadores</span></td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">≈ $1,500–$4,000<br><span style="font-weight:500;color:#64748b;font-size:10px">MXN/mes</span></td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">Bajo invitación<br><span style="font-weight:500;color:#64748b;font-size:10px">no público</span></td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">No público</td>
      </tr>
    </table>
    <p style="color:#94a3b8;font-size:10px;margin:6px 2px 0;line-height:1.4">Comparativa con información pública de cada plataforma a septiembre de 2026. Las plataformas mencionadas son marcas de sus respectivos titulares; se citan solo con fines comparativos e informativos.</p>`;
}

function buildEmail(r: Row, fundador = true, promo: string | null = null): { subject: string; html: string } {
  const claim = `${SITE}/reclamar/${r.token}`;
  const nombre = r.nombre || 'tu organización';
  const seg = segmentOf(r);

  // Bloque de cortesía: si viene un código exento, se anuncia arriba del cuerpo.
  const promoBlock = promo
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px 14px">
        🎁 <b>Invitación de cortesía:</b> tu membresía es <b>sin costo</b>. Al registrarte, ingresa este código en el paso de membresía:
        <br><span style="display:inline-block;margin-top:6px;font-size:18px;font-weight:800;letter-spacing:.04em;color:#047857">${promo}</span>
      </p>`
    : '';

  // Invitación estándar (SIN encuadre de Fundador): la usa el envío individual
  // cuando el admin desmarca "invitar como fundador". No cambia la elegibilidad
  // real de fundador (esa se gana automáticamente al cumplir requisitos).
  if (!fundador) {
    const intro = esFree(r)
      ? `<p>Hola, equipo de <b>${nombre}</b>:</p>
         <p>Te invitamos a <b>Neuromundi</b>, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Para tu tipo de organización la membresía es <b>gratuita</b>. Al <b>completar tu perfil</b> obtienes:</p>`
      : `<p>Hola, equipo de <b>${nombre}</b>:</p>
         <p>Te invitamos a <b>Neuromundi</b>, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Al <b>completar tu perfil</b> obtienes:</p>`;
    const cuerpo = `${intro}
      ${beneficios(r, false)}
      ${tablaComparativa()}`;
    return { subject: `${nombre}: te invitamos a Neuromundi`, html: shell('Únete a Neuromundi', promoBlock + cuerpo, 'Completar mi perfil', claim) };
  }

  if (seg === 'ya_publico_social') {
    const cuerpo = `<p>Hola, equipo de <b>${nombre}</b>:</p>
      <p>Hace unos días te escribimos sobre tu perfil en el directorio de Neuromundi. Si aquel mensaje daba a entender que había una cuota, <b>una disculpa</b>: para una organización como la tuya la membresía es <b>gratuita</b>.</p>
      <p>Al <b>completar tu perfil</b> obtienes:</p>
      ${beneficios(r)}
      <p style="margin-top:12px">Y la <b>Insignia de Miembro Fundador</b>, con <u>beneficios preferentes de por vida</u>.</p>
      ${tablaComparativa()}`;
    return { subject: `${nombre}: tu perfil en Neuromundi es gratuito — complétalo`, html: shell('Conviértete en Fundador Neuromundi', promoBlock + cuerpo, 'Quiero ser fundador', claim) };
  }
  if (seg === 'ya_privado') {
    const cuerpo = `<p>Hola, equipo de <b>${nombre}</b>:</p>
      <p>Hace unos días te invitamos a completar tu perfil en el directorio de Neuromundi. Por si se te pasó, aquí está de nuevo lo que obtienes al completarlo:</p>
      ${beneficios(r)}
      <p style="margin-top:12px">Además, al completarlo ahora entras como <b>Miembro Fundador</b>, con <u>beneficios preferentes de por vida</u>.</p>
      ${tablaComparativa()}`;
    return { subject: `${nombre}: te reservamos tu perfil en Neuromundi`, html: shell('Conviértete en Fundador Neuromundi', promoBlock + cuerpo, 'Quiero ser fundador', claim) };
  }
  const intro = esFree(r)
    ? `<p>Hola, equipo de <b>${nombre}</b>:</p>
       <p>Tu organización ya aparece en el <b>directorio público de Neuromundi</b>. Para tu tipo de organización la membresía es <b>gratuita</b>. Al <b>completar tu perfil</b> obtienes:</p>`
    : `<p>Hola, equipo de <b>${nombre}</b>:</p>
       <p>Tu ficha ya aparece en el <b>directorio público de Neuromundi</b>, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Al <b>completar tu perfil</b> obtienes:</p>`;
  const cuerpo = `${intro}
    ${beneficios(r)}
    <p style="margin-top:12px">Y si lo completas ahora, entras como <b>Miembro Fundador</b>, con <u>beneficios preferentes de por vida</u>.</p>
    ${tablaComparativa()}`;
  return { subject: `${nombre}: conviértete en Fundador Neuromundi`, html: shell('Conviértete en Fundador Neuromundi', promoBlock + cuerpo, 'Quiero ser fundador', claim) };
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json(401, { error: 'No autorizado' });
  }

  let body: { send?: boolean; limit?: number; segment?: string; tipo_correo?: string; token?: string; fundador?: boolean; promo?: string | null } = {};
  try { body = await req.json(); } catch { /* vacío = dry-run, todos */ }
  const doSend = body.send === true;
  // Encuadre de fundador en el correo (por defecto sí, como el envío masivo).
  const fundador = body.fundador !== false;
  const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 1000);
  const segment = ['nuevos', 'ya_publico_social', 'ya_privado', 'todos'].includes(body.segment ?? '')
    ? (body.segment as string) : 'todos';
  const tipoCorreo = ['personal', 'institucional', 'todos'].includes(body.tipo_correo ?? '')
    ? (body.tipo_correo as string) : 'todos';

  let rows: Row[] = [];
  if (body.token) {
    // Envío INDIVIDUAL: trae SOLO esa invitación directamente (no por la cola, así
    // no exige estado_revision='publicado' ni crea listados públicos). Lo usa el
    // panel admin vía admin_enviar_invitacion.
    const { data: inv, error: e1 } = await admin
      .from('directorio_invitaciones')
      .select('token, correo, cancelada_en, usada_en, baja_en, expira_en, directorio:directorio_id (nombre, provider_type, sector, estado, ciudad)')
      .eq('token', body.token)
      .maybeSingle();
    if (e1) return json(500, { error: e1.message });
    if (!inv || inv.cancelada_en || inv.usada_en || inv.baja_en || (inv.expira_en && new Date(inv.expira_en) <= new Date())) {
      return json(404, { error: 'invitación no disponible' });
    }
    const d = (inv as { directorio?: { nombre?: string; provider_type?: string; sector?: string; estado?: string; ciudad?: string } }).directorio ?? {};
    rows = [{
      token: inv.token, correo: inv.correo, nombre: d.nombre ?? '',
      provider_type: d.provider_type ?? null, sector: d.sector ?? null,
      estado: d.estado ?? null, ciudad: d.ciudad ?? null,
      ya_contactado_8sep: false,
      correo_personal: /@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\./i.test(inv.correo),
    }];
  } else {
    const { data, error } = await admin.rpc('directorio_invitaciones_cola', { p_limit: 1000 });
    if (error) return json(500, { error: error.message });
    rows = (data ?? []) as Row[];
    if (segment !== 'todos') rows = rows.filter((r) => segmentOf(r) === segment);
    if (tipoCorreo === 'personal') rows = rows.filter((r) => r.correo_personal);
    else if (tipoCorreo === 'institucional') rows = rows.filter((r) => !r.correo_personal);
  }

  if (!doSend) {
    const porTanda: Record<string, number> = { nuevos: 0, ya_publico_social: 0, ya_privado: 0 };
    let personal = 0, institucional = 0;
    for (const r of rows) { porTanda[segmentOf(r)]++; r.correo_personal ? personal++ : institucional++; }
    return json(200, {
      dry_run: true, segment, tipo_correo: tipoCorreo, total: rows.length,
      por_tanda: porTanda, por_tipo_correo: { personal, institucional },
      ejemplos: rows.slice(0, 5).map((r) => ({ correo: r.correo, nombre: r.nombre, tanda: segmentOf(r), personal: r.correo_personal })),
      nota: 'DRY-RUN: no se envió ni se marcó nada. Para enviar: {"send": true, "segment": "...", "tipo_correo": "...", "limit": N}.',
    });
  }

  if (!RESEND_API_KEY) return json(500, { error: 'Falta RESEND_API_KEY' });
  const lote = rows.slice(0, limit);
  let enviados = 0, fallidos = 0;
  for (const r of lote) {
    try {
      const { subject, html } = buildEmail(r, fundador, body.promo ?? null);
      if (await sendEmail(r.correo, subject, html, `inv-${r.token}`)) {
        await admin.rpc('directorio_invitacion_enviada', { p_token: r.token });
        enviados++;
      } else { fallidos++; }
    } catch { fallidos++; }
    await sleep(700);
  }
  return json(200, { ok: true, segment, tipo_correo: tipoCorreo, enviados, fallidos, procesados: lote.length });
});
