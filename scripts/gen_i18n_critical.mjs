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
  const out = path.join(outDir, `${lang}.crit.json`);
  fs.writeFileSync(out, JSON.stringify(crit) + '\n');
  total += Buffer.byteLength(JSON.stringify(crit));
}
console.log(`i18n critical: ${fs.readdirSync(outDir).length} archivos, media ~${Math.round(total / 11 / 1024)} KB/idioma`);
