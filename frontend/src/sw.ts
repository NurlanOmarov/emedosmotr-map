/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

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
