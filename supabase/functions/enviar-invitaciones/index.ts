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

// Escapa texto que se interpola en el HTML del correo (nombre de ficha, código).
const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// El enlace de reclamo lleva también el panel de baja, así que sirve como URL
// de cancelación. NO se declara List-Unsubscribe-Post: ese encabezado promete
// baja en un clic por POST, y la página es una SPA que no responde a POST.
// Prometerlo y no cumplirlo perjudica la reputación en vez de ayudarla.
async function sendEmail(
  to: string, subject: string, html: string, idemKey: string, unsubUrl?: string,
): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const bajaMailto = (FROM.match(/<([^>]+)>/)?.[1] ?? FROM).trim();
  const listUnsub = unsubUrl
    ? `<mailto:${bajaMailto}?subject=baja>, <${unsubUrl}>`
    : `<mailto:${bajaMailto}?subject=baja>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify({
      from: FROM, to: [to], subject, html,
      headers: { 'List-Unsubscribe': listUnsub },
    }),
  });
  return r.ok;
}

interface Row {
  token: string; correo: string; nombre: string;
  provider_type: string | null; sector: string | null;
  estado: string | null; ciudad: string | null; pais?: string | null;
  ya_contactado_8sep: boolean; correo_personal: boolean;
  // Solo vienen cuando la cola es por tanda (directorio_invitaciones_cola_tanda).
  orden?: number; affiliate_type?: string | null; moneda?: string | null;
  precio_fundador?: number | null; precio_ordinario?: number | null;
  precio_configurado?: boolean | null;
}

// Precio exacto del destinatario, no un rango. Sale de registration_quote, la
// misma función que usa el checkout, así que el correo y el cobro no pueden
// discrepar. Si la ficha no tiene tarifa configurada se devuelve null y el
// correo cae al texto genérico en vez de inventar una cifra.
const MXN = (n: number) => '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

// ---------------------------------------------------------------------------
// LOS RELOJES DE LA CAMPANA VIVEN EN UN SOLO LUGAR: campaign_config.
//
// Antes estaban escritos a mano en cinco puntos de este archivo, con un
// comentario que pedia acordarse de cambiarlos a mano si cambiaban en la base.
// Eso garantizaba que algun dia el correo prometiera una fecha y la plataforma
// aplicara otra. Ahora se leen de la base en cada invocacion:
//
//   · founder_deadline_by_country[pais]  -> ultimo dia de precio de fundador
//   · verificacion_deadline              -> desde ese dia se degrada el contacto
//
// El plazo de fundador es POR PAIS. Si la ficha no trae pais se usa el de
// Mexico. Si la base no tiene fecha, la frase correspondiente NO se escribe:
// el correo prefiere callar antes que inventar una fecha.
// ---------------------------------------------------------------------------
const TZ = 'America/Mexico_City';
const fechaLarga = (d: Date) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const diaYMes = (d: Date) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: TZ, day: 'numeric', month: 'long' }).format(d);

let RELOJES: { verif: Date | null; fundadorPorPais: Record<string, string> } =
  { verif: null, fundadorPorPais: {} };

async function cargarRelojes(): Promise<void> {
  const { data } = await admin
    .from('campaign_config')
    .select('verificacion_deadline, founder_deadline_by_country')
    .eq('id', 1)
    .maybeSingle();
  const v = (data as { verificacion_deadline?: string | null } | null)?.verificacion_deadline ?? null;
  RELOJES = {
    verif: v ? new Date(v) : null,
    fundadorPorPais: ((data as { founder_deadline_by_country?: Record<string, string> } | null)
      ?.founder_deadline_by_country ?? {}),
  };
}

// Fecha de fundador que le toca a ESTE destinatario, por su pais.
function fundadorDe(r: Row): Date | null {
  const m = RELOJES.fundadorPorPais;
  const iso = m[r.pais || 'México'] ?? m['México'] ?? null;
  return iso ? new Date(iso) : null;
}
// Ultimo dia para confirmar = el dia anterior al corte; el corte es cuando degrada.
const ultimoDiaConfirmar = (): Date | null =>
  RELOJES.verif ? new Date(RELOJES.verif.getTime() - 86400000) : null;
function bloquePrecio(r: Row): string {
  if (!r.precio_configurado || !r.precio_fundador || !r.precio_ordinario) return '';
  const cur = r.moneda || 'MXN';
  const fd = fundadorDe(r);
  return `<div style="margin:18px 0;padding:14px 16px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px">
    <p style="margin:0 0 6px;font-weight:800;font-size:15px;color:#0c4a6e">Su cuota, sin rodeos</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
      La membresía anual para su tipo de perfil es de <b>${MXN(Number(r.precio_ordinario))} ${cur}</b>.
      Si la activa <b>${fd ? `antes del ${fechaLarga(fd)}` : 'durante la campaña de fundadores'}</b> queda como Miembro Fundador y paga
      <b style="color:#0369a1">${MXN(Number(r.precio_fundador))} ${cur} al año</b>, la mitad, y ese precio se le respeta en las renovaciones.
      <br><br>La tarifa de fundador es <b>anual</b>; el pago mensual existe, pero a cuota ordinaria.<br><br>Reclamar la ficha no cobra nada y el pago es un paso posterior: usted decide si lo da.
    </p>
  </div>`;
}

// Quién no paga cuota. Se define arriba porque bloqueFechas la usa.
const esFree = (r: Row) =>
  r.sector === 'publico' || r.sector === 'social' || r.provider_type === 'ngo' || r.provider_type === 'company';

// Las DOS fechas de la campaña, deliberadamente separadas.
//
// En prosa seguida el lector las fusiona y entiende "si no pago me borran del
// directorio", que es falso: la ficha sigue apareciendo siempre con su nombre,
// tipo, ciudad, estado y especialización.
//
// CORRECCIÓN (6 oct 2026). La versión anterior decía que confirmar la ficha
// "conserva los datos de contacto visibles, se pague o no". Desde la migración
// 0166 eso es FALSO: la visibilidad del contacto depende de `cuota_cubierta`
// (pagada o exenta), no de la confirmación, y una ficha reclamada sin pagar se
// degrada igual que una que nadie reclamó. Medido el 30 de septiembre: tras el
// plazo, ficha reclamada sin pagar devuelve teléfono nulo.
//
// Por eso el texto ahora separa los dos incentivos, que son ejes distintos:
//   · confirmar  -> sube en el orden de resultados (columna `verificada`)
//   · cuota      -> conserva teléfono, WhatsApp, correo, sitio, domicilio y mapa
//
// Las dos fechas se leen de `campaign_config` en cada invocación
// (founder_deadline_by_country, por país, y verificacion_deadline). Ya NO se
// escriben a mano aquí: cambiarlas en la base cambia el correo. Se eligen en
// día hábil y en hora de Ciudad de México.
function bloqueFechas(r: Row): string {
  const cur = r.moneda || 'MXN';
  const hayPrecio = r.precio_configurado && r.precio_fundador && r.precio_ordinario;
  const exento = esFree(r);
  const fd = fundadorDe(r);
  const confirmar = ultimoDiaConfirmar();
  const corte = RELOJES.verif;

  // Si falta cualquiera de las dos fechas en la base, esta frase no se escribe:
  // mas vale un correo sin plazo que un correo con un plazo inventado.
  const lineaPlazo = (confirmar && corte)
    ? `<b>${fechaLarga(confirmar)}</b> — último día para confirmar su ficha. A partir del
       ${diaYMes(corte)}, las fichas que no se hayan confirmado se retiran del directorio.`
    : '';

  const lineaPago = (hayPrecio && !exento && fd)
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         <b>${fechaLarga(fd)}</b> — último día para quedar como Miembro Fundador y pagar
         <b style="color:#0369a1">${MXN(Number(r.precio_fundador))} ${cur}</b> al año en lugar de
         <b>${MXN(Number(r.precio_ordinario))} ${cur}</b>. Después de esa fecha aplica la cuota ordinaria.
       </p>`
    : '';

  const cuerpo = exento
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         ${lineaPlazo}
         <b>Su organización está exenta de cuota</b>: conserva su teléfono, su correo, su sitio
         web y su ubicación sin pagar nada.
       </p>
       <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
         Lo único que necesitamos es que confirme la ficha. Es gratuito, toma un minuto y le da el
         control de sus datos. Si no la confirma, la retiramos del directorio en esa fecha.
       </p>`
    : `${lineaPago}<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         ${lineaPlazo}
       </p>
       <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         <b>Confirmar su ficha es gratuito</b> y no lo obliga a contratar nada: sirve para tomar
         posesión de su perfil, corregir sus datos y decidir qué se publica. Le conviene hacerlo,
         porque las fichas sin confirmar aparecen por debajo de las confirmadas en los resultados de
         búsqueda. Pero conviene decirlo con claridad:
         <b>la visibilidad del contacto depende de la cuota, no de la confirmación</b>.
       </p>
       <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
         Su ficha seguirá apareciendo siempre, con su nombre, tipo de perfil, ciudad, estado y
         especialización. Lo que deja de mostrarse sin cuota cubierta es el teléfono, el WhatsApp,
         el correo, el sitio web, el domicilio y la ubicación en el mapa.
       </p>`;

  if (!lineaPlazo && !lineaPago) return '';

  const titulo = exento
    ? 'Una fecha que conviene tener presente'
    : (lineaPago && lineaPlazo ? 'Dos fechas, y son independientes' : 'Una fecha que conviene tener presente');

  return `<div style="margin:18px 0;padding:14px 16px;border:1px solid #e2e8f0;border-radius:12px">
    <p style="margin:0 0 8px;font-weight:800;font-size:15px;color:#0f172a">${titulo}</p>
    ${cuerpo}
  </div>`;
}

function segmentOf(r: Row): 'nuevos' | 'ya_publico_social' | 'ya_privado' {
  if (!r.ya_contactado_8sep) return 'nuevos';
  return esFree(r) ? 'ya_publico_social' : 'ya_privado';
}

// Pie legal (LFPDPPP): origen del dato + aviso de privacidad + ARCO + baja.
function footerLegal(): string {
  return `<p style="color:#64748b;font-size:12px;margin-top:18px;line-height:1.5">
    Recibe este correo porque su organización aparece en directorios públicos (como el DENUE del INEGI) relacionados con neurodesarrollo, neurodivergencia y afecciones neurológicas, y por eso figura en el directorio público de Neuromundi.
    Tratamos sus datos conforme a nuestro <a href="${SITE}/privacy" style="color:#0369a1">Aviso de Privacidad</a>. Puede ejercer sus derechos ARCO (acceso, rectificación, cancelación u oposición) o pedir que retiremos su ficha usando el enlace de arriba, o respondiendo a este correo.
    <br><br>Neuromundi · comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas.
  </p>`;
}

// Firma institucional. Va en TEXTO a proposito: Outlook bloquea imagenes por
// defecto y una firma hecha de imagen deja al destinatario sin nombre ni
// telefono. El logo es pequeno y lleva alt, asi que si no carga no estorba.
function firmaOficial(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0">
    <tr>
      <td style="padding-right:14px;vertical-align:middle">
        <img src="${SITE}/icon-192.png" width="64" height="64" alt="Neuromundi"
             style="display:block;border:0;width:64px;height:64px">
      </td>
      <td style="vertical-align:middle;border-left:2px solid #e2e8f0;padding-left:14px;font-size:13px;line-height:1.5;color:#334155">
        <b style="font-size:15px;color:#0f172a">Mtra. Nelly Montoya</b><br>
        CEO &amp; Fundadora &middot; Neuromundi<br>
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
      '🏷️&nbsp; Publique <b>vacantes y oportunidades inclusivas</b> y llegue a talento neurodivergente.',
      '🏅&nbsp; Obtenga el <b>distintivo de Empresa Inclusiva</b> descargable para su web y sus redes.',
      '🆓&nbsp; Membresía <b>gratuita</b> para empresas inclusivas.',
    ];
  } else if (pt === 'ngo') {
    items = [
      '🆓&nbsp; Membresía <b>gratuita</b> para organizaciones de la sociedad civil.',
      '🤝&nbsp; Publique <b>oportunidades</b> (voluntariado, servicio social) y difunda su labor.',
      '👪&nbsp; Aparezca ante <b>familias</b> que buscan apoyo en su región.',
    ];
  } else if (pt === 'school' || pt === 'clinic') {
    items = [
      '🏫&nbsp; <b>Programa de inclusión visible:</b> muestre sus grados, su propuesta y sus admisiones a las familias.',
      '📅&nbsp; <b>Agenda y reservas en línea:</b> reciba citas directas, presenciales o en línea, desde su perfil.',
      '💬&nbsp; <b>Canal directo de contacto:</b> mensajería inmediata con las familias que buscan sus servicios.',
    ];
  } else if (pt === 'merchant') {
    items = [
      '🛍️&nbsp; Venda sus productos en la <b>Tienda</b> y cobre directo — Neuromundi <b>no retiene comisión</b>.',
      '🔎&nbsp; Aparezca ante familias que buscan productos neuroafirmativos.',
      '⭐&nbsp; Reciba <b>reseñas</b> que dan confianza a nuevos clientes.',
    ];
  } else if (pt === 'tourism') {
    items = [
      '🌿&nbsp; Preséntese como <b>espacio de bajo impacto sensorial</b> con sus horarios amigables.',
      '🔎&nbsp; Aparezca ante familias que buscan lugares de esparcimiento inclusivos.',
      '⭐&nbsp; Reciba <b>reseñas</b> de la comunidad.',
    ];
  } else {
    // especialistas y prestadores de servicio (service_provider, wellness, legal, caregiver, etc.)
    items = [
      '📅&nbsp; <b>Agenda y reservas en línea:</b> reciba citas directas, presenciales o en línea, integradas a su calendario.',
      '💬&nbsp; <b>Canal directo de contacto:</b> mensajería inmediata con las familias que requieren su especialización.',
      '📈&nbsp; <b>Métricas de impacto:</b> visualizaciones, clics y solicitudes de contacto de su perfil.',
    ];
  }
  const li = items.map((t) => `<li style="margin:6px 0">${t}</li>`).join('');
  const founderLi = fundador
    ? '<li style="margin:6px 0">🏆&nbsp; <b>Distintivo «Fundador Neuromundi»:</b> sello de prestigio para su perfil, su sitio web y sus redes sociales.</li>'
    : '';
  return `<ul style="margin:8px 0 0;padding:0;list-style:none;color:#334155;font-size:14px;line-height:1.5">${li}
    <li style="margin:6px 0">🧰&nbsp; <b>Sus contenidos en toda la plataforma:</b> publique sus productos en la <b>Tienda</b>, sus cursos y talleres en <b>Academy</b>, sus actividades en <b>Eventos</b> y sus artículos en el <b>Blog</b>.</li>
    <li style="margin:6px 0">⭐&nbsp; <b>Reseñas y distintivos:</b> acumule reseñas de la comunidad y obtenga los distintivos que acreditan su calidad y su compromiso.</li>
    <li style="margin:6px 0">🎓&nbsp; <b>Formación e instrumentos:</b> acceso gratuito al curso de bienvenida y al kit de herramientas clínicas y educativas.</li>
    ${founderLi}
    <li style="margin:6px 0">📋&nbsp; <b>Liderazgo en el sector:</b> participación prioritaria en la 1.ª Encuesta sobre la Situación Neurológica Mundial.</li>
  </ul>`;
}

// Tabla comparativa (versión CORREO, región México): HTML de tablas + estilos en
// línea + palomitas/taches de texto (Gmail/Outlook no soportan flex/grid ni SVG).
function tablaComparativa(r?: Row): string {
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
        <td align="center" style="padding:9px 4px;background:#e0f2fe;color:#0369a1;font-weight:800;border-top:2px solid #e2e8f0">${
          r?.precio_configurado && r?.precio_fundador
            ? `${MXN(Math.round(Number(r.precio_fundador) / 12))}<br><span style="font-weight:500;color:#64748b;font-size:10px">${r.moneda || 'MXN'}/mes equivalente · ${MXN(Number(r.precio_fundador))} al año</span>`
            : `≈ $250–$800<br><span style="font-weight:500;color:#64748b;font-size:10px">MXN/mes · fundadores</span>`
        }</td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">≈ $1,500–$4,000<br><span style="font-weight:500;color:#64748b;font-size:10px">MXN/mes</span></td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">Bajo invitación<br><span style="font-weight:500;color:#64748b;font-size:10px">no público</span></td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">No público</td>
      </tr>
    </table>
    <p style="color:#94a3b8;font-size:10px;margin:6px 2px 0;line-height:1.4">Comparativa con información pública de cada plataforma a septiembre de 2026. Las plataformas mencionadas son marcas de sus respectivos titulares; se citan solo con fines comparativos e informativos.</p>`;
}

function buildEmail(r: Row, fundador = true, promo: string | null = null): { subject: string; html: string } {
  const claim = `${SITE}/reclamar/${r.token}`;
  const rawNombre = r.nombre || 'su organización';
  const nombre = esc(rawNombre); // escapado para el HTML; el asunto usa rawNombre
  const seg = segmentOf(r);

  // Bloque de cortesía: si viene un código exento, se anuncia arriba del cuerpo.
  const promoBlock = promo
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px 14px">
        🎁 <b>Invitación de cortesía:</b> su membresía es <b>sin costo</b>. Al registrarse, ingrese este código en el paso de membresía:
        <br><span style="display:inline-block;margin-top:6px;font-size:18px;font-weight:800;letter-spacing:.04em;color:#047857">${esc(promo)}</span>
      </p>`
    : '';

  // Invitación estándar (SIN encuadre de Fundador): la usa el envío individual
  // cuando el admin desmarca "invitar como fundador". No cambia la elegibilidad
  // real de fundador (esa se gana automáticamente al cumplir requisitos).
  if (!fundador) {
    const intro = esFree(r)
      ? `<p>Hola, equipo de <b>${nombre}</b>:</p>
         <p>Le invitamos a <b>Neuromundi</b>, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Para su tipo de organización la membresía es <b>gratuita</b>. Al <b>completar su perfil</b> obtiene:</p>`
      : `<p>Hola, equipo de <b>${nombre}</b>:</p>
         <p>Le invitamos a <b>Neuromundi</b>, la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas. Al <b>completar su perfil</b> obtiene:</p>`;
    const cuerpo = `${intro}
      ${beneficios(r, false)}
      ${bloquePrecio(r)}
      ${tablaComparativa(r)}
    ${bloqueFechas(r)}`;
    return { subject: `${rawNombre}: le invitamos a Neuromundi`, html: shell('Únase a Neuromundi', promoBlock + cuerpo, 'Completar mi perfil', claim) };
  }

  if (seg === 'ya_publico_social') {
    const cuerpo = `<p>Hola, equipo de <b>${nombre}</b>:</p>
      <p>Hace unos días le escribimos sobre su perfil en el directorio de Neuromundi. Si aquel mensaje daba a entender que había una cuota, <b>una disculpa</b>: para una organización como la suya la membresía es <b>gratuita</b>.</p>
      <p>Al <b>completar su perfil</b> obtiene:</p>
      ${beneficios(r)}
      <p style="margin-top:12px">Y la <b>Insignia de Miembro Fundador</b>, con <u>beneficios preferentes de por vida</u>.</p>
      ${bloquePrecio(r)}
      ${tablaComparativa(r)}
    ${bloqueFechas(r)}`;
    return { subject: `${rawNombre}: su perfil en Neuromundi es gratuito — complételo`, html: shell('Conviértase en Fundador Neuromundi', promoBlock + cuerpo, 'Quiero ser fundador', claim) };
  }
  if (seg === 'ya_privado') {
    const cuerpo = `<p>Hola, equipo de <b>${nombre}</b>:</p>
      <p>Hace unos días le invitamos a completar su perfil en el directorio de Neuromundi. Por si se le pasó, aquí está de nuevo lo que obtiene al completarlo:</p>
      ${beneficios(r)}
      <p style="margin-top:12px">Además, al completarlo ahora entra como <b>Miembro Fundador</b>, con <u>beneficios preferentes de por vida</u>.</p>
      ${bloquePrecio(r)}
      ${tablaComparativa(r)}
    ${bloqueFechas(r)}`;
    return { subject: `${rawNombre}: le reservamos su perfil en Neuromundi`, html: shell('Conviértase en Fundador Neuromundi', promoBlock + cuerpo, 'Quiero ser fundador', claim) };
  }
  // --- Primer contacto. Redacción de Enyoria (13 oct 2026). -----------------
  // Las cifras y las fechas NO se escriben aquí: salen de registration_quote y
  // de campaign_config, para que el correo no pueda discrepar del cobro ni de
  // lo que aplica la plataforma.
  const fd = fundadorDe(r);
  const corte = RELOJES.verif;
  const hayTarifa = r.precio_configurado && r.precio_fundador && r.precio_ordinario && !esFree(r);
  const cur = r.moneda || 'MXN';

  const parrafoOferta = hayTarifa
    ? `<p>Y para motivarle aún más a formar parte de Neuromundi, le ofrecemos ingresar como
         <b>Miembro Fundador</b>. Queremos que forme parte de la base fundadora de la plataforma,
         con estas condiciones de por vida:</p>
       <p style="margin:12px 0;padding:14px 16px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;font-size:15px;line-height:1.6;color:#0c4a6e">
         Descuento del <b>50%</b>, por lo que su cuota anual vitalicia<sup>*</sup> como Miembro Fundador
         es de <b style="color:#0369a1">${MXN(Number(r.precio_fundador))} ${cur} al año</b>,
         en lugar de <b>${MXN(Number(r.precio_ordinario))} ${cur}</b>.
       </p>`
    : '';

  const parrafoPlazo = fd
    ? `<p>Para hacer efectivo este beneficio le agradeceremos ingresar mediante el siguiente enlace
         y completar su perfil <b>antes del ${fechaLarga(fd)}</b>.</p>`
    : `<p>Para hacer efectivo este beneficio le agradeceremos ingresar mediante el siguiente enlace
         y completar su perfil.</p>`;

  const parrafoCierre = `<p>Esperamos nos favorezca aceptando esta invitación y nos permita recibirle
       en la comunidad Neuromundi.</p>
     <p>Si por el contrario usted no desea aceptarla y prefiere retirar su ficha del directorio,
       puede hacerlo desde ese mismo enlace.</p>`
    + (corte
      ? `<p>En caso de no elegir ninguna de las dos opciones, su ficha se retirará del
           directorio el <b>${fechaLarga(corte)}</b>. No publicamos fichas de quien no nos ha
           confirmado que quiere estar.</p>`
      : '');

  const notaInflacion = hayTarifa
    ? `<p style="color:#64748b;font-size:12px;line-height:1.5;margin-top:16px">
         <sup>*</sup> La cuota anual sólo se actualizará en la misma proporción que el incremento
         anual inflacionario correspondiente a su país.
       </p>`
    : '';

  const cuerpo = `<p>Hola, <b>${nombre}</b>:</p>
    <p><b>Neuromundi</b> es más que un directorio: es la primera comunidad a nivel global que enlaza a
      pacientes, familias, especialistas, proveedores, prestadores de servicios, clínicas, escuelas,
      empresas y organizaciones de la sociedad civil en torno a <b>neurodesarrollo, neurodivergencias
      y afecciones neurológicas</b>.</p>
    <p>Hemos analizado su perfil y consideramos que sería un excelente miembro de Neuromundi, por lo
      que hemos agregado su ficha profesional a nuestro directorio público.</p>
    <p>Su información básica ya es visible para quien busque perfiles como el suyo en el directorio.</p>
    <p>Al reclamar y activar su perfil completo, usted podrá hacer uso de estas herramientas:</p>
    ${beneficios(r)}
    ${parrafoOferta}
    ${tablaComparativa(r)}
    ${parrafoPlazo}
    ${parrafoCierre}
    ${notaInflacion}`;

  return {
    subject: `${rawNombre}: active su perfil y asegure su cuota de Miembro Fundador`,
    html: shell('Bienvenido a Neuromundi', promoBlock + cuerpo, 'Activar o retirar mi ficha', claim),
  };
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json(401, { error: 'No autorizado' });
  }

  // Los plazos se leen de campaign_config en cada invocación, nunca se fijan aquí.
  await cargarRelojes();

  let body: { send?: boolean; limit?: number; segment?: string; tipo_correo?: string; token?: string; fundador?: boolean; promo?: string | null; tanda?: number } = {};
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
      .select('token, correo, cancelada_en, usada_en, baja_en, expira_en, directorio:directorio_id (nombre, provider_type, sector, estado, ciudad, pais)')
      .eq('token', body.token)
      .maybeSingle();
    if (e1) return json(500, { error: e1.message });
    if (!inv || inv.cancelada_en || inv.usada_en || inv.baja_en || (inv.expira_en && new Date(inv.expira_en) <= new Date())) {
      return json(404, { error: 'invitación no disponible' });
    }
    const d = (inv as { directorio?: { nombre?: string; provider_type?: string; sector?: string; estado?: string; ciudad?: string; pais?: string } }).directorio ?? {};
    rows = [{
      token: inv.token, correo: inv.correo, nombre: d.nombre ?? '',
      provider_type: d.provider_type ?? null, sector: d.sector ?? null,
      estado: d.estado ?? null, ciudad: d.ciudad ?? null, pais: d.pais ?? null,
      ya_contactado_8sep: false,
      correo_personal: /@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\./i.test(inv.correo),
    }];
  } else {
    // Si viene `tanda`, la cola respeta el plan (directorio_plan_invitacion) y
    // trae la tarifa exacta de cada ficha. Sin `tanda`, comportamiento anterior.
    const { data, error } = body.tanda
      ? await admin.rpc('directorio_invitaciones_cola_tanda_v2', { p_tanda: body.tanda, p_limit: 200 })
      : await admin.rpc('directorio_invitaciones_cola_v2', { p_limit: 1000 });
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
      relojes: {
        retiro_de_fichas: RELOJES.verif ? RELOJES.verif.toISOString() : null,
        ultimo_dia_confirmar: ultimoDiaConfirmar()?.toISOString() ?? null,
        fundador_por_pais_en_este_lote: Object.fromEntries(
          [...new Set(rows.map((r) => r.pais || 'México'))]
            .map((pz) => [pz, RELOJES.fundadorPorPais[pz] ?? RELOJES.fundadorPorPais['México'] ?? null]),
        ),
      },
      nota: 'DRY-RUN: no se envió ni se marcó nada. Para enviar: {"send": true, "segment": "...", "tipo_correo": "...", "limit": N}.',
    });
  }

  if (!RESEND_API_KEY) return json(500, { error: 'Falta RESEND_API_KEY' });
  const lote = rows.slice(0, limit);
  let enviados = 0, fallidos = 0;
  for (const r of lote) {
    try {
      const { subject, html } = buildEmail(r, fundador, body.promo ?? null);
      if (await sendEmail(r.correo, subject, html, `inv-${r.token}`, `${SITE}/reclamar/${r.token}`)) {
        await admin.rpc('directorio_invitacion_enviada', { p_token: r.token });
        enviados++;
      } else { fallidos++; }
    } catch { fallidos++; }
    await sleep(700);
  }
  return json(200, { ok: true, segment, tipo_correo: tipoCorreo, enviados, fallidos, procesados: lote.length });
});
