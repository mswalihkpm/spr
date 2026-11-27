const CACHE_NAME = 'spr-madin-v6';
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
  '/logo.png',
  '/optimized/logo.webp'
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

  // 2. Immutable Hashed Static Bundles & Optimized Assets -> Pure Cache-First (0 CDN calls on repeat visits)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/optimized/') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.webm') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone).catch(() => {});
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Mutable Static Assets (icons, manifest) -> Stale-While-Revalidate
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
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

// =============================================================================
// Push Notification Handlers (SPR Push Notification System - Phase B)
// =============================================================================

/**
 * Validates and sanitizes a deep-link URL to ensure it is strictly an internal,
 * same-origin relative path or same-origin URL. Rejects external schemes, protocol-relative
 * URLs, and dangerous URIs (javascript:, data:, etc.).
 */
function sanitizeInternalUrl(rawUrl) {
  const fallback = '/student/dashboard';
  if (!rawUrl || typeof rawUrl !== 'string') {
    return fallback;
  }

  const trimmed = rawUrl.trim();

  // Reject control characters, backslashes, or empty strings
  if (!trimmed || /[\x00-\x1F\x7F]/.test(trimmed) || trimmed.includes('\\')) {
    return fallback;
  }

  // Reject scheme-relative or pseudo-protocols
  if (trimmed.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(trimmed)) {
    return fallback;
  }

  // Multi-level decoding check to catch %2e%2e directory traversal
  let decoded = trimmed;
  for (let i = 0; i < 3; i++) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      return fallback;
    }
  }

  if (decoded.includes('..') || decoded.includes('\\') || /[\x00-\x1F\x7F]/.test(decoded)) {
    return fallback;
  }

  // Relative path starting with '/'
  if (trimmed.startsWith('/')) {
    try {
      const parsed = new URL(trimmed, self.location.origin);
      if (parsed.origin === self.location.origin) {
        const pathPart = parsed.pathname;
        if (pathPart === '/student' || pathPart.startsWith('/student/')) {
          return pathPart + parsed.search + parsed.hash;
        }
      }
    } catch {
      return fallback;
    }
  }

  // Absolute URL matching self origin
  try {
    const parsed = new URL(trimmed);
    if (parsed.origin === self.location.origin) {
      const pathPart = parsed.pathname;
      if (pathPart === '/student' || pathPart.startsWith('/student/')) {
        return pathPart + parsed.search + parsed.hash;
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

/**
 * Parses and sanitizes incoming push event payloads.
 * Supports standard Firebase Cloud Messaging Admin SDK payloads, data payloads,
 * and standard Web Push formats with safe defaults.
 */
function parsePushPayload(event) {
  const fallback = {
    title: 'SPR Madin Notification',
    body: 'You have a new update in your student portal.',
    url: '/student/dashboard',
    tag: 'spr-notification',
    category: 'GENERAL'
  };

  if (!event || !event.data) {
    return fallback;
  }

  let data = {};
  try {
    data = event.data.json() || {};
  } catch {
    const text = event.data.text() || '';
    return {
      title: fallback.title,
      body: text.replace(/<[^>]*>/g, '').trim().slice(0, 500) || fallback.body,
      url: fallback.url,
      tag: fallback.tag,
      category: fallback.category
    };
  }

  const rawNotification = data.notification || {};
  const customData = data.data || {};

  const rawTitle = rawNotification.title || customData.title || data.title || fallback.title;
  const rawBody = rawNotification.body || customData.body || data.body || fallback.body;
  const rawUrl = customData.url || customData.deepLink || rawNotification.click_action || data.url || fallback.url;
  const rawTag = customData.tag || rawNotification.tag || data.tag || fallback.tag;
  const rawCategory = customData.category || data.category || fallback.category;

  const safeTitle = String(rawTitle).replace(/<[^>]*>/g, '').trim().slice(0, 100) || fallback.title;
  const safeBody = String(rawBody).replace(/<[^>]*>/g, '').trim().slice(0, 500) || fallback.body;
  const safeUrl = sanitizeInternalUrl(rawUrl);
  const safeTag = String(rawTag).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || fallback.tag;

  return {
    title: safeTitle,
    body: safeBody,
    url: safeUrl,
    tag: safeTag,
    category: String(rawCategory).slice(0, 30)
  };
}

// Push event handler: receives background Web Push / FCM notifications
self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an active, focused client window is visible on screen
      const focusedClient = windowClients.find((client) => client.focused);

      if (focusedClient) {
        // Post message to focused client for in-app toast / onMessage handling
        focusedClient.postMessage({
          isFirebaseMessaging: true,
          messageType: 'push-received',
          data: {
            title: payload.title,
            body: payload.body,
            url: payload.url,
            tag: payload.tag,
            category: payload.category
          }
        });
        // Do NOT call showNotification to avoid duplicate notifications when user is actively in the app
        return;
      }

      // Background or locked device: display native system notification
      const options = {
        body: payload.body,
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        tag: payload.tag,
        renotify: true,
        data: {
          url: payload.url,
          category: payload.category,
          dateOfArrival: Date.now()
        },
        vibrate: [200, 100, 200]
      };

      return self.registration.showNotification(payload.title, options);
    })
  );
});

// Notification click handler: closes notification and securely navigates/focuses client
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification.data && event.notification.data.url;
  const targetPath = sanitizeInternalUrl(rawUrl);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window on the same origin if available
      for (const client of windowClients) {
        if (client.url && client.url.startsWith(self.location.origin)) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then((navigatedClient) => {
              const targetToFocus = navigatedClient || client;
              if ('focus' in targetToFocus) {
                return targetToFocus.focus();
              }
            }).catch(() => {
              if ('focus' in client) {
                return client.focus();
              }
            });
          }
          if ('focus' in client) {
            return client.focus();
          }
          return;
        }
      }

      // If no window is currently open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

