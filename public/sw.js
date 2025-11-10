// This is a basic service worker for handling push notifications.

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  // Skip waiting to ensure the new service worker activates immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  // Take control of all clients as soon as the service worker activates.
  event.waitUntil(self.clients.claim());
});

// The 'notificationclick' event is fired when a user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
  console.log('On notification click: ', event.notification.tag);
  event.notification.close();

  // This opens the app to the root URL.
  // You can customize this to open a specific page.
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// The 'push' event is for push notifications from a server, which we are not using.
// The notifications in this app are scheduled locally from the client-side code.
// The self.registration.showNotification() is called directly from the app's main script.
// Therefore, we don't need a 'push' event listener for this use case.
