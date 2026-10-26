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
// A donde van las RESPUESTAS. Medido el 20 de octubre de 2026: el remitente
// configurado es info@admin.neuromundi.com, y el MX de ese subdominio apunta a
// la entrada de Amazon SES, no al buzon de Hostinger que se lee todos los dias.
// El pie del correo promete al destinatario que puede ejercer sus derechos de
// datos "respondiendo a este correo", y la firma da admin@neuromundi.com: las
// respuestas tienen que llegar ahi, no a un buzon que nadie abre.
const REPLY_TO = Deno.env.get('CAMPAIGN_REPLY_TO') ?? 'admin@neuromundi.com';
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
      reply_to: REPLY_TO,
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
  /** Cierto cuando NO sabemos si es especialista medico o no: el correo habla
   *  de un precio "desde" y la persona fija su cuota al declarar su profesion
   *  al completar el perfil. (Decision de Enyoria, 20 oct 2026.) */
  precio_desde?: boolean | null;
  // 0261: plazo de fundador sellado para ESTA invitacion al momento del envio.
  // Lo llena el bucle de envio con sellar_plazo_invitacion(); en la simulacion
  // viene vacio y el correo cae a la fecha del pais.
  fundador_hasta?: string | null;
}

// Precio exacto del destinatario, no un rango. Sale de registration_quote, la
// misma función que usa el checkout, así que el correo y el cobro no pueden
// discrepar. Si la ficha no tiene tarifa configurada se devuelve null y el
// correo cae al texto genérico en vez de inventar una cifra.
// FORMATO DE DINERO POR MONEDA (22 oct 2026). Antes se formateaba todo con
// es-MX y un '$' fijo, heredado de cuando solo habia fichas mexicanas: Portugal
// veia "$225 EUR" —el euro no lleva signo de peso— y Brasil "$1,500 BRL", que
// un brasileno lee como uno y medio, porque alli la coma es el separador
// decimal. El codigo ISO de la moneda lo pone la plantilla, asi que aqui solo
// va el signo cuando la moneda de verdad usa el signo de peso.
const MILES_CON_PUNTO = new Set(['ARS', 'BOB', 'BRL', 'CLP', 'COP', 'CRC', 'EUR', 'PYG', 'UYU']);
const SIGNO_DE_PESO = new Set(['MXN', 'USD', 'CAD', 'ARS', 'CLP', 'COP', 'UYU', 'DOP']);
const MXN = (n: number, cur = 'MXN') =>
  (SIGNO_DE_PESO.has(cur) ? '$' : '') +
  n.toLocaleString(MILES_CON_PUNTO.has(cur) ? 'de-DE' : 'en-US', { maximumFractionDigits: 0 });

// ---------------------------------------------------------------------------
// LOS RELOJES DE LA CAMPANA VIVEN EN UN SOLO LUGAR: campaign_config.
//
// Antes estaban escritos a mano en cinco puntos de este archivo, con un
// comentario que pedia acordarse de cambiarlos a mano si cambiaban en la base.
// Eso garantizaba que algun dia el correo prometiera una fecha y la plataforma
// aplicara otra. Ahora se leen de la base en cada invocacion:
//
//   · founder_deadline_by_country[pais]  -> ultimo dia de precio de fundador
//   · verificacion_deadline              -> desde ese dia se retiran las fichas
//
// El plazo de fundador es POR PAIS. Si la ficha no trae pais se usa el de
// Mexico. Si la base no tiene fecha, la frase correspondiente NO se escribe:
// el correo prefiere callar antes que inventar una fecha.
// ---------------------------------------------------------------------------
const TZ = 'America/Mexico_City';
const fechaLarga = (d: Date, pt = false) =>
  new Intl.DateTimeFormat(pt ? 'pt-PT' : 'es-MX', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const diaYMes = (d: Date, pt = false) =>
  new Intl.DateTimeFormat(pt ? 'pt-PT' : 'es-MX', { timeZone: TZ, day: 'numeric', month: 'long' }).format(d);

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

// Fecha de fundador que le toca a ESTE destinatario.
// 0261: manda el plazo sellado en su propia invitacion, que se cuenta desde el
// dia del envio. Solo cuando no hay invitacion sellada (simulacion, o un alta
// que no vino del directorio) se cae a la fecha fija del pais, que ademas es el
// tope duro que sellar_plazo_invitacion() nunca rebasa.
function fundadorDe(r: Row): Date | null {
  if (r.fundador_hasta) return new Date(r.fundador_hasta);
  const m = RELOJES.fundadorPorPais;
  const iso = m[r.pais || 'México'] ?? m['México'] ?? null;
  return iso ? new Date(iso) : null;
}
// Ultimo dia para confirmar = el dia anterior al corte; en el corte se retiran.
const ultimoDiaConfirmar = (): Date | null =>
  RELOJES.verif ? new Date(RELOJES.verif.getTime() - 86400000) : null;
function bloquePrecio(r: Row): string {
  if (!r.precio_configurado || !r.precio_fundador || !r.precio_ordinario) return '';
  const cur = r.moneda || 'MXN';
  const pt = esPT(r);
  const fd = fundadorDe(r);
  const titulo = pt ? 'A sua quota, sem rodeios' : 'Su cuota, sin rodeos';
  // Cuando no sabemos si es especialista medico, la cifra es un "desde": la
  // cuota exacta queda fijada cuando la persona declara su profesion al
  // completar su perfil. Decir una cifra cerrada y cobrar otra es lo que se
  // siente como engano.
  const desde = !!r.precio_desde;
  const notaDesde = desde
    ? (pt
        ? ' A quota exacta fica definida quando indicar a sua profissão ao completar o perfil.'
        : ' La cuota exacta queda definida cuando indique su profesión al completar su perfil.')
    : '';
  const cuerpo = pt
    ? `A adesão anual para o seu tipo de perfil é de <b>${desde ? 'a partir de ' : ''}${MXN(Number(r.precio_ordinario), cur)} ${cur}</b>.
      Se a activar <b>${fd ? `antes de ${fechaLarga(fd, true)}` : 'durante a campanha de fundadores'}</b> fica como Membro Fundador e paga
      <b style="color:#0369a1">${desde ? 'a partir de ' : ''}${MXN(Number(r.precio_fundador), cur)} ${cur} por ano</b>, metade, e esse preço é respeitado nas renovações.${notaDesde}
      <br><br>A tarifa de fundador é <b>anual</b>; o pagamento mensal existe, mas com a quota normal.<br><br>Reclamar a ficha não cobra nada e o pagamento é um passo posterior: a decisão é sua.`
    : `La membresía anual para su tipo de perfil es de <b>${desde ? 'desde ' : ''}${MXN(Number(r.precio_ordinario), cur)} ${cur}</b>.
      Si la activa <b>${fd ? `antes del ${fechaLarga(fd)}` : 'durante la campaña de fundadores'}</b> queda como Miembro Fundador y paga
      <b style="color:#0369a1">${desde ? 'desde ' : ''}${MXN(Number(r.precio_fundador), cur)} ${cur} al año</b>, la mitad, y ese precio se le respeta en las renovaciones.${notaDesde}
      <br><br>La tarifa de fundador es <b>anual</b>; el pago mensual existe, pero a cuota ordinaria.<br><br>Reclamar la ficha no cobra nada y el pago es un paso posterior: usted decide si lo da.`;
  return `<div style="margin:18px 0;padding:14px 16px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px">
    <p style="margin:0 0 6px;font-weight:800;font-size:15px;color:#0c4a6e">${titulo}</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">${cuerpo}</p>
  </div>`;
}

// IDIOMA DEL CORREO (17 oct 2026). Portugal y Brasil reciben portugués; el
// resto, español. No hay un tercer idioma porque no hay mas paises invitados:
// el dia que los haya, esto crece aqui y en ningun otro sitio.
//
// Se eligio por PAIS y no por el idioma del navegador porque el destinatario
// todavia no es usuario: no hay sesion ni preferencia que consultar, solo la
// ficha del directorio.
const esPT = (r: Row) => r.pais === 'Portugal' || r.pais === 'Brasil';

// Quién no paga cuota. Se define arriba porque bloqueFechas la usa.
const esFree = (r: Row) =>
  r.sector === 'publico' || r.sector === 'social' || r.provider_type === 'ngo' || r.provider_type === 'company';

// Las DOS fechas de la campaña, deliberadamente separadas.
//
// En prosa seguida el lector las fusiona y entiende "si no pago me borran del
// directorio", que es falso: la ficha sigue apareciendo siempre con su nombre,
// tipo, ciudad, estado y especialización.
//
// POLITICA VIGENTE (13 oct 2026, decision de Enyoria): la ficha no confirmada
// NO se degrada, se RETIRA del directorio en verificacion_deadline. Migracion
// 0203 (funcion ficha_visible + predicado en directorio_publico).
//
// CORREGIDO (14 oct 2026): los dos ultimos parrafos de la rama no exenta decian
// la politica ANTERIOR (ficha visible sin datos de contacto). Ahora dicen lo
// mismo que el cierre del correo de primer contacto, aprobado por Enyoria.
//
// OJO con la palabra "vitalicia" del parrafo de exentos: cuota_cubierta()
// respeta exencion_vigente_hasta, asi que una exencion con fecha de caducidad
// retiraria esa ficha del directorio y el correo ya habra prometido lo
// contrario. Las exenciones se otorgan SIN fecha de vencimiento.
//
// Las dos fechas se leen de `campaign_config` en cada invocación
// (founder_deadline_by_country, por país, y verificacion_deadline). Ya NO se
// escriben a mano aquí: cambiarlas en la base cambia el correo. Se eligen en
// día hábil y en hora de Ciudad de México.
function bloqueFechas(r: Row): string {
  const cur = r.moneda || 'MXN';
  const pt = esPT(r);
  const hayPrecio = r.precio_configurado && r.precio_fundador && r.precio_ordinario;
  const exento = esFree(r);
  const fd = fundadorDe(r);
  const confirmar = ultimoDiaConfirmar();
  const corte = RELOJES.verif;

  // Si falta cualquiera de las dos fechas en la base, esta frase no se escribe:
  // mas vale un correo sin plazo que un correo con un plazo inventado.
  const lineaPlazo = (confirmar && corte)
    ? (pt
        ? `<b>${fechaLarga(confirmar, true)}</b> — último dia para confirmar a sua ficha. A partir de
       ${diaYMes(corte, true)}, as fichas que não tiverem sido confirmadas são retiradas do directório.`
        : `<b>${fechaLarga(confirmar)}</b> — último día para confirmar su ficha. A partir del
       ${diaYMes(corte)}, las fichas que no se hayan confirmado se retiran del directorio.`)
    : '';

  const lineaPago = (hayPrecio && !exento && fd)
    ? (pt
        ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         <b>${fechaLarga(fd, true)}</b> — último dia para ficar como Membro Fundador e pagar
         <b style="color:#0369a1">${MXN(Number(r.precio_fundador), cur)} ${cur}</b> por ano em vez de
         <b>${MXN(Number(r.precio_ordinario), cur)} ${cur}</b>. Depois dessa data aplica-se a quota normal.
       </p>`
        : `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         <b>${fechaLarga(fd)}</b> — último día para quedar como Miembro Fundador y pagar
         <b style="color:#0369a1">${MXN(Number(r.precio_fundador), cur)} ${cur}</b> al año en lugar de
         <b>${MXN(Number(r.precio_ordinario), cur)} ${cur}</b>. Después de esa fecha aplica la cuota ordinaria.
       </p>`)
    : '';

  const cuerpo = exento
    ? (pt
      ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         ${lineaPlazo}
         <b>A sua organização está isenta de quota</b>: mantém o telefone, o email, o site
         e a localização sem pagar nada.
       </p>
       <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
         Só precisamos que confirme a ficha. É gratuito, demora um minuto e dá-lhe o
         controlo dos seus dados. Se não a confirmar, retiramo-la do directório nessa data.
       </p>`
      : `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         ${lineaPlazo}
         <b>Su organización está exenta de cuota</b>: conserva su teléfono, su correo, su sitio
         web y su ubicación sin pagar nada.
       </p>
       <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
         Lo único que necesitamos es que confirme la ficha. Es gratuito, toma un minuto y le da el
         control de sus datos. Si no la confirma, la retiramos del directorio en esa fecha.
       </p>`)
    : (pt
      ? `${lineaPago}<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         ${lineaPlazo}
       </p>
       <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         <b>Confirmar a sua ficha é gratuito</b> e não o obriga a nada nesse momento: serve para tomar
         posse do seu perfil, corrigir os seus dados e decidir o que é publicado. As fichas confirmadas
         aparecem acima das que não o estão nos resultados de pesquisa.
       </p>
       <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
         Para que a sua ficha continue publicada depois de <b>${corte ? fechaLarga(corte, true) : ''}</b> basta
         que complete o seu perfil e cubra a quota correspondente. Se algum dos requisitos não for
         cumprido, retiramos a sua ficha do directório. Respeitamos sempre a sua decisão
         se não desejar fazer parte da Neuromundi.
       </p>`
      : `${lineaPago}<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         ${lineaPlazo}
       </p>
       <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#334155">
         <b>Confirmar su ficha es gratuito</b> y no lo obliga a nada en ese momento: sirve para tomar
         posesión de su perfil, corregir sus datos y decidir qué se publica. Las fichas confirmadas
         aparecen por encima de las que no lo están en los resultados de búsqueda.
       </p>
       <p style="margin:0;font-size:14px;line-height:1.6;color:#334155">
         Para que su ficha siga publicada después del <b>${corte ? fechaLarga(corte) : ''}</b> sólo se
         requiere que complete su perfil y cubra la cuota correspondiente. Si no se cumple con alguno
         de los requisitos retiramos su ficha del directorio. En todo momento respetamos su decisión
         si no desea formar parte de Neuromundi.
       </p>`);

  if (!lineaPlazo && !lineaPago) return '';

  const titulo = pt
    ? (exento || !(lineaPago && lineaPlazo) ? 'Uma data a ter presente' : 'Duas datas, e são independentes')
    : (exento || !(lineaPago && lineaPlazo) ? 'Una fecha que conviene tener presente' : 'Dos fechas, y son independientes');

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
function footerLegal(pt = false): string {
  const texto = pt
    ? `Recebe este email porque foram consultadas fontes abertas na internet e a sua organização consta do directório público da Neuromundi.
    Tratamos os seus dados de acordo com a nossa <a href="${SITE}/privacy" style="color:#0369a1">Política de Privacidade</a>. Pode exercer os seus direitos de acesso, rectificação, apagamento, limitação ou oposição, ou pedir que retiremos a sua ficha através da ligação acima, ou respondendo a este email.
    <br><br>Neuromundi · comunidade global de neurodesenvolvimento, neurodivergência e doenças neurológicas.`
    : `Recibe este correo porque se consultaron fuentes abiertas en internet y su organización figura en el directorio público de Neuromundi.
    Tratamos sus datos conforme a nuestro <a href="${SITE}/privacy" style="color:#0369a1">Aviso de Privacidad</a>. Puede ejercer sus derechos de acceso, rectificación, cancelación, supresión u oposición, o pedir que retiremos su ficha usando el enlace de arriba, o respondiendo a este correo.
    <br><br>Neuromundi · comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas.`;
  return `<p style="color:#64748b;font-size:12px;margin-top:18px;line-height:1.5">${texto}</p>`;
}

// Firma institucional. Va en TEXTO a proposito: Outlook bloquea imagenes por
// defecto y una firma hecha de imagen deja al destinatario sin nombre ni
// telefono. El logo es pequeno y lleva alt, asi que si no carga no estorba.
function firmaOficial(pt = false): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0">
    <tr>
      <td style="padding-right:14px;vertical-align:middle">
        <img src="${SITE}/icon-192.png" width="64" height="64" alt="Neuromundi"
             style="display:block;border:0;width:64px;height:64px">
      </td>
      <td style="vertical-align:middle;border-left:2px solid #e2e8f0;padding-left:14px;font-size:13px;line-height:1.5;color:#334155">
        <b style="font-size:15px;color:#0f172a">Mtra. Nelly Montoya</b><br>
        ${pt ? 'CEO &amp; Fundadora &middot; Neuromundi' : 'CEO &amp; Fundadora &middot; Neuromundi'}<br>
        <a href="mailto:admin@neuromundi.com" style="color:#0369a1;text-decoration:none">admin@neuromundi.com</a>
        &middot; (442) 271 4419<br>
        <a href="${SITE}" style="color:#0369a1;text-decoration:none"><b>www.neuromundi.com</b></a>
      </td>
    </tr>
  </table>`;
}

function shell(title: string, bodyHtml: string, ctaText: string, ctaUrl: string, pt = false): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(90deg,#0ea5e9,#0369a1);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-weight:800;letter-spacing:.04em">NEUROMUNDI</div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:22px 20px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
      <p style="margin:22px 0 8px"><a href="${ctaUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${ctaText}</a></p>
      ${firmaOficial(pt)}
      ${footerLegal(pt)}
    </div>
  </div>`;
}

// Beneficios CURADOS por tipo de destinatario (2-3 puntos, NO feature-dump).
// Mejor práctica: relevancia por rol > lista exhaustiva; el detalle completo vive
// en la landing. Todos cierran con curso+kit gratis. Devuelve un <ul> con estilo.
function beneficios(r: Row, fundador = true): string {
  if (esPT(r)) return beneficiosPT(r, fundador);
  const pt = r.provider_type ?? '';
  // Cada viñeta lleva UN emoji relevante (calidez + escaneabilidad sin exceso;
  // glifos muy soportados para minimizar problemas de render en Outlook).
  let items: string[];
  if (pt === 'company') {
    items = [
      '🏷️&nbsp; Publicar <b>vacantes y oportunidades inclusivas</b> y llegar a talento neurodivergente.',
      '🏅&nbsp; Obtener el <b>distintivo de Empresa Inclusiva</b> descargable para su web y sus redes.',
      '🆓&nbsp; Membresía <b>gratuita</b> mientras mantenga publicada al menos una oferta.',
    ];
  } else if (pt === 'ngo') {
    // Lista ampliada el 17 oct 2026: la version anterior nombraba tres cosas de
    // las muchas que una organizacion de la sociedad civil puede hacer ya en la
    // plataforma. Cada vinieta de abajo esta comprobada contra las pestanas que
    // recibe de verdad un perfil 'ngo' en ProviderDashboard.
    items = [
      '🆓&nbsp; Membresía <b>gratuita, siempre</b>, para organizaciones de la sociedad civil.',
      '👪&nbsp; Aparecer ante las <b>familias</b> que buscan apoyo en su región, con su ficha completa: teléfono, sitio, dirección y servicios.',
      '💬&nbsp; Recibir <b>solicitudes de contacto</b> de familias y pacientes, y decidir usted cuáles acepta.',
      '📅&nbsp; <b>Agenda y reservas en línea</b> para sus consultas, terapias o asesorías, presenciales o en video, con un formulario que puede poner en su propio sitio.',
      '🤝&nbsp; Publicar <b>oportunidades</b>: voluntariado, servicio social y empleo inclusivo.',
      '📣&nbsp; Anunciar sus <b>jornadas, talleres y campañas</b> en la sección de Eventos.',
    ];
  } else if (pt === 'school') {
    // Las escuelas llevaban las vinetas de clinica ("recibir citas"), que no
    // describen nada de lo que hace una escuela: inscribe alumnos, no agenda
    // consultas. Y son las de la cuota mas alta del directorio (20 oct 2026).
    items = [
      '👪&nbsp; <b>Aparecer ante las familias</b> que buscan escuela o apoyo educativo inclusivo en su zona, con su ficha completa: teléfono, sitio, dirección y servicios.',
      '💬&nbsp; <b>Solicitudes de informes e inscripción:</b> las familias le escriben desde su perfil y usted decide a cuáles responde.',
      '🏅&nbsp; Obtener el <b>distintivo de Escuela Inclusiva</b> para su perfil, su sitio web y sus redes sociales.',
      '📣&nbsp; Anunciar sus <b>jornadas de puertas abiertas, talleres para familias y actividades</b> en la sección de Eventos.',
    ];
  } else if (pt === 'clinic') {
    items = [
      '📅&nbsp; <b>Agenda y reservas en línea:</b> recibir citas directas, presenciales o en línea, desde su perfil.',
      '💬&nbsp; <b>Canal directo de contacto:</b> mensajería inmediata con pacientes, familias, clientes potenciales y otros miembros de la plataforma que buscan crear contactos y redes de colaboración.',
    ];
  } else if (pt === 'merchant') {
    items = [
      '🛍️&nbsp; Vender sus productos en la <b>Tienda</b> y cobrar directo — Neuromundi <b>no retiene comisión</b>.',
      '🔎&nbsp; Aparecer ante familias que buscan productos neuroafirmativos.',
      '⭐&nbsp; Recibir <b>reseñas</b> que dan confianza a nuevos clientes.',
    ];
  } else if (pt === 'tourism') {
    items = [
      '🌿&nbsp; Presentarse como <b>espacio de bajo impacto sensorial</b> con sus horarios amigables.',
      '🔎&nbsp; Aparecer ante familias que buscan lugares de esparcimiento inclusivos.',
      '⭐&nbsp; Recibir <b>reseñas</b> de la comunidad.',
    ];
  } else {
    // especialistas y prestadores de servicio (service_provider, wellness, legal, caregiver, etc.)
    items = [
      '📅&nbsp; <b>Agenda y reservas en línea:</b> recibir citas directas, presenciales o en línea, integradas a su calendario.',
      '💬&nbsp; <b>Canal directo de contacto:</b> mensajería inmediata con pacientes, familias, clientes potenciales y otros miembros de la plataforma que buscan crear contactos y redes de colaboración.',
      '📈&nbsp; <b>Métricas de impacto:</b> visualizaciones, clics y solicitudes de contacto de su perfil.',
    ];
  }
  const li = items.map((t) => `<li style="margin:6px 0">${t}</li>`).join('');
  const founderLi = fundador
    ? '<li style="margin:6px 0">🏆&nbsp; <b>Distintivo «Fundador Neuromundi»:</b> sello de prestigio para su perfil, su sitio web y sus redes sociales.</li>'
    : '';
  return `<ul style="margin:8px 0 0;padding:0;list-style:none;color:#334155;font-size:14px;line-height:1.5">${li}
    <li style="margin:6px 0">🧰&nbsp; <b>Incrementar su visibilidad, sus contactos y sus ingresos:</b> ofrecer todos sus servicios y productos en la plataforma, publicar sus productos en la <b>Tienda</b> con enlaces a su tienda oficial, sus cursos y talleres en <b>Academy</b>, sus actividades en <b>Eventos</b> y sus artículos en el <b>Blog</b>.</li>
    <li style="margin:6px 0">⭐&nbsp; <b>Reseñas y distintivos:</b> acumular reseñas de la comunidad y obtener los distintivos que acreditan su calidad y su compromiso.</li>
    <li style="margin:6px 0">🤝&nbsp; <b>Muro de Aliados:</b> proponer a su organización, con su logotipo, para la sección de Aliados de Neuromundi. Revisamos cada propuesta antes de publicarla.</li>
    <li style="margin:6px 0">🎓&nbsp; <b>Formación e instrumentos:</b> acceso gratuito a cursos, talleres y eventos exclusivos para miembros Neuromundi.</li>
    ${founderLi}
    <li style="margin:6px 0">📋&nbsp; <b>Liderazgo en el sector:</b> participación prioritaria en la 1.ª Encuesta sobre la Situación Neurológica Mundial.</li>
  </ul>
  <p style="margin:12px 0 0;color:#334155;font-size:14px;line-height:1.5">📄&nbsp; Si anuncia un evento, puede enviarnos su cartel a <a href="mailto:admin@neuromundi.com" style="color:#0369a1">admin@neuromundi.com</a> o cargarlo al publicarlo: lo mostramos en la tarjeta del evento, con su crédito. Si no nos lo envía, ponemos una portada de Neuromundi.</p>`;
}

// Version portuguesa de la lista de beneficios. Se mantiene aparte y no
// mezclada con condicionales dentro de cada vinieta: asi se lee de corrido y se
// corrige sin riesgo de romper la version española.
function beneficiosPT(r: Row, fundador = true): string {
  const tp = r.provider_type ?? '';
  let items: string[];
  if (tp === 'company') {
    items = [
      '🏷️&nbsp; Publicar <b>vagas e oportunidades inclusivas</b> e chegar a talento neurodivergente.',
      '🏅&nbsp; Obter o <b>distintivo de Empresa Inclusiva</b>, descarregável para o seu site e as suas redes.',
      '🆓&nbsp; Adesão <b>gratuita</b> enquanto mantiver publicada pelo menos uma oferta.',
    ];
  } else if (tp === 'ngo') {
    items = [
      '🆓&nbsp; Adesão <b>gratuita, sempre</b>, para organizações da sociedade civil.',
      '👪&nbsp; Aparecer perante as <b>famílias</b> que procuram apoio na sua região, com a ficha completa: telefone, site, morada e serviços.',
      '💬&nbsp; Receber <b>pedidos de contacto</b> de famílias e utentes, e decidir quais aceita.',
      '📅&nbsp; <b>Agenda e marcações online</b> para as suas consultas, terapias ou apoios, presenciais ou por vídeo, com um formulário que pode colocar no seu próprio site.',
      '🤝&nbsp; Publicar <b>oportunidades</b>: voluntariado, estágios e emprego inclusivo.',
      '📣&nbsp; Anunciar as suas <b>jornadas, oficinas e campanhas</b> na secção de Eventos.',
    ];
  } else if (tp === 'school') {
    items = [
      '👪&nbsp; <b>Aparecer perante as famílias</b> que procuram escola ou apoio educativo inclusivo na sua zona, com a ficha completa: telefone, site, morada e serviços.',
      '💬&nbsp; <b>Pedidos de informação e inscrição:</b> as famílias escrevem-lhe a partir do seu perfil e é o senhor quem decide a quais responde.',
      '🏅&nbsp; Obter o <b>distintivo de Escola Inclusiva</b> para o seu perfil, o seu site e as suas redes sociais.',
      '📣&nbsp; Anunciar as suas <b>jornadas de portas abertas, oficinas para famílias e actividades</b> na secção de Eventos.',
    ];
  } else if (tp === 'clinic') {
    items = [
      '📅&nbsp; <b>Agenda e marcações online:</b> receber marcações directas, presenciais ou por vídeo, a partir do seu perfil.',
      '💬&nbsp; <b>Canal directo de contacto:</b> mensagens imediatas com utentes, famílias, potenciais clientes e outros membros da plataforma que procuram criar contactos e redes de colaboração.',
    ];
  } else if (tp === 'merchant') {
    items = [
      '🛍️&nbsp; Vender os seus produtos na <b>Loja</b> e receber directamente — a Neuromundi <b>não retém comissão</b>.',
      '🔎&nbsp; Aparecer perante famílias que procuram produtos neuroafirmativos.',
      '⭐&nbsp; Receber <b>avaliações</b> que dão confiança a novos clientes.',
    ];
  } else if (tp === 'tourism') {
    items = [
      '🌿&nbsp; Apresentar-se como <b>espaço de baixo impacto sensorial</b>, com os seus horários amigáveis.',
      '🔎&nbsp; Aparecer perante famílias que procuram lugares de lazer inclusivos.',
      '⭐&nbsp; Receber <b>avaliações</b> da comunidade.',
    ];
  } else {
    items = [
      '📅&nbsp; <b>Agenda e marcações online:</b> receber marcações directas, presenciais ou por vídeo, integradas no seu calendário.',
      '💬&nbsp; <b>Canal directo de contacto:</b> mensagens imediatas com utentes, famílias, potenciais clientes e outros membros da plataforma.',
      '📈&nbsp; <b>Métricas de impacto:</b> visualizações, cliques e pedidos de contacto do seu perfil.',
    ];
  }
  const li = items.map((t) => `<li style="margin:6px 0">${t}</li>`).join('');
  const founderLi = fundador
    ? '<li style="margin:6px 0">🏆&nbsp; <b>Distintivo «Fundador Neuromundi»:</b> selo de prestígio para o seu perfil, o seu site e as suas redes sociais.</li>'
    : '';
  return `<ul style="margin:8px 0 0;padding:0;list-style:none;color:#334155;font-size:14px;line-height:1.5">${li}
    <li style="margin:6px 0">🧰&nbsp; <b>Aumentar a sua visibilidade, os seus contactos e as suas receitas:</b> oferecer todos os seus serviços e produtos na plataforma, publicar os seus produtos na <b>Loja</b> com ligação à sua loja oficial, os seus cursos e oficinas na <b>Academy</b>, as suas actividades em <b>Eventos</b> e os seus artigos no <b>Blog</b>.</li>
    <li style="margin:6px 0">⭐&nbsp; <b>Avaliações e distintivos:</b> acumular avaliações da comunidade e obter os distintivos que atestam a sua qualidade e o seu compromisso.</li>
    <li style="margin:6px 0">🤝&nbsp; <b>Mural de Aliados:</b> propor a sua organização, com o seu logótipo, para a secção de Aliados da Neuromundi. Revemos cada proposta antes de a publicar.</li>
    <li style="margin:6px 0">🎓&nbsp; <b>Formação e instrumentos:</b> acesso gratuito a cursos, oficinas e eventos exclusivos para membros Neuromundi.</li>
    ${founderLi}
    <li style="margin:6px 0">📋&nbsp; <b>Liderança no sector:</b> participação prioritária no 1.º Inquérito sobre a Situação Neurológica Mundial.</li>
  </ul>
  <p style="margin:12px 0 0;color:#334155;font-size:14px;line-height:1.5">📄&nbsp; Se anunciar um evento, pode enviar-nos o seu cartaz para <a href="mailto:admin@neuromundi.com" style="color:#0369a1">admin@neuromundi.com</a> ou carregá-lo ao publicá-lo: mostramo-lo no cartão do evento, com o devido crédito. Se não o enviar, colocamos uma capa da Neuromundi.</p>`;
}

// PRECIO REAL DE DOCTORALIA POR PAIS (26 oct 2026). Medido en los tarifarios
// publicos de la propia Doctoralia, uno por pais. Antes esta columna mostraba
// SIEMPRE el precio mexicano —"≈ $1,500–$4,000 MXN/mes"— a todos los paises: a
// una clinica de Lisboa se le ensenaba su cuota en euros y, debajo, una
// comparacion en una moneda ajena contra una empresa que si opera en su pais
// con otro precio. Eso resta credibilidad justo donde se pide confianza.
//
// DOS REGLAS AL TOCAR ESTA TABLA:
//  1. Un pais que no este aqui muestra "No publico". NUNCA se convierte el
//     precio de otro pais ni se estima: una cifra inventada es peor que
//     ninguna, porque no se ve que es falsa.
//  2. BRASIL NO ESTA, a proposito. Doctoralia Brasil publica R$ 429 bajo la
//     etiqueta "Plano anual 12x" SIN escribir "por mes". Puede ser doce cuotas
//     (R$ 5.148 al ano) o el ano completo. Dos analisis brasilenos
//     independientes de octubre de 2026 llegan a la misma duda y recomiendan
//     confirmarlo con Doctoralia. Si la lectura fuera la equivocada estariamos
//     diciendo que la competencia cuesta DOCE VECES lo que cuesta, en un correo
//     a 67 clinicas. Hasta confirmarlo, Brasil va sin cifra.
const PRECIO_DOCTORALIA: Record<string, { monto: string; nota: string }> = {
  'España':    { monto: '89 €',          nota: 'al mes + IVA' },
  'Portugal':  { monto: '32 €',          nota: 'por mês' },
  // Mexico va con RANGO, no con el plan de entrada (26 oct 2026, correccion de
  // Enyoria): los $1,740 son el Starter, pero las cuentas premium y los
  // complementos suben la factura real hasta el entorno de los $4,000. El
  // rango es el mismo que muestra el cuadro de la portada, para que las dos
  // superficies no se contradigan.
  'México':    { monto: '≈ $1,500–$4,000', nota: 'MXN/mes' },
  'Argentina': { monto: '25.000 ARS',    nota: 'al mes' },
  'Chile':     { monto: '59.000 CLP',    nota: 'al mes' },
};

// Tabla comparativa (versión CORREO, región México): HTML de tablas + estilos en
// línea + palomitas/taches de texto (Gmail/Outlook no soportan flex/grid ni SVG).
function tablaComparativa(r?: Row): string {
  const pt = r ? esPT(r) : false;
  // Doctores.lat es un directorio latinoamericano: nombrarlo ante una clinica
  // de Madrid o de Lisboa no compara nada, solo ocupa una columna.
  const conDoctoresLat = !(r?.pais === 'España' || r?.pais === 'Portugal');
  const yes = '<td align="center" style="padding:9px 4px;color:#16a34a;font-weight:bold;border-bottom:1px solid #f1f5f9">✓</td>';
  const yesNm = '<td align="center" style="padding:9px 4px;background:#eff9ff;color:#16a34a;font-weight:bold;border-bottom:1px solid #f1f5f9">✓</td>';
  const no = '<td align="center" style="padding:9px 4px;color:#cbd5e1;font-weight:bold;border-bottom:1px solid #f1f5f9">✗</td>';
  const feat = (t: string) => `<td style="padding:9px 6px;border-bottom:1px solid #f1f5f9">${t}</td>`;
  // filas: [label, nm, doctoralia, topdoctors, doctoreslat]
  const etiquetas = pt
    ? ['Especializada em neurodivergência, neurodesenvolvimento e doenças neurológicas',
       'Gratuita para famílias e utentes',
       'Agenda de marcações online (presencial ou vídeo)',
       'Avaliações de prestadores',
       'Selo e avaliações neuroafirmativas',
       'Comunidade de apoio entre pares',
       'Kit de ferramentas e curso gratuitos',
       'Inclusão laboral e escolar',
       'Loja especializada']
    : ['Especializada en neurodivergencia, neurodesarrollo y afecciones neurológicas',
       'Gratis para familias y pacientes',
       'Agenda de citas en línea (presencial o video)',
       'Reseñas de prestadores',
       'Sello y reseñas neuroafirmativas',
       'Comunidad de apoyo entre pares',
       'Kit de herramientas y curso gratuitos',
       'Inclusión laboral y escolar',
       'Tienda especializada'];
  const rows: [string, boolean, boolean, boolean, boolean][] = [
    [etiquetas[0], true, false, false, false],
    [etiquetas[1], true, true, true, true],
    [etiquetas[2], true, true, true, true],
    [etiquetas[3], true, true, true, true],
    [etiquetas[4], true, false, false, false],
    [etiquetas[5], true, false, false, false],
    [etiquetas[6], true, false, false, false],
    [etiquetas[7], true, false, false, false],
    [etiquetas[8], true, false, false, false],
  ];
  const body = rows.map(([label, nm, d, td2, dl]) =>
    `<tr>${feat(label)}${nm ? yesNm : no}${d ? yes : no}${td2 ? yes : no}${conDoctoresLat ? (dl ? yes : no) : ''}</tr>`).join('');
  return `
    <p style="margin:22px 0 8px;font-weight:800;font-size:16px">${pt ? 'Como se compara a Neuromundi' : 'Cómo se compara Neuromundi'}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <tr>
        <td style="padding:8px 6px;background:#f8fafc;color:#64748b;font-weight:bold;text-transform:uppercase;font-size:10px;border-bottom:1px solid #e2e8f0">${pt ? 'Característica' : 'Característica'}</td>
        <td align="center" style="padding:8px 4px;background:#0369a1;color:#fff;font-weight:bold;border-bottom:1px solid #e2e8f0">Neuromundi</td>
        <td align="center" style="padding:8px 4px;background:#f1f5f9;font-weight:bold;border-bottom:1px solid #e2e8f0">Doctoralia</td>
        <td align="center" style="padding:8px 4px;background:#f1f5f9;font-weight:bold;border-bottom:1px solid #e2e8f0">Top Doctors</td>
        ${conDoctoresLat ? '<td align="center" style="padding:8px 4px;background:#f1f5f9;font-weight:bold;border-bottom:1px solid #e2e8f0">Doctores.lat</td>' : ''}
      </tr>
      ${body}
      <tr>
        <td style="padding:9px 6px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">${pt ? 'Preço' : 'Precio'}<br><span style="font-weight:400;color:#64748b;font-size:10px">${pt ? 'Quota do prestador · utentes sempre grátis' : 'Cuota del prestador · pacientes siempre gratis'}</span></td>
        <td align="center" style="padding:9px 4px;background:#e0f2fe;color:#0369a1;font-weight:800;border-top:2px solid #e2e8f0">${
          r?.precio_configurado && r?.precio_fundador
            ? `${MXN(Math.round(Number(r.precio_fundador) / 12), r.moneda || 'MXN')}<br><span style="font-weight:500;color:#64748b;font-size:10px">${r.moneda || 'MXN'}${pt ? '/mês equivalente · ' : '/mes equivalente · '}${MXN(Number(r.precio_fundador), r.moneda || 'MXN')}${pt ? ' por ano' : ' al año'}</span>`
            : `≈ $250–$800<br><span style="font-weight:500;color:#64748b;font-size:10px">MXN/mes · fundadores</span>`
        }</td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">${
          (() => {
            const d = r?.pais ? PRECIO_DOCTORALIA[r.pais] : undefined;
            return d
              ? `${d.monto}<br><span style="font-weight:500;color:#64748b;font-size:10px">${d.nota}</span>`
              : (pt ? 'Não público' : 'No público');
          })()
        }</td>
        <td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">${pt ? 'Sob convite' : 'Bajo invitación'}<br><span style="font-weight:500;color:#64748b;font-size:10px">${pt ? 'não público' : 'no público'}</span></td>
        ${conDoctoresLat ? `<td align="center" style="padding:9px 4px;background:#f8fafc;font-weight:800;border-top:2px solid #e2e8f0">${pt ? 'Não público' : 'No público'}</td>` : ''}
      </tr>
    </table>
    <p style="color:#94a3b8;font-size:10px;margin:6px 2px 0;line-height:1.4">${pt ? 'Comparação com informação pública de cada plataforma em Outubro de 2026. As plataformas mencionadas são marcas dos respectivos titulares; são citadas apenas para fins comparativos e informativos.' : 'Comparativa con información pública de cada plataforma a octubre de 2026. Las plataformas mencionadas son marcas de sus respectivos titulares; se citan solo con fines comparativos e informativos.'}</p>`;
}

function buildEmail(
  r: Row, fundador = true, promo: string | null = null, reenvio: string | null = null,
): { subject: string; html: string } {
  const claim = `${SITE}/reclamar/${r.token}`;
  const rawNombre = r.nombre || 'su organización';
  const nombre = esc(rawNombre); // escapado para el HTML; el asunto usa rawNombre
  const seg = segmentOf(r);

  // ── SEGUNDO CONTACTO: el plazo gratuito de 30 dias ──────────────────────
  // Las 83 fichas de paga ya escritas lo fueron SIN este plazo, porque no
  // existia (migracion 0323). Su correo no prometia ningun plazo de pago, asi
  // que no hay nada que desdecir; lo que hay es una oferta mejor que no
  // conocen. El correo no finge ser un recordatorio: dice que algo cambio,
  // porque presentarlo como "por si se le paso" seria esconder la novedad que
  // justifica el segundo correo.
  if (reenvio === 'plazo30') {
    const pt = esPT(r);
    const cuerpo = pt
      ? `<p>Olá, equipa de <b>${nombre}</b>:</p>
         <p>Há poucos dias convidámo-lo a completar o seu perfil no directório da Neuromundi.
            Desde então mudámos uma coisa importante e preferimos dizer-lho: <b>já não precisa de
            pagar a quota para começar</b>.</p>
         <p>Ao activar o seu perfil terá <b>30 dias para conhecer e usar a plataforma sem custo</b>,
            com a sua ficha publicada e a receber pedidos. A quota paga-se no final desse prazo.</p>
         <p>E reclamar agora <b>garante-lhe o preço de Membro Fundador</b> — metade, de forma
            vitalícia — mesmo que pague ao final desses 30 dias.</p>
         ${bloquePrecio(r)}
         ${bloqueFechas(r)}
         <p>Se, pelo contrário, preferir retirar a sua ficha do directório, pode fazê-lo a partir
            dessa mesma ligação. Respeitamos sempre a sua decisão.</p>`
      : `<p>Hola, equipo de <b>${nombre}</b>:</p>
         <p>Hace unos días le invitamos a completar su perfil en el directorio de Neuromundi.
            Desde entonces cambiamos algo importante y preferimos decírselo: <b>ya no hace falta
            cubrir la cuota para empezar</b>.</p>
         <p>Al activar su perfil tendrá <b>30 días para conocer y usar la plataforma sin costo</b>,
            con su ficha publicada y recibiendo consultas. La cuota se cubre al terminar ese plazo.</p>
         <p>Y reclamar ahora <b>le asegura el precio de Miembro Fundador</b> —la mitad, de por
            vida— aunque pague al final de esos 30 días.</p>
         ${bloquePrecio(r)}
         ${bloqueFechas(r)}
         <p>Si por el contrario prefiere retirar su ficha del directorio, puede hacerlo desde ese
            mismo enlace. En todo momento respetamos su decisión.</p>`;
    return {
      subject: pt
        ? `${rawNombre}: agora são 30 dias sem custo para conhecer a Neuromundi`
        : `${rawNombre}: ahora son 30 días sin costo para conocer Neuromundi`,
      html: shell(
        pt ? 'Trinta dias sem custo' : 'Treinta días sin costo',
        cuerpo,
        pt ? 'Activar o meu perfil' : 'Activar mi perfil',
        claim,
      ),
    };
  }

  // Bloque de cortesía: si viene un código exento, se anuncia arriba del cuerpo.
  const promoBlock = promo
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px 14px">
        ${esPT(r) ? '🎁 <b>Convite de cortesia:</b> a sua adesão é <b>sem custo</b>. Ao registar-se, introduza este código no passo da adesão:' : '🎁 <b>Invitación de cortesía:</b> su membresía es <b>sin costo</b>. Al registrarse, ingrese este código en el paso de membresía:'}
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
  const pt = esPT(r);

  const parrafoOferta = hayTarifa
    ? (pt
    ? `<p>E para o motivar ainda mais a fazer parte da Neuromundi, oferecemos-lhe a entrada como
         <b>Membro Fundador</b>. Queremos que faça parte da base fundadora da plataforma,
         com estas condições vitalícias:</p>
       <p style="margin:12px 0;padding:14px 16px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;font-size:15px;line-height:1.6;color:#0c4a6e">
         <u>Desconto vitalício</u><sup>*</sup> de <b>50%</b> como Membro Fundador: apenas
         <b style="color:#0369a1">${r.precio_desde ? 'a partir de ' : ''}${MXN(Number(r.precio_fundador), cur)} ${cur} por ano</b>,
         em vez do preço normal de <b>${r.precio_desde ? 'a partir de ' : ''}${MXN(Number(r.precio_ordinario), cur)} ${cur}</b>.${r.precio_desde ? ' A quota exacta fica definida quando indicar a sua profissão ao completar o perfil.' : ''}
       </p>`
    : `<p>Y para motivarle aún más a formar parte de Neuromundi, le ofrecemos ingresar como
         <b>Miembro Fundador</b>. Queremos que forme parte de la base fundadora de la plataforma,
         con estas condiciones de por vida:</p>
       <p style="margin:12px 0;padding:14px 16px;border:1px solid #bae6fd;background:#f0f9ff;border-radius:12px;font-size:15px;line-height:1.6;color:#0c4a6e">
         <u>Descuento vitalicio</u><sup>*</sup> del <b>50%</b> como Miembro Fundador: Sólo
         <b style="color:#0369a1">${r.precio_desde ? 'desde ' : ''}${MXN(Number(r.precio_fundador), cur)} ${cur} al año</b>,
         en lugar del precio ordinario de <b>${r.precio_desde ? 'desde ' : ''}${MXN(Number(r.precio_ordinario), cur)} ${cur}</b>.${r.precio_desde ? ' La cuota exacta queda definida cuando indique su profesión al completar su perfil.' : ''}
       </p>`)
    : '';

  // 30 DIAS SIN COSTO (21 oct 2026, aprobado por Enyoria). Hasta la migracion
  // 0323 el perfil de paga NO podia publicarse sin cubrir la cuota, asi que
  // para ver que le daba la plataforma habia que pagar primero. Ahora la
  // prueba cuenta como cuota cubierta y el correo lo dice, porque callarlo
  // deja intacta la unica objecion que de verdad frena: pagar a ciegas.
  //
  // La ultima frase NO es adorno: founder_eligible() medía el plazo en el
  // momento del pago (migracion 0325), de modo que usar el mes y pagar al
  // final habria costado el precio de fundador. Ya no, y se dice aqui.
  const parrafoPrueba = hayTarifa
    ? (pt
      ? `<p>Ao activar o seu perfil terá <b>30 dias para conhecer e usar a plataforma sem custo</b>,
           com a sua ficha publicada e a receber pedidos. A quota paga-se no final desse prazo, e
           reclamar agora garante-lhe o preço de Membro Fundador mesmo que pague ao final.</p>`
      : `<p>Al activar su perfil tendrá <b>30 días para conocer y usar la plataforma sin costo</b>,
           con su ficha publicada y recibiendo consultas. La cuota se cubre al terminar ese plazo, y
           reclamar ahora le asegura el precio de Miembro Fundador aunque pague al final.</p>`)
    : '';

  // Las organizaciones exentas NO reciben parrafoOferta (no tienen tarifa), y sin
  // esto el correo nunca les dice que no pagan nada: medido el 14 oct 2026, 119 de
  // las 195 fichas exentas de las tandas 5 a 8 no lo veian en ningun lado, porque
  // la viñeta de membresia gratuita solo existe para ngo y company.
  //
  // LAS EMPRESAS LLEVAN UN PARRAFO DISTINTO (14 oct 2026). El texto de arriba
  // promete membresia "vitalicia", y esa misma noche se establecio que una
  // empresa pierde el directorio a los 30 dias y funciones a los 45 si no
  // publica ninguna oferta (migracion 0223). Prometer "vitalicia" y retirar la
  // visibilidad al mes es exactamente lo que hace que alguien se sienta
  // enganado. A las organizaciones civiles y a los organismos publicos NO les
  // aplica ese plazo, asi que conservan su parrafo sin cambios.
  const parrafoExento = (esFree(r) && !hayTarifa)
    ? (pt
        ? (r.provider_type === 'company'
            ? `<p>A sua adesão à Neuromundi é gratuita enquanto mantiver publicada pelo menos uma
                 oferta de emprego, voluntariado ou estágio. Não há quota de inscrição nem
                 quota anual, nem agora nem depois.</p>`
            : `<p>Em virtude do carácter público e social da sua organização, a sua adesão à
                 Neuromundi é gratuita de forma vitalícia. Não há quota de inscrição nem quota anual.
                 Completar o seu perfil não lhe custa nada, nem agora nem depois.</p>`)
        : (r.provider_type === 'company'
            ? `<p>Su membresía en Neuromundi es gratuita mientras mantenga publicada al menos una
                 oferta de empleo, voluntariado o servicio social. No hay cuota de inscripción ni
                 cuota anual, ni ahora ni después.</p>`
            : `<p>En virtud del carácter público y social de su organización, su membresía en
                 Neuromundi es gratuita en forma vitalicia. No hay cuota de inscripción ni cuota anual.
                 Completar su perfil no le cuesta nada, ni ahora ni después.</p>`))
    : '';

  const parrafoPlazo = pt
    ? (fd
        ? `<p>Para tornar efectivo este benefício, agradecemos que entre através da ligação seguinte
             e complete o seu perfil <b>antes de ${fechaLarga(fd, true)}</b>.</p>`
        : `<p>Para tornar efectivo este benefício, agradecemos que entre através da ligação seguinte
             e complete o seu perfil.</p>`)
    : (fd
        ? `<p>Para hacer efectivo este beneficio le agradeceremos ingresar mediante el siguiente enlace
             y completar su perfil <b>antes del ${fechaLarga(fd)}</b>.</p>`
        : `<p>Para hacer efectivo este beneficio le agradeceremos ingresar mediante el siguiente enlace
             y completar su perfil.</p>`);

  const parrafoCierre = pt
    ? (`<p>Esperamos que nos favoreça aceitando este convite e que nos permita recebê-lo
         na comunidade Neuromundi.</p>
       <p>Se, pelo contrário, não desejar aceitá-lo e preferir retirar a sua ficha do directório,
         pode fazê-lo a partir dessa mesma ligação.</p>`
      + (corte
        ? `<p>Para que a sua ficha continue publicada depois de <b>${fechaLarga(corte, true)}</b> basta
             que ${hayTarifa ? 'complete o seu perfil e cubra a quota correspondente'
               : 'complete o seu perfil'}. Se ${hayTarifa ? 'algum dos requisitos não for cumprido'
               : 'esse requisito não for cumprido'}, retiramos a sua ficha do directório. Respeitamos
             sempre a sua decisão se não desejar fazer parte da Neuromundi.</p>`
        : ''))
    : (`<p>Esperamos nos favorezca aceptando esta invitación y nos permita recibirle
         en la comunidad Neuromundi.</p>
       <p>Si por el contrario usted no desea aceptarla y prefiere retirar su ficha del directorio,
         puede hacerlo desde ese mismo enlace.</p>`
      + (corte
        ? `<p>Para que su ficha siga publicada después del <b>${fechaLarga(corte)}</b> sólo se
             requiere que ${hayTarifa ? 'complete su perfil y cubra la cuota correspondiente'
               : 'complete su perfil'}. Si no se cumple con ${hayTarifa ? 'alguno de los requisitos'
               : 'ese requisito'} retiramos su ficha del directorio. En todo momento respetamos su
             decisión si no desea formar parte de Neuromundi.</p>`
        : ''));

  const notaInflacion = hayTarifa
    ? (pt
      ? `<p style="color:#64748b;font-size:12px;line-height:1.5;margin-top:16px">
           <sup>*</sup> A quota anual só será actualizada na mesma proporção do aumento
           anual da inflação correspondente ao seu país.
         </p>`
      : `<p style="color:#64748b;font-size:12px;line-height:1.5;margin-top:16px">
           <sup>*</sup> La cuota anual sólo se actualizará en la misma proporción que el incremento
           anual inflacionario correspondiente a su país.
         </p>`)
    : '';

  const intro = pt
    ? `<p>Olá, <b>${nombre}</b>:</p>
    <p>A <b>Neuromundi</b> é mais do que um directório: é a primeira comunidade a nível global que liga
      utentes, famílias, especialistas, fornecedores, prestadores de serviços, clínicas, escolas,
      empresas e organizações da sociedade civil em torno do <b>neurodesenvolvimento, da
      neurodivergência e das doenças neurológicas</b>.</p>
    <p>Analisámos o seu perfil e consideramos que seria um excelente membro da Neuromundi, pelo que
      acrescentámos o seu perfil ao nosso directório público.</p>
    <p>A sua informação básica já está visível para quem procure perfis como o seu no directório.</p>
    <p>Ao reclamar e activar o seu perfil completo, terá acesso livre e ilimitado a:</p>`
    : `<p>Hola, <b>${nombre}</b>:</p>
    <p><b>Neuromundi</b> es más que un directorio: es la primera comunidad a nivel global que enlaza a
      pacientes, familias, especialistas, proveedores, prestadores de servicios, clínicas, escuelas,
      empresas y organizaciones de la sociedad civil en torno a <b>neurodesarrollo, neurodivergencias
      y afecciones neurológicas</b>.</p>
    <p>Hemos analizado su perfil y consideramos que sería un excelente miembro de Neuromundi, por lo
      que hemos agregado su perfil a nuestro directorio público.</p>
    <p>Su información básica ya es visible para quien busque perfiles como el suyo en el directorio.</p>
    <p>Al reclamar y activar su perfil completo, usted tendrá acceso libre e ilimitado a:</p>`;

  const cuerpo = `${intro}
    ${beneficios(r)}
    ${parrafoOferta}
    ${parrafoPrueba}
    ${parrafoExento}
    ${tablaComparativa(r)}
    ${parrafoPlazo}
    ${parrafoCierre}
    ${notaInflacion}`;

  // El asunto es lo unico que ve el destinatario antes de abrir. A una
  // organizacion exenta no se le puede pedir que "asegure su cuota": o no abre
  // el correo creyendo que le van a cobrar, o lo abre y se siente enganada.
  return {
    subject: pt
      ? (esFree(r)
          ? `${rawNombre}: o seu perfil na Neuromundi, sem custo para a sua organização`
          : `${rawNombre}: active o seu perfil e garanta a sua quota de Membro Fundador`)
      : (esFree(r)
          ? `${rawNombre}: su perfil en Neuromundi, sin costo para su organización`
          : `${rawNombre}: active su perfil y asegure su cuota de Miembro Fundador`),
    html: shell(
      pt ? 'Damos-lhe as boas-vindas à Neuromundi' : 'Le damos la bienvenida a Neuromundi',
      promoBlock + cuerpo,
      pt ? 'Activar ou retirar a minha ficha' : 'Activar o retirar mi ficha',
      claim, pt),
  };
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json(401, { error: 'No autorizado' });
  }

  // Los plazos se leen de campaign_config en cada invocación, nunca se fijan aquí.
  await cargarRelojes();

  let body: { send?: boolean; limit?: number; segment?: string; tipo_correo?: string; token?: string; fundador?: boolean; promo?: string | null; tanda?: number; reenvio?: string } = {};
  try { body = await req.json(); } catch { /* vacío = dry-run, todos */ }
  const doSend = body.send === true;
  // Encuadre de fundador en el correo (por defecto sí, como el envío masivo).
  const fundador = body.fundador !== false;
  // El limite por omision era 50 SIEMPRE, asi que una llamada por tanda dejaba
  // fuera, en silencio, las fichas que pasaran de 50 (la tanda 6 tiene 51).
  // Cuando se pide una tanda, el valor por omision cubre la tanda completa.
  const limitePorOmision = body.tanda ? 200 : 50;
  const limit = Math.min(Math.max(Number(body.limit ?? limitePorOmision), 1), 1000);
  const segment = ['nuevos', 'ya_publico_social', 'ya_privado', 'todos'].includes(body.segment ?? '')
    ? (body.segment as string) : 'todos';
  const tipoCorreo = ['personal', 'institucional', 'todos'].includes(body.tipo_correo ?? '')
    ? (body.tipo_correo as string) : 'todos';
  // SEGUNDO CONTACTO. Lista blanca, no texto libre: un motivo mal escrito
  // dejaria la marca de idempotencia en otra casilla y permitiria enviar dos
  // veces el mismo correo a la misma persona.
  const reenvio = body.reenvio === 'plazo30' ? 'plazo30' : null;

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
    // La cola (rama de abajo) ya trae la tarifa de cada ficha; esta rama no, asi
    // que hay que pedirla aqui. OJO con el nombre del parametro: la funcion se
    // declara registration_quote(p_type, p_country). Con cualquier otro nombre la
    // llamada falla EN SILENCIO, el precio llega vacio y el correo sale sin el
    // parrafo del 50% y sin la nota de inflacion, con el rango generico en la tabla.
    const cot = await admin.rpc('registration_quote', {
      p_type: d.provider_type ?? 'service_provider',
      p_country: d.pais ?? 'Mexico',
    });
    if (cot.error) return json(500, { error: `registration_quote: ${cot.error.message}` });
    const q = (cot.data ?? {}) as { currency?: string; founder_annual?: number; ordinary_annual?: number; configured?: boolean };
    rows = [{
      token: inv.token, correo: inv.correo, nombre: d.nombre ?? '',
      provider_type: d.provider_type ?? null, sector: d.sector ?? null,
      estado: d.estado ?? null, ciudad: d.ciudad ?? null, pais: d.pais ?? null,
      ya_contactado_8sep: false,
      correo_personal: /@(gmail|hotmail|outlook|yahoo|live|icloud|me|aol|msn|gmx|prodigy)\./i.test(inv.correo),
      moneda: q.currency ?? 'MXN',
      precio_fundador: q.founder_annual ?? null,
      precio_ordinario: q.ordinary_annual ?? null,
      precio_configurado: q.configured ?? false,
    }];
  } else {
    // Si viene `tanda`, la cola respeta el plan (directorio_plan_invitacion) y
    // trae la tarifa exacta de cada ficha. Sin `tanda`, comportamiento anterior.
    const { data, error } = reenvio
      ? await admin.rpc('directorio_invitaciones_cola_reenvio', { p_motivo: reenvio, p_limit: 200 })
      : body.tanda
      ? await admin.rpc('directorio_invitaciones_cola_tanda_v3', { p_tanda: body.tanda, p_limit: 200 })
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
      dry_run: true, segment, tipo_correo: tipoCorreo, reenvio, total: rows.length,
      // Aviso explicito de corte: antes habia que adivinarlo comparando cifras.
      limite_efectivo: limit,
      se_cortaria: rows.length > limit,
      quedarian_fuera: Math.max(0, rows.length - limit),
      por_tanda: porTanda, por_tipo_correo: { personal, institucional },
      // Remitente efectivo: permite comprobar CAMPAIGN_FROM antes de cada tanda
      // sin tener que mandar un correo de verdad.
      remitente: FROM,
      responder_a: REPLY_TO,
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
      // 0261: se sella el plazo ANTES de armar el correo, para que la fecha que
      // se imprime sea exactamente la que quedo guardada en la base. Si el
      // sellado falla no se inventa nada: fundadorDe() cae a la fecha del pais.
      try {
        // En el segundo contacto se LEE el plazo ya sellado, no se vuelve a
        // sellar: volver a contarlo desde hoy le regalaria semanas de plazo de
        // fundador a quien ya tenia el suyo, y el correo imprimiria una fecha
        // distinta de la que la plataforma aplica.
        const { data: hasta } = reenvio
          ? await admin
              .from('directorio_invitaciones')
              .select('fundador_hasta')
              .eq('token', r.token)
              .maybeSingle()
              .then((x) => ({ data: (x.data as { fundador_hasta?: string } | null)?.fundador_hasta ?? null }))
          : await admin.rpc('sellar_plazo_invitacion', { p_token: r.token });
        if (hasta) r.fundador_hasta = hasta as unknown as string;
      } catch { /* sin sellado, el correo usa la fecha del pais */ }
      const { subject, html } = buildEmail(r, fundador, body.promo ?? null, reenvio);
      // La clave de idempotencia lleva el motivo: con `inv-<token>` a secas,
      // Resend trataria el segundo contacto como repeticion del primero y no
      // lo entregaria.
      const idem = reenvio ? `re-${reenvio}-${r.token}` : `inv-${r.token}`;
      if (await sendEmail(r.correo, subject, html, idem, `${SITE}/reclamar/${r.token}`)) {
        // El segundo contacto NO toca enviada_en: esa fecha sostiene los plazos
        // sellados y el informe de entrega del primer correo.
        if (reenvio) await admin.rpc('directorio_invitacion_reenviada', { p_token: r.token, p_motivo: reenvio });
        else await admin.rpc('directorio_invitacion_enviada', { p_token: r.token });
        enviados++;
      } else { fallidos++; }
    } catch { fallidos++; }
    await sleep(700);
  }
  const sinProcesar = Math.max(0, rows.length - lote.length);
  return json(200, {
    ok: true, segment, tipo_correo: tipoCorreo, reenvio, enviados, fallidos,
    procesados: lote.length,
    // Si el lote se corto por el limite, se dice: antes quedaba oculto.
    en_cola: rows.length, sin_procesar: sinProcesar,
    nota: sinProcesar > 0
      ? `Quedaron ${sinProcesar} sin enviar por el limite de ${limit}. Vuelva a llamar con la misma tanda para continuar.`
      : 'La tanda quedo completa.',
  });
});
