// ============================================================================
// Supabase Edge Function: recordar-publicacion
//
// POR QUE EXISTE (29 oct 2026). Medido sobre los tres reclamos reales de la
// campana: el unico que publico su perfil lo hizo en el mismo minuto en que
// reclamo su ficha. Los otros dos NO han vuelto a entrar —ocho y seis dias— y
// siguen invisibles. El formulario no los freno: nadie los llamo de vuelta.
// La unica funcion de avisos del proyecto, send-reminders, solo atiende citas.
//
// Tres avisos: a los 2 dias, a los 7 y a los 15. Uno por etapa y por persona;
// la clave primaria de recordatorios_publicacion lo garantiza aunque la tarea
// programada se dispare dos veces.
//
// Cada correo dice QUE FALTA EXACTAMENTE —la cola lo calcula— y lleva al panel.
// No promete nada que no sea cierto y no insiste despues del dia 15.
//
// Despliegue: supabase functions deploy recordar-publicacion --no-verify-jwt
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = Deno.env.get('CAMPAIGN_FROM') ?? 'Neuromundi <admin@admin.neuromundi.com>';
const REPLY_TO = Deno.env.get('CAMPAIGN_REPLY_TO') ?? 'admin@neuromundi.com';
const SITE = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://www.neuromundi.com';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

interface Fila {
  user_id: string; correo: string; nombre: string | null;
  pais: string | null; etapa: number; faltantes: string[] | null;
}

// Idioma por PAIS, igual que en enviar-invitaciones y por la misma razon: el
// destinatario no tiene sesion abierta cuando llega el correo, asi que no hay
// preferencia de navegador que consultar.
type Lang = 'es' | 'pt' | 'en' | 'fr';
function idioma(pais: string | null): Lang {
  if (pais === 'Brasil' || pais === 'Portugal') return 'pt';
  if (pais === 'Estados Unidos') return 'en';
  if (pais === 'Canadá') return 'en'; // el frances de Quebec se decide por provincia al invitar; aqui no la tenemos
  return 'es';
}

const CAMPOS: Record<Lang, Record<string, string>> = {
  es: { descripcion: 'una descripción', telefono: 'su teléfono', pais: 'su país', cuota: 'cubrir la cuota' },
  pt: { descripcion: 'uma descrição', telefono: 'o seu telefone', pais: 'o seu país', cuota: 'pagar a quota' },
  en: { descripcion: 'a description', telefono: 'your phone number', pais: 'your country', cuota: 'covering the fee' },
  fr: { descripcion: 'une description', telefono: 'votre téléphone', pais: 'votre pays', cuota: 'régler la cotisation' },
};

function lista(faltantes: string[], lang: Lang): string {
  const y = { es: ' y ', pt: ' e ', en: ' and ', fr: ' et ' }[lang];
  const nombres = faltantes.map((f) => CAMPOS[lang][f] ?? f);
  if (nombres.length <= 1) return nombres[0] ?? '';
  return nombres.slice(0, -1).join(', ') + y + nombres[nombres.length - 1];
}

function armar(f: Fila, lang: Lang): { subject: string; html: string } {
  const nombre = (f.nombre ?? '').trim();
  const falta = lista(f.faltantes ?? [], lang);
  const panel = `${SITE}/panel`;
  const T = {
    es: {
      subject: `${nombre}: su perfil aún no aparece en el directorio`,
      title: 'Le falta un paso',
      hola: `Hola, equipo de <b>${nombre}</b>:`,
      p1: `Reclamó su ficha en Neuromundi, pero su perfil <b>todavía no está publicado</b>, así que las familias que buscan en el directorio aún no lo encuentran como miembro.`,
      p2: `Falta <b>${falta}</b>. Es el único paso que queda.`,
      cta: 'Completar y publicar mi perfil',
      cierre: 'Si prefiere no continuar, no tiene que hacer nada: este es el último de tres avisos y no volveremos a escribirle por este motivo.',
    },
    pt: {
      subject: `${nombre}: o seu perfil ainda não aparece no directório`,
      title: 'Falta-lhe um passo',
      hola: `Olá, equipa de <b>${nombre}</b>:`,
      p1: `Reclamou a sua ficha na Neuromundi, mas o seu perfil <b>ainda não está publicado</b>, por isso as famílias que procuram no directório ainda não o encontram como membro.`,
      p2: `Falta <b>${falta}</b>. É o único passo que resta.`,
      cta: 'Completar e publicar o meu perfil',
      cierre: 'Se preferir não continuar, não precisa de fazer nada: este é o último de três avisos e não voltaremos a escrever-lhe por este motivo.',
    },
    en: {
      subject: `${nombre}: your profile is not in the directory yet`,
      title: 'One step left',
      hola: `Hello, ${nombre} team:`,
      p1: `You claimed your listing on Neuromundi, but your profile <b>is not published yet</b>, so families searching the directory still cannot find you as a member.`,
      p2: `What is missing: <b>${falta}</b>. That is the only step left.`,
      cta: 'Complete and publish my profile',
      cierre: 'If you would rather not continue, you do not need to do anything: this is the last of three reminders and we will not write to you about this again.',
    },
    fr: {
      subject: `${nombre} : votre profil n’apparaît pas encore dans le répertoire`,
      title: 'Il reste une étape',
      hola: `Bonjour, équipe de <b>${nombre}</b>,`,
      p1: `Vous avez réclamé votre fiche sur Neuromundi, mais votre profil <b>n’est pas encore publié</b>. Les familles qui consultent le répertoire ne vous trouvent donc pas encore comme membre.`,
      p2: `Il manque <b>${falta}</b>. C’est la seule étape qui reste.`,
      cta: 'Compléter et publier mon profil',
      cierre: 'Si vous préférez ne pas continuer, vous n’avez rien à faire : ceci est le dernier de trois rappels et nous ne vous écrirons plus à ce sujet.',
    },
  }[lang];

  // El cierre que promete "no volveremos a escribirle" SOLO es cierto en el
  // tercer aviso. En los dos primeros se omite, porque decirlo antes seria
  // mentir y porque callarlo del todo dejaria la impresion contraria.
  const cierre = f.etapa === 15 ? `<p style="color:#64748b;font-size:13px">${T.cierre}</p>` : '';

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <div style="background:linear-gradient(90deg,#0ea5e9,#0369a1);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;font-weight:800;letter-spacing:.04em">NEUROMUNDI</div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 14px 14px;padding:22px 20px">
      <h1 style="font-size:20px;margin:0 0 12px">${T.title}</h1>
      <p>${T.hola}</p>
      <p>${T.p1}</p>
      <p>${T.p2}</p>
      <p style="margin:22px 0 8px"><a href="${panel}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">${T.cta}</a></p>
      ${cierre}
    </div>
  </div>`;
  return { subject: T.subject, html };
}

async function enviar(to: string, subject: string, html: string, idem: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idem,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, reply_to: REPLY_TO }),
  });
  return r.ok;
}

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json(401, { error: 'No autorizado' });
  }
  const body = await req.json().catch(() => ({}));
  const send = body?.send === true;

  const { data, error } = await admin.rpc('cola_recordatorio_publicacion');
  if (error) return json(500, { error: error.message });
  const filas = (data ?? []) as Fila[];

  if (!send) {
    return json(200, {
      dry_run: true,
      total: filas.length,
      por_etapa: filas.reduce((a: Record<string, number>, f) => {
        a[String(f.etapa)] = (a[String(f.etapa)] ?? 0) + 1; return a;
      }, {}),
    });
  }

  let enviados = 0; let fallidos = 0;
  for (const f of filas) {
    const lang = idioma(f.pais);
    const { subject, html } = armar(f, lang);
    const ok = await enviar(f.correo, subject, html, `pub-${f.etapa}-${f.user_id}`);
    if (ok) {
      enviados++;
      await admin.rpc('recordatorio_publicacion_enviado', { p_user: f.user_id, p_etapa: f.etapa });
    } else {
      fallidos++;
    }
    await new Promise((r) => setTimeout(r, 120)); // Resend admite 10 por segundo
  }
  return json(200, { enviados, fallidos, total: filas.length });
});
