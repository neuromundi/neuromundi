// Vuelca el contenido de los kits nuevos (nd/af, 11 idiomas) a un JSON para que
// el generador de PDFs (reportlab) lo lea. Elimina el import de tipos y la
// anotación TS, y evalúa el arreglo de datos puro.
import fs from 'fs';
import path from 'path';

const dir = 'src/data/toolkitContent';
const langs = ['es', 'en', 'pt', 'fr', 'it', 'de', 'ja', 'zh', 'ko', 'ar', 'he'];
const out = {};

for (const kit of ['nd', 'af']) {
  for (const l of langs) {
    const p = path.join(dir, `${kit}.${l}.ts`);
    let src = fs.readFileSync(p, 'utf8');
    src = src.replace(/import[^\n]*\n/, '');                 // quita import type
    src = src.replace(/export const MODULES\s*:[^=]*=/, 'return '); // export→return
    // eslint-disable-next-line no-new-func
    const modules = new Function(src)();
    out[`${kit}.${l}`] = modules;
  }
}

fs.writeFileSync('scripts/kit_content.json', JSON.stringify(out));
console.log('dumped', Object.keys(out).length, 'entradas');
