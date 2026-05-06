// sw.js
// Place this file at the ROOT of your GitHub Pages repo
// Handles: PWA caching (offline support) + coordinates with FCM

const CACHE_NAME = 'reinovix-v2';
const OFFLINE_URLS = ['/ReinoviX-/', '/ReinoviX-/index.html'];

// URLs that should NEVER be cached (auth, Firestore, Firebase)
const NEVER_CACHE = [
  'firebaseapp.com',
  'googleapis.com',
  'identitytoolkit',
  'securetoken',
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'accounts.google.com',
];

function shouldNeverCache(url) {
  return NEVER_CACHE.some(function(pattern) { return url.includes(pattern); });
}

// Install: cache the app shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(OFFLINE_URLS).catch(function() {
        // Silently fail if URLs not found (dev mode)
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  // Only handle GET requests to same origin
  if (event.request.method !== 'GET') return;

  var url = event.request.url;

  // Never intercept Firebase auth or Firestore requests
  // These MUST always go to the network so auth state is always fresh
  if (shouldNeverCache(url)) return;

  if (!url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var networkFetch = fetch(event.request).then(function(response) {
        // Cache fresh responses
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
      // Return cache immediately if available, update in background
      return cached || networkFetch;
    })
  );
});

// Message from app: skip waiting on update
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
