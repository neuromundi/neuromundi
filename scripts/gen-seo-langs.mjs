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
} catch (e) {
  console.warn('[gen-seo-langs] AVISO: no se generaron los snapshots SEO por idioma:', e?.message ?? e);
  process.exit(0); // nunca bloquear el despliegue por la capa de SEO
}
