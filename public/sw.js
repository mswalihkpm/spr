const CACHE_NAME = 'spr-madin-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/pwa-logo.png',
  '/logo.png'
];

// Install: Cache critical assets with individual error resilience
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use individual caching so one missing asset never fails SW installation
      await Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`PWA SW: Could not pre-cache ${asset}:`, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: Clean up previous cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Support instant update triggers from client app
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Fetch event handler with smart routing
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore cross-origin, chrome-extension, and dynamic API/auth routes
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/image')) return;

  // 1. Navigation requests (HTML pages) -> Network-First with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const homeCached = await caches.match('/');
          if (homeCached) return homeCached;
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>SPR Madin — Offline</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #0A2540; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
                h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #F59E0B; }
                p { font-size: 14px; color: #94A3B8; max-width: 380px; line-height: 1.5; }
                button { margin-top: 20px; padding: 12px 24px; background: #F59E0B; color: #020617; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; }
              </style>
            </head>
            <body>
              <h1>You are currently offline</h1>
              <p>Please check your internet connection to access real-time SPR student analytics and live updates.</p>
              <button onclick="window.location.reload()">Retry Connection</button>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 2. Static Assets (icons, fonts, static builds) -> Stale-While-Revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});
