// ============================================================
// SERVICE WORKER — Linkboard
// Offline caching + Web Push notification handler
// ============================================================

const CACHE_NAME = 'linkboard-v6';

const PRECACHE_URLS = [
  '/dashboard.html',
  '/manifest.json',
  '/icon.png'
];

// ---- Install: pre-cache core assets ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ---- Activate: clean up old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- Fetch: cache-first strategy ----
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isCoreAsset =
    event.request.mode === 'navigate' ||
    PRECACHE_URLS.includes(url.pathname) ||
    url.pathname === '/service-worker.js';

  if (isCoreAsset) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('/dashboard.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

// ---- Push: show a notification when a push event arrives ----
self.addEventListener('push', event => {
  let data = { title: 'Linkboard Reminder', body: '' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'linkboard-reminder',   // collapses duplicate reminders
      renotify: true,
      data: { url: '/dashboard.html' }
    })
  );
});

// ---- Notification click: focus or open the app ----
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/dashboard.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('dashboard'));
      if (existing) return existing.focus();
      return clients.openWindow(targetUrl);
    })
  );
});
