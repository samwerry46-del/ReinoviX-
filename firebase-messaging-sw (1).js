// firebase-messaging-sw.js
// Place this file at the ROOT of your GitHub Pages repo
// It MUST be named exactly "firebase-messaging-sw.js"

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCD8EOXXnWnEWgjZpbOoEOuUkH9_CO1KkY",
  authDomain: "reinovetor.firebaseapp.com",
  projectId: "reinovetor",
  storageBucket: "reinovetor.firebasestorage.app",
  messagingSenderId: "639525344900",
  appId: "1:639525344900:web:95de899c7e712b836694d1"
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage(function(payload) {
  console.log('[FCM SW] Background message received:', payload);

  const title = payload.notification?.title || 'ReinoviX Alert';
  const body  = payload.notification?.body  || 'You have a new notification.';
  const icon  = payload.notification?.icon  || '/icon-192.png';
  const data  = payload.data || {};

  const options = {
    body: body,
    icon: icon,
    badge: icon,
    tag: data.tag || 'reinovix-notif',
    data: data,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: '📂 Open App' }
    ]
  };

  return self.registration.showNotification(title, options);
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = self.registration.scope;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.startsWith(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
