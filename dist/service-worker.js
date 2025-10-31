const CACHE_NAME = 'budget-app-cache-v2';

// Dynamically detect your GitHub Pages base path.
// e.g. -> "" on localhost or "/LolerasDesigns-Budget-App" on production
const BASE = self.registration.scope
  .replace(self.origin, '')
  .replace(/\/$/, '');

// ✅ Only include files that actually exist in /dist after build.
const URLS_TO_CACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/index.css`,
  `${BASE}/manifest.json`,
  `${BASE}/locales/en.json`,
  `${BASE}/locales/el.json`,
  `${BASE}/assets/icon-192.svg`,
  `${BASE}/assets/icon-512.svg`,
  // External resources (won’t 404)
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache, caching assets:', URLS_TO_CACHE);
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => console.log('✅ All assets cached successfully'))
      .catch((err) => {
        console.error('❌ Failed to cache assets during install:', err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // 🧭 Serve cached
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Skip non-OK or opaque responses
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((err) => {
          console.warn('Fetch failed; returning offline response if available', err);
          return caches.match(`${BASE}/index.html`);
        });
    })
  );
});

self.addEventListener('activate', (event) => {
  const whitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (!whitelist.includes(name)) {
            console.log('🧹 Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      )
    )
  );
});
