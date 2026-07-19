/**
 * Punto de entrada. Carga i18n antes de la app y la monta en AppProviders.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/i18n';
import { AppProviders } from '@/AppProviders';
import { App } from '@/App';
import './styles/globals.css';
import { initA11y } from '@/stores/a11yStore';
import { initTheme } from '@/stores/themeStore';

initA11y();
initTheme();

// Tras un nuevo despliegue, una pestaña abierta puede tener referencias a chunks
// con hash antiguo que ya no existen. Si un import dinámico falla, recargamos una
// sola vez para tomar el index.html nuevo (con los hashes correctos).
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('nm-chunk-reloaded')) {
    sessionStorage.setItem('nm-chunk-reloaded', '1');
    window.location.reload();
  }
});

// Registro del service worker con manejo de error. Algunos entornos (p. ej. el
// robot de verificación de Google) bloquean los service workers; ahí el registro
// falla y, si no se captura, queda como "Uncaught (in promise)" y puede hacer que
// la página se considere fallida. Lo registramos de forma segura y silenciosa.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* entorno sin soporte/permite SW: ignorar sin romper la app */
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
