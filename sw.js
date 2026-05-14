// sw.js
// Network-first strategy for HTML — ensures users always get the latest app.
// Cache-first only for static assets (images, fonts, icons).

const CACHE_NAME = 'reinovix-v4'; // bump this version whenever you deploy

// These must NEVER be cached — always go straight to network
const NEVER_CACHE = [
  'firebaseapp.com',
  'googleapis.com',
  'identitytoolkit',
  'securetoken',
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'accounts.google.com',
  'gstatic.com/firebasejs',
];

// These are safe to cache (fonts, icons, CDN libs)
const CACHE_FIRST_PATTERNS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

function shouldNeverCache(url) {
  return NEVER_CACHE.some(function(p) { return url.includes(p); });
}

function shouldCacheFirst(url) {
  return CACHE_FIRST_PATTERNS.some(function(p) { return url.includes(p); });
}

function isHtmlRequest(request) {
  var accept = request.headers.get('Accept') || '';
  return accept.includes('text/html') || request.url.endsWith('.html') || request.url.endsWith('/');
}

// Install: skip waiting so new SW activates immediately
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Activate: delete ALL old caches so stale data never serves
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          // Delete every cache including current — forces fresh load
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = event.request.url;

  // Firebase/auth: always network, never intercept
  if (shouldNeverCache(url)) return;

  // Only handle same-origin + trusted CDN requests
  if (!url.startsWith(self.location.origin) && !shouldCacheFirst(url)) return;

  // HTML pages: network-first — always get the latest app from server
  // Falls back to cache only if completely offline
  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static assets (fonts, icons, CDN libs): cache-first, update in background
  if (shouldCacheFirst(url)) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var networkFetch = fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

// Message from app: force update
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
