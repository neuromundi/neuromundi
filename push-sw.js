/* Manejo de Web Push nativo. Se importa dentro del service worker de Workbox
   (vite-plugin-pwa) vía workbox.importScripts. Muestra la notificación y, al
   hacer clic, enfoca o abre la app. */
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_e) { payload = {}; }
  const title = payload.title || 'Neuromundi';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    tag: (payload.data && payload.data.tag) || undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
