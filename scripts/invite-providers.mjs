#!/usr/bin/env node
/**
 * invite-providers.mjs
 *
 * Genera enlaces de primera-contraseña (recovery) para los proveedores
 * importados de México (membership_status = 'exempt', role = 'provider').
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/invite-providers.mjs
 *
 * Opciones de entorno:
 *   DRY_RUN=1            — Lista los correos sin generar ni enviar nada.
 *   REDIRECT_URL=https://  — Destino después de que el usuario pone contraseña.
 *                           Por defecto: https://www.neuromundi.com/ajustes
 *                           OJO: SIEMPRE el dominio con www (es el canónico; el
 *                           apex redirige, pero no dependas de ello aquí).
 *   RATE=6               — Enlaces por minuto. generateLink NO manda correo, así
 *                          que esto solo cuida el límite de la Admin API.
 *   OUTPUT=links.csv     — Guarda email,link,error en un CSV.
 *                          Si no se define, imprime en consola.
 *
 * Require: @supabase/supabase-js v2  (npm install @supabase/supabase-js)
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, appendFileSync, existsSync } from 'fs';

// ── Configuración ──────────────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.SUPABASE_URL     ?? '';
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_KEY ?? '';
const REDIRECT_URL     = process.env.REDIRECT_URL     ?? 'https://www.neuromundi.com/ajustes';
const DRY_RUN          = process.env.DRY_RUN === '1';
const RATE             = parseInt(process.env.RATE ?? '6', 10); // por minuto
const OUTPUT           = process.env.OUTPUT ?? '';              // '' = sólo consola

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Faltan SUPABASE_URL y/o SUPABASE_SERVICE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GAP_MS = Math.ceil(60_000 / RATE); // ms entre llamadas

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function initCsv(path) {
  if (!existsSync(path)) writeFileSync(path, 'email,link,error\n', 'utf8');
}
function writeCsv(path, email, link, error) {
  const safe = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  appendFileSync(path, `${safe(email)},${safe(link)},${safe(error)}\n`, 'utf8');
}

// ── 1. Obtener proveedores exempt ──────────────────────────────────────────────
//
// `profiles` NO tiene columna email: el correo vive en auth.users y solo se
// alcanza con la service key vía la Admin API. Por eso son dos pasos —
// perfiles por un lado, correos por el otro, y se cruzan por id.
async function fetchAuthEmails() {
  const map = new Map();
  // OJO: la Admin API TOPA el tamaño de pagina del lado del servidor, asi que
  // pedir 1000 no garantiza recibir 1000. Cortar con `users.length < perPage`
  // dejaba fuera casi todo el padron: la unica senal fiable de fin es una
  // pagina VACIA.
  const perPage = 200;
  for (let page = 1; page <= 500; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Auth error: ${error.message}`);
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) if (u.email) map.set(u.id, u.email);
  }
  return map;
}

async function fetchProviders() {
  log('Obteniendo proveedores (membership_status=exempt, role=provider)…');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, business_name')
    .eq('membership_status', 'exempt')
    .eq('role', 'provider')
    .order('id');

  if (error) throw new Error(`DB error: ${error.message}`);

  log('Resolviendo correos desde auth.users…');
  const emails = await fetchAuthEmails();
  log(`Correos resueltos en auth.users: ${emails.size}`);

  const out = (data ?? []).map((p) => ({ ...p, email: emails.get(p.id) ?? null }));
  const sinEmail = out.filter((p) => !p.email).length;
  // Si falta el correo de CASI TODOS, el problema es la lectura de auth.users,
  // no los datos: abortar en vez de reportar 233 fallos uno por uno.
  if (out.length > 0 && sinEmail === out.length) {
    throw new Error('Ningun proveedor resolvio correo: revisa la lectura de auth.users.');
  }
  if (sinEmail > 0) log(`⚠️  ${sinEmail} de ${out.length} sin correo.`);
  return out;
}

// ── 2. Generar enlace de recuperación (= primera contraseña) ───────────────────
async function generateLink(email) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: REDIRECT_URL },
  });
  if (error) return { link: null, error: error.message };
  return { link: data.properties?.action_link ?? null, error: null };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const providers = await fetchProviders();
  log(`Total a procesar: ${providers.length} proveedores`);

  if (DRY_RUN) {
    log('DRY_RUN activo — no se generarán enlaces.');
    // Los proveedores empresa suelen traer business_name y no full_name.
    providers.forEach((p) => console.log(`  ${p.email ?? '(sin email)'}  ${p.full_name || p.business_name || ''}`));
    return;
  }

  if (OUTPUT) initCsv(OUTPUT);

  let ok = 0, fail = 0;

  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const email = p.email;

    if (!email) {
      log(`⚠️  #${i + 1} sin email — id=${p.id} — omitido`);
      fail++;
      if (OUTPUT) writeCsv(OUTPUT, '', '', 'sin email');
      continue;
    }

    const { link, error } = await generateLink(email);

    if (error) {
      log(`❌  [${i + 1}/${providers.length}] ${email} — ${error}`);
      fail++;
      if (OUTPUT) writeCsv(OUTPUT, email, '', error);
    } else {
      ok++;
      if (OUTPUT) {
        writeCsv(OUTPUT, email, link, '');
      } else {
        console.log(`${email}\t${link}`);
      }
      if ((i + 1) % 50 === 0) log(`✅  ${i + 1}/${providers.length} procesados (ok=${ok}, error=${fail})`);
    }

    // Respetar tasa — excepto el último
    if (i < providers.length - 1) await sleep(GAP_MS);
  }

  log(`Listo. ok=${ok}, errores=${fail}`);
  if (OUTPUT) log(`Resultados guardados en: ${OUTPUT}`);
}

main().catch((err) => { console.error('Error fatal:', err); process.exit(1); });
