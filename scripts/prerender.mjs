/**
 * prerender — genera el HTML estático de la portada tras `vite build` usando
 * react-snap (Chromium headless). Así el LCP se pinta durante el parse del HTML
 * en lugar de esperar a que React monte (baja el "retraso en la renderización").
 *
 * OPT-IN: se ejecuta con `npm run build:prerender`, no en el build normal. Es
 * NO FATAL: si react-snap falla (p. ej. no puede lanzar Chromium en el entorno),
 * avisa y termina con éxito para no romper el despliegue —solo te quedas sin
 * prerender—. Requiere: `npm i -D react-snap` (descarga Chromium la 1.ª vez).
 *
 * Guardas ya aplicadas en el código para el prerender:
 *  · El splash de intro (WelcomeVideo) no se muestra bajo user-agent 'ReactSnap'.
 *  · main.tsx hidrata (hydrateRoot) cuando detecta HTML prerenderizado.
 *
 * Nota: el HTML se captura en el idioma por defecto del headless (inglés); el
 * cliente cambia al idioma del usuario al hidratar. Verifica la portada tras
 * generarla antes de usarla en producción.
 */
let run;
try {
  ({ run } = await import('react-snap'));
} catch {
  console.warn('[prerender] react-snap no está instalado (npm i -D react-snap). Omitido.');
  process.exit(0);
}

try {
  await run({
    source: 'dist',
    include: ['/', '/fundadores'], // portada + fundadores, para acotar riesgo
    inlineCss: false,
    skipThirdPartyRequests: true, // no dispares Supabase/analytics durante el snapshot
    puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  process.exit(0);
} catch (e) {
  console.warn('[prerender] omitido:', e && e.message ? e.message : e);
  process.exit(0); // NO fatal: el despliegue sigue con la SPA normal
}
