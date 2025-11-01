const CACHE_NAME = 'budget-app-cache-v3';

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

// 🪄 INSTALL — cache core assets and activate new worker immediately
self.addEventListener('install', (event) => {
  console.log('📦 Installing new service worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => console.log('✅ All assets cached successfully'))
      .catch((err) => console.error('❌ Failed to cache assets during install:', err))
  );
});

// 🧹 ACTIVATE — clean old caches & take control immediately
self.addEventListener('activate', (event) => {
  console.log('🚀 Activating new service worker...');
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
    ).then(() => self.clients.claim())
  );
});

// 🌐 FETCH — network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
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
        .catch(() => response || caches.match(`${BASE}/index.html`));

      return response || fetchPromise;
    })
  );
});

// 🧭 AUTO-UPDATE: instantly activate new service worker after deploy
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('♻️ Skip waiting triggered, activating new service worker');
    self.skipWaiting();
  }
});
