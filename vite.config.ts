import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
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
