/**
 * gen_i18n_critical — genera src/i18n/critical/{lang}.crit.json con SOLO los
 * namespaces que se pintan en el primer render de la portada (encabezado, home,
 * pie e intro). initI18n carga ESTE chunk pequeño primero (precargado desde
 * index.html) y monta la app sin esperar el diccionario completo (~2.7k claves);
 * el resto se fusiona en segundo plano. Se ejecuta en cada `npm run build`, así
 * que se mantiene en sincronía con los locales automáticamente.
 */
import fs from 'node:fs';
import path from 'node:path';

const CRITICAL = [
  'common', 'nav', 'home', 'access', 'footer', 'followUs', 'lang', 'a11y',
  'intro', 'meta', 'notif', 'pwa', 'push', 'support', 'improve', 'report',
  // La portada también pinta la invitación al Kit y el título de aliados en el
  // primer render → sin estos, se veían las claves crudas (kit.home.title…).
  'kit', 'allies',
  // El héroe muestra los nombres de las tres secciones en el primer render.
  'sections',
  // 20 oct 2026: faltaban TODOS estos y la portada enseñaba claves crudas
  // (`counters.countries`, `ally.title`…) mientras llegaba el diccionario
  // completo. La lista se mantenía a mano y nadie comprobaba que siguiera
  // cubriendo lo que la portada pinta; ahora sí: `npm run revisar:textos`
  // reclama cualquier clave de la portada que se quede fuera.
  'counters', 'ally', 'events',
  // La banda de distintivos de la portada.
  'memberBadges',
  // El aviso de cuota de la cáscara, para quien entra con sesión y debe pagar.
  'membership',
];

/**
 * Claves SUELTAS que la portada pinta de espacios de nombres grandes. Se
 * añaden una a una para no arrastrar el espacio entero: `info` pesa 3.3 KB y la
 * portada sólo usa su título.
 */
const CRITICAL_KEYS = [
  'info.title',
  'lms.tab',
  'shop.title',
  // Pestañas de la cáscara y enlaces del pie, visibles en el primer pintado.
  'registry.title',
  'school.title',
  'auth.privacy',
  'auth.terms',
];

const locDir = 'src/i18n/locales';
const outDir = 'src/i18n/critical';
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
for (const f of fs.readdirSync(locDir).filter((f) => f.endsWith('.json'))) {
  const lang = f.replace('.json', '');
  const full = JSON.parse(fs.readFileSync(path.join(locDir, f), 'utf8'));
  const crit = {};
  for (const ns of CRITICAL) if (ns in full) crit[ns] = full[ns];
  for (const clave of CRITICAL_KEYS) {
    const partes = clave.split('.');
    let origen = full;
    let destino = crit;
    let ok = true;
    for (let i = 0; i < partes.length - 1; i += 1) {
      origen = origen?.[partes[i]];
      if (origen == null) { ok = false; break; }
      destino[partes[i]] = destino[partes[i]] ?? {};
      destino = destino[partes[i]];
    }
    const ultima = partes[partes.length - 1];
    if (ok && origen && ultima in origen) destino[ultima] = origen[ultima];
  }
  const out = path.join(outDir, `${lang}.crit.json`);
  fs.writeFileSync(out, JSON.stringify(crit) + '\n');
  total += Buffer.byteLength(JSON.stringify(crit));
}
console.log(`i18n critical: ${fs.readdirSync(outDir).length} archivos, media ~${Math.round(total / 11 / 1024)} KB/idioma`);
