/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Activate new SW immediately and claim existing clients
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

precacheAndRoute(self.__WB_MANIFEST);

// Cache region boundaries — NetworkFirst so is_connected changes appear after deploy
registerRoute(
  ({ url }) => url.pathname.includes('/geo/regions') && url.searchParams.get('include_geometry') === 'true',
  new NetworkFirst({
    cacheName: 'regions-geo-v2',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 24 * 60 * 60 }), // 1 day fallback if offline
    ],
  })
);

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, icon, badge, data } = payload;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/icon-192.png',
        badge: badge || '/icon-192.png',
        data: data || {},
      })
    );
  } catch (err) {
    console.error('Error in push event:', err);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  if (data?.related_entity_type === 'task') {
    url = `/tasks/${data.related_entity_id}`;
  } else if (data?.related_entity_type === 'location') {
    url = `/locations/${data.related_entity_id}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
