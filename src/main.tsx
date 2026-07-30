/**
 * Punto de entrada. Carga i18n antes de la app y la monta en AppProviders.
 */
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { initI18n } from '@/i18n';
import { AppProviders } from '@/AppProviders';
import { App } from '@/App';
import './styles/globals.css';
import { initA11y } from '@/stores/a11yStore';
import { initTheme } from '@/stores/themeStore';

initA11y();
initTheme();

// ── Actualización de la PWA ────────────────────────────────────────────────
// Objetivo: que el usuario SIEMPRE vea la versión recién publicada sin quedarse
// con una copia vieja en caché, y sin recargas en bucle.
//
// Guarda anti-bucle compartida: permite recargar de nuevo si ha pasado tiempo
// suficiente (un despliegue posterior en la misma sesión debe poder recargar),
// pero nunca dos veces seguidas en pocos segundos.
const RELOAD_KEY = 'nm-last-reload';
const RELOAD_COOLDOWN_MS = 15000;

function reloadOnce(reason: string): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* almacenamiento no disponible: recargamos igual, una vez */
  }
  console.info('[pwa] recargando:', reason);
  window.location.reload();
}

// Tras un nuevo despliegue, una pestaña abierta puede referenciar chunks con
// hash antiguo que ya no existen. Si un import dinámico falla, recargamos para
// tomar el index.html nuevo (con los hashes correctos).
window.addEventListener('vite:preloadError', () => reloadOnce('chunk no encontrado'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Busca versión nueva al abrir, cada 30 min y al volver a la pestaña.
        // Sin esto, una pestaña abierta muchas horas nunca se entera.
        const check = () => { void reg.update().catch(() => {}); };
        check();
        setInterval(check, 30 * 60 * 1000);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
      })
      .catch(() => {
        /* entorno sin soporte/permiso de SW: ignorar sin romper la app */
      });

    // Cuando el SW nuevo toma el control (skipWaiting + clientsClaim), la página
    // sigue ejecutando el código viejo. Recargamos para quedar coherentes: es
    // una sola recarga limpia en vez de errores sueltos de chunks.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      reloadOnce('service worker actualizado');
    });
  });
}

// Se espera al diccionario del idioma detectado antes de montar: así nadie ve
// claves sin traducir, y a cambio el bundle ya no carga los 8 idiomas (~900 KiB
// de JSON) sino solo el que se usa.
// Si la portada viene PRERENDERIZADA (react-snap deja el HTML del app en #root,
// sin el fallback SEO marcado con data-nm-shell), hidratamos en lugar de
// re-renderizar: así el LCP ya está pintado en el HTML y React solo lo "adopta".
const rootEl = document.getElementById('root')!;
const prerendered = rootEl.hasChildNodes() && !rootEl.querySelector('[data-nm-shell]');

void initI18n().then(() => {
  const tree = (
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  );
  if (prerendered) hydrateRoot(rootEl, tree);
  else createRoot(rootEl).render(tree);
});
