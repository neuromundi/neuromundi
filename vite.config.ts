import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * preloadLocaleChunk — precarga el diccionario del idioma EN PARALELO al bundle.
 *
 * El problema que resuelve: los idiomas son chunks aparte (bien, así no viajan
 * los 8), pero el navegador no sabe cuál pedir hasta que descarga Y ejecuta
 * index.js, que es cuando se evalúa el `import()` dinámico. Eso encadenaba
 *
 *     index.html → index.js (692 ms) → en-xxxx.js (1,035 ms) → React monta
 *
 * y explicaba los ~1.9 s de "retraso en la renderización del elemento" del LCP
 * en móvil: la imagen del héroe ya estaba descargada, pero no había React que
 * la pintara.
 *
 * La solución: en tiempo de compilación conocemos el nombre con hash de cada
 * chunk de idioma. Inyectamos un script diminuto en el <head> que aplica la
 * MISMA regla de detección que `src/i18n/index.ts` y añade un
 * <link rel="modulepreload">. Así el diccionario se descarga a la vez que el
 * bundle en vez de después, y las dos peticiones dejan de ir en fila.
 *
 * OJO: la regla de idioma está duplicada aquí a propósito (este código corre en
 * Node al compilar y no puede importar el TS de la app). Si cambias
 * `resolveInitialLanguage` o `STORAGE_KEY` en src/i18n/index.ts, cámbialo aquí.
 * Si el preload apuntara al idioma equivocado no se rompe nada: solo se
 * desperdicia una descarga.
 */
function preloadLocaleChunk(): Plugin {
  const CHUNK_RE = /^assets\/(es|en|fr|de|it|pt|ja|zh)-[A-Za-z0-9_-]+\.js$/;
  return {
    name: 'nm-preload-locale-chunk',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      if (!ctx.bundle) return html;
      const map: Record<string, string> = {};
      for (const file of Object.keys(ctx.bundle)) {
        const m = CHUNK_RE.exec(file);
        if (m) map[m[1]] = `/${file}`;
      }
      if (Object.keys(map).length === 0) {
        // Si Vite cambia el nombre de los chunks, avisamos en vez de regresar
        // en silencio al encadenamiento lento.
        console.warn('[nm-preload-locale-chunk] no se encontró ningún chunk de idioma; revisa el patrón de nombres.');
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: 'script',
            // Al final del <head>, no al principio: así el navegador descubre
            // ANTES el preload de la imagen del héroe (el elemento LCP) y el
            // diccionario no le compite por el primer hueco de la cola.
            injectTo: 'head',
            children:
              `(function(){var M=${JSON.stringify(map)};var s=null;` +
              `try{s=localStorage.getItem('neuro.lang')}catch(e){}` +
              `var l=(s&&M[s])?s:((navigator.language||'en').toLowerCase().indexOf('es')===0?'es':'en');` +
              `var h=M[l];if(!h)return;` +
              `var k=document.createElement('link');k.rel='modulepreload';k.href=h;` +
              `document.head.appendChild(k)})();`,
          },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    preloadLocaleChunk(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Neuromundi',
        short_name: 'Neuromundi',
        description:
          'Directorio de servicios amigables para familias neurodivergentes',
        theme_color: '#0ea5e9',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // El navegador solo descarga UNA variante del héroe según su pantalla:
        // precachear las cinco desperdicia ~331 KB. Ya tienen caché HTTP de un
        // año gracias al nombre versionado (-v1).
        globIgnores: ['hero/**'],
        // Manejador de Web Push nativo (public/push-sw.js) importado en el SW.
        importScripts: ['/push-sw.js'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // No usar index.html como respaldo para peticiones de /assets/ ni del SW:
        // si un chunk falta, debe fallar como tal (no recibir HTML).
        navigateFallbackDenylist: [/^\/assets\//, /^\/sw\.js$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Pre-empaqueta las dependencias (sobre todo las que se cargan en rutas lazy)
  // para que el optimizador de Vite no las descubra de a poco y recargue cada
  // vez que entras a una página nueva.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'zustand',
      'i18next',
      'react-i18next',
      '@supabase/supabase-js',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'recharts',
      'leaflet',
      'react-leaflet',
      'react-leaflet-cluster',
      'html5-qrcode',
      'qrcode.react',
    ],
  },
});
