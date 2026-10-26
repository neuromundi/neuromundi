// ============================================================================
// gen-seo-langs.mjs — genera snapshots SEO por idioma tras `vite build`.
//
// Problema: es una SPA con un solo index.html; Google indexa UNA versión por
// URL y muestra el snippet en el idioma de ESE HTML. Con una sola URL, el
// resultado de búsqueda sale siempre en un idioma.
//
// Solución (sin tocar el ruteo de la app ni el .htaccess): por cada idioma
// distinto de español generamos dist/{idioma}/index.html — un snapshot con su
// <title>, meta description, Open Graph/Twitter, <html lang/dir>, canonical
// propio y el mismo juego de hreflang que la raíz. Así Google rastrea una
// versión por idioma y muestra a cada usuario el snippet en su lengua.
//
// Cada snapshot lleva un script mínimo que fija el idioma (localStorage
// 'neuro.lang'). La URL se QUEDA en /{idioma}/ (ya NO se reescribe a '/' con
// replaceState: Googlebot lo tomaba como redirección y no indexaba la versión
// por idioma). La SPA reconoce /{idioma}/ como raíz de idioma vía la ruta
// LangHome de src/App.tsx, que fija el idioma y monta la portada.
// La barra final es obligatoria porque el .htaccess usa DirectorySlash Off:
// /{idioma}/ sirve su index.html directamente (mod_dir), sin reescritura.
//
// El español es la raíz (x-default), así que NO se genera /es/.
// ============================================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const ORIGIN = 'https://www.neuromundi.com';

// title + description por idioma (las 3 áreas: neurodesarrollo, neurodivergencia
// y afecciones neurológicas). RTL: ar, he.
const LANGS = {
  en: {
    title: 'Neuromundi: neurodevelopment, neurodivergence & neurological conditions',
    desc: 'The global community for neurodevelopment, neurodivergence and neurological conditions. Connecting families and people with validated specialists, inclusive schools, shops and providers. Directory, store, learning and appointments.',
  },
  fr: {
    title: 'Neuromundi : neurodéveloppement, neurodivergence et affections neurologiques',
    desc: 'La communauté mondiale pour le neurodéveloppement, la neurodivergence et les affections neurologiques. Elle met en relation familles et personnes avec des spécialistes, des écoles inclusives, des commerces et des prestataires validés par la communauté. Annuaire, boutique, formation et rendez-vous.',
  },
  de: {
    title: 'Neuromundi: Neuroentwicklung, Neurodivergenz und neurologische Erkrankungen',
    desc: 'Die globale Gemeinschaft für Neuroentwicklung, Neurodivergenz und neurologische Erkrankungen. Sie verbindet Familien und Menschen mit geprüften Fachleuten, inklusiven Schulen, Geschäften und Anbietern. Verzeichnis, Shop, Weiterbildung und Termine.',
  },
  it: {
    title: 'Neuromundi: neurosviluppo, neurodivergenza e condizioni neurologiche',
    desc: 'La comunità globale per il neurosviluppo, la neurodivergenza e le condizioni neurologiche. Mette in contatto famiglie e persone con specialisti, scuole inclusive, negozi e fornitori convalidati dalla comunità. Directory, negozio, formazione e appuntamenti.',
  },
  pt: {
    title: 'Neuromundi: neurodesenvolvimento, neurodivergência e afecções neurológicas',
    desc: 'A comunidade global para o neurodesenvolvimento, a neurodivergência e as afecções neurológicas. Conecta famílias e pessoas com especialistas, escolas inclusivas, comércios e prestadores validados pela comunidade. Diretório, loja, formação e agenda de consultas.',
  },
  ja: {
    title: 'Neuromundi：神経発達・神経多様性・神経疾患のグローバルコミュニティ',
    desc: '神経発達、神経多様性、神経疾患のためのグローバルコミュニティ。家族や当事者を、コミュニティが検証した専門家・インクルーシブな学校・店舗・サービス提供者とつなぎます。ディレクトリ、ストア、学習、予約。',
  },
  zh: {
    title: 'Neuromundi：神经发育、神经多样性与神经系统疾病的全球社区',
    desc: '面向神经发育、神经多样性和神经系统疾病的全球社区。将家庭和个人与经社区验证的专业人士、包容性学校、商家和服务提供者连接起来。目录、商店、培训与预约。',
  },
  ar: {
    dir: 'rtl',
    title: 'Neuromundi: النمو العصبي والتنوع العصبي والحالات العصبية',
    desc: 'المجتمع العالمي للنمو العصبي والتنوع العصبي والحالات العصبية. يربط العائلات والأشخاص بأخصائيين ومدارس دامجة ومتاجر ومقدّمي خدمات موثوقين من المجتمع. دليل، متجر، تدريب، ومواعيد.',
  },
  he: {
    dir: 'rtl',
    title: 'Neuromundi: התפתחות עצבית, שונות עצבית ומצבים נוירולוגיים',
    desc: 'הקהילה העולמית להתפתחות עצבית, שונות עצבית ומצבים נוירולוגיים. מחברת משפחות ואנשים עם מומחים, בתי ספר מכילים, עסקים ונותני שירות מאומתים על ידי הקהילה. מדריך, חנות, הכשרה ותורים.',
  },
  ko: {
    title: 'Neuromundi: 신경발달·신경다양성·신경학적 질환 글로벌 커뮤니티',
    desc: '신경발달, 신경다양성, 신경학적 질환을 위한 글로벌 커뮤니티. 가족과 당사자를 커뮤니티가 검증한 전문가, 통합 학교, 상점, 서비스 제공자와 연결합니다. 디렉터리, 스토어, 교육, 예약.',
  },
};

// Rutas profundas públicas (español). Son SPA: sin snapshot, su HTML crudo
// declara canónica = raíz (la de index.html), y Googlebot —sin ejecutar JS— las
// veía como duplicadas de la portada ("Duplicada: Google eligió otra canónica" /
// "el usuario no indicó canónica"). Cada snapshot fija su canónica propia (y su
// título/descripción). NO llevan hreflang: no tienen equivalentes por idioma
// (las variantes por idioma son solo de la portada). El .htaccess sirve
// dist/<ruta>.html cuando existe (regla de "snapshot por ruta").
const ROUTES = {
  'directorio': {
    title: 'Directorio de especialistas y servicios | Neuromundi',
    desc: 'Encuentra especialistas validados, clínicas, escuelas inclusivas y comercios de neurodesarrollo, neurodivergencia y afecciones neurológicas. Filtra por país, sección y especialidad.',
  },
  'tienda': {
    title: 'Tienda inclusiva | Neuromundi',
    desc: 'Productos y recursos para neurodesarrollo, neurodivergencia y afecciones neurológicas: material sensorial, comunicación, aprendizaje y más, de marcas de la comunidad.',
  },
  'inclusion-escolar': {
    title: 'Inclusión escolar | Neuromundi',
    desc: 'Escuelas y centros con programas de inclusión y apoyos razonables para estudiantes con neurodivergencia y afecciones neurológicas.',
  },
  'inclusion-laboral': {
    title: 'Inclusión laboral: empleo, voluntariado y servicio social | Neuromundi',
    desc: 'Oportunidades de empleo, voluntariado y servicio social inclusivas, publicadas por empresas y organizaciones. Busca por país y tipo de oportunidad.',
  },
  'academy': {
    title: 'Academy: formación en neurodesarrollo | Neuromundi',
    desc: 'Cursos y formación sobre neurodesarrollo, neurodivergencia y afecciones neurológicas para familias y profesionales.',
  },
  'blog': {
    title: 'Blog | Neuromundi',
    desc: 'Artículos y guías sobre neurodesarrollo, neurodivergencia y afecciones neurológicas, escritos por la comunidad y especialistas.',
  },
  'eventos': {
    title: 'Eventos | Neuromundi',
    desc: 'Talleres, charlas y encuentros sobre neurodesarrollo, neurodivergencia y afecciones neurológicas.',
  },
  'kit': {
    title: 'Herramientas por sección | Neuromundi',
    desc: 'Kit de herramientas prácticas por sección: neurodesarrollo, neurodivergencia y afecciones neurológicas, con módulos y recursos descargables.',
  },
  'pregunta-al-experto': {
    title: 'Pregunta al experto | Neuromundi',
    desc: 'Resuelve tus dudas sobre neurodesarrollo, neurodivergencia y afecciones neurológicas con especialistas de la comunidad.',
  },
  'red': {
    title: 'Red Neuromundi: aliados de la Neuromundi ID | Neuromundi',
    desc: 'Portal de aliados de la Neuromundi ID: cómo validar la credencial, beneficios y sellos para prestadores.',
  },
  'fundadores': {
    title: 'Miembros Fundadores | Neuromundi',
    desc: 'Conoce a los Miembros Fundadores de Neuromundi por país: especialistas, escuelas, comercios y organizaciones que impulsan la comunidad.',
  },
  'donantes': {
    title: 'Muro de donantes | Neuromundi',
    desc: 'Personas y organizaciones que apoyan a Neuromundi con sus donativos.',
  },
  'donar': {
    title: 'Haz un donativo | Neuromundi',
    desc: 'Apoya a la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas con un donativo, con o sin cuenta.',
  },
  'beneficios': {
    title: 'Beneficios de la comunidad | Neuromundi',
    desc: 'Beneficios de pertenecer a Neuromundi según tu tipo de perfil: familias, especialistas, escuelas, comercios y organizaciones.',
  },
  'conocer-mas': {
    title: 'Conocer más | Neuromundi',
    desc: 'Qué es Neuromundi: la comunidad global de neurodesarrollo, neurodivergencia y afecciones neurológicas, y cómo participar.',
  },
  'manifiesto': {
    title: 'Manifiesto de la Comunidad | Neuromundi',
    desc: 'El Manifiesto de la Comunidad Neuromundi: nuestros principios de respeto, inclusión y enfoque neuroafirmativo.',
  },
  'crear-cuenta': {
    title: 'Crear cuenta | Neuromundi',
    desc: 'Únete a Neuromundi: familias y pacientes gratis; especialistas, escuelas, clínicas, comercios y organizaciones con perfil en el directorio.',
  },
  'terminos': {
    title: 'Términos y Condiciones | Neuromundi',
    desc: 'Términos y Condiciones de uso de la plataforma Neuromundi.',
  },
  'privacidad': {
    title: 'Aviso de Privacidad | Neuromundi',
    desc: 'Aviso de Privacidad de Neuromundi: cómo tratamos y protegemos tus datos.',
  },
  'proteccion-datos': {
    title: 'Protección de datos | Neuromundi',
    desc: 'Cómo proteger y ejercer tus derechos sobre tus datos personales en Neuromundi.',
  },
  // Rutas canónicas en inglés (plataforma internacional). Las españolas de arriba
  // quedan como alias; ambas tienen snapshot para SEO.
  'terms': {
    title: 'Términos y Condiciones | Neuromundi',
    desc: 'Términos y Condiciones de uso de la plataforma Neuromundi.',
  },
  'privacy': {
    title: 'Aviso de Privacidad | Neuromundi',
    desc: 'Aviso de Privacidad de Neuromundi: cómo tratamos y protegemos tus datos.',
  },
  'support': {
    title: 'Soporte y ayuda | Neuromundi',
    desc: 'Soporte al cliente de Neuromundi: correo, WhatsApp y reporte de incidencias.',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

// Envoltura tolerante: esta es una mejora de SEO, NO debe bloquear el
// despliegue. Si algo falla, se avisa y se sale con éxito (0) para no romper la
// tubería del build; el sitio se despliega igual, solo sin los snapshots.
try {
  const src = readFileSync(join(DIST, 'index.html'), 'utf8');
  let count = 0;

  for (const [code, cfg] of Object.entries(LANGS)) {
    const dir = cfg.dir === 'rtl' ? ' dir="rtl"' : '';
    // Fija el idioma para el primer pintado. NO reescribimos la URL a "/": antes
    // se hacía con history.replaceState, pero Googlebot lo tomaba como una
    // redirección y marcaba /{idioma}/ como "Página con redirección" (no
    // indexada). Ahora la URL se queda en /{idioma}/ y la SPA la reconoce como
    // raíz de idioma (ruta LangHome en src/App.tsx), así Google indexa cada
    // versión con su propio título/descripción.
    const boot = `    <script>try{localStorage.setItem('neuro.lang','${code}')}catch(e){}</script>\n  </head>`;
    const html = src
      .replace(/<html lang="[^"]*"[^>]*>/, `<html lang="${code}"${dir}>`)
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(cfg.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(cfg.desc)}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(cfg.title)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(cfg.desc)}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${ORIGIN}/${code}/$2`)
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(cfg.title)}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(cfg.desc)}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${ORIGIN}/${code}/$2`)
      .replace('</head>', boot);

    mkdirSync(join(DIST, code), { recursive: true });
    writeFileSync(join(DIST, code, 'index.html'), html, 'utf8');
    count++;
  }

  console.log(`[gen-seo-langs] Generados ${count} snapshots por idioma en dist/{idioma}/index.html`);

  // Snapshots por RUTA profunda (español): canónica propia por página. Sin
  // hreflang (no tienen equivalentes por idioma). El .htaccess sirve
  // dist/<ruta>.html cuando existe; si no, la ruta cae a la SPA como siempre.
  // Canónica cruzada: las páginas legales existen bajo doble slug (es + en). Para
  // evitar contenido duplicado, las variantes en español apuntan su canónica a la
  // versión en INGLÉS (la elegida como canónica oficial, ya indexada y en sitemap).
  const CANONICAL_OVERRIDE = {
    terminos: 'terms',
    privacidad: 'privacy',
  };

  let rcount = 0;
  for (const [path, cfg] of Object.entries(ROUTES)) {
    const canon = CANONICAL_OVERRIDE[path] ?? path;
    const html = src
      // Elimina el bloque de alternativas hreflang (incluido x-default): estas
      // páginas existen en una sola URL, no por idioma.
      .replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/>/g, '')
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(cfg.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(cfg.desc)}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(cfg.title)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(cfg.desc)}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${ORIGIN}/${canon}$2`)
      .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(cfg.title)}$2`)
      .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(cfg.desc)}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${ORIGIN}/${canon}$2`);

    writeFileSync(join(DIST, `${path}.html`), html, 'utf8');
    rcount++;
  }
  console.log(`[gen-seo-langs] Generados ${rcount} snapshots por ruta en dist/<ruta>.html`);

  // Snapshots por PRESTADOR (/proveedor/<id>). La causa de que decenas de fichas
  // cayeran en "Rastreada/Duplicada: Google eligió otra canónica" era que la SPA
  // les servía el index.html de la portada, cuya canónica apunta a la raíz: para
  // Googlebot todas las fichas se declaraban "la portada". Aquí generamos
  // dist/proveedor/<id>.html para cada prestador PUBLICADO, con su título,
  // descripción y canónica PROPIA. El .htaccess sirve ese archivo (regla de dos
  // segmentos). Dos segmentos => NO lo cubre la regla de un solo segmento.
  //
  // Try propio: si Supabase no responde durante el build (o faltan las claves),
  // se omite SOLO esta capa, sin tumbar los snapshots de arriba ni el despliegue.
  try {
    const SB_URL = process.env.VITE_SUPABASE_URL;
    const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY;
    if (!SB_URL || !SB_KEY) {
      console.warn('[gen-seo-langs] Sin VITE_SUPABASE_URL/ANON_KEY: se omiten los snapshots de prestadores.');
    } else {
      // Fuente = directorio_publico_seguro (la vista pública que lee el frente;
      // anon tiene SELECT). Filtro: publicadas y NO reclamables, para generar
      // snapshot SOLO de prestadores reales con dueño. Las fichas sembradas
      // (reclamable=true, is_published=false) quedan fuera a propósito: se
      // marcan noindex desde ProviderProfile, no se indexan.
      const sel = 'id,full_name,business_name,title_prefix,profession,provider_type,city,state,country,bio';
      const res = await fetch(`${SB_URL}/rest/v1/directorio_publico_seguro?select=${sel}&is_published=eq.true&reclamable=eq.false`, {
        headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` },
      });
      if (!res.ok) throw new Error(`REST ${res.status}`);
      const rows = await res.json();
      mkdirSync(join(DIST, 'proveedor'), { recursive: true });
      let pcount = 0;
      for (const p of Array.isArray(rows) ? rows : []) {
        if (!p || !p.id) continue;
        const nombre = (p.business_name || [p.title_prefix, p.full_name].filter(Boolean).join(' ') || '').trim();
        if (!nombre) continue;
        const oficio = (p.profession || p.provider_type || '').trim();
        const lugar = [p.city, p.state, p.country].filter(Boolean).join(', ');
        const title = `${[nombre, oficio].filter(Boolean).join(' — ').slice(0, 65)} | Neuromundi`;
        const bioLimpia = (p.bio || '').replace(/\s+/g, ' ').trim();
        const desc = (bioLimpia || `${nombre}${oficio ? ', ' + oficio : ''}${lugar ? ' en ' + lugar : ''}. Perfil en Neuromundi.`).slice(0, 160);
        const canonUrl = `${ORIGIN}/proveedor/${p.id}`;
        const html = src
          .replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/>/g, '')
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
          .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonUrl}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escAttr(title)}$2`)
          .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escAttr(desc)}$2`)
          .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonUrl}$2`);
        writeFileSync(join(DIST, 'proveedor', `${p.id}.html`), html, 'utf8');
        pcount++;
      }
      console.log(`[gen-seo-langs] Generados ${pcount} snapshots por prestador en dist/proveedor/<id>.html`);
    }
  } catch (e) {
    console.warn('[gen-seo-langs] AVISO: no se generaron los snapshots de prestadores:', e?.message ?? e);
  }
} catch (e) {
  console.warn('[gen-seo-langs] AVISO: no se generaron los snapshots SEO por idioma:', e?.message ?? e);
  process.exit(0); // nunca bloquear el despliegue por la capa de SEO
}
