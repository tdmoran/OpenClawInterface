/// Service Worker for OpenClaw Dashboard PWA
/// Cache-first for static assets, network-first for API/navigation

const CACHE_VERSION = 'v1';
const CACHE_NAME = `openclaw-${CACHE_VERSION}`;

// Static assets to pre-cache during install
const PRECACHE_URLS = [
  '/dashboard',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ---------- Install ----------
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Install complete, skipping wait');
        return self.skipWaiting();
      })
  );
});

// ---------- Activate ----------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// ---------- Fetch ----------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip WebSocket and chrome-extension requests
  if (
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // Network-first: API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first: static assets under /_next/static/, icons, fonts, images
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot|css|js)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first: page navigations
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request));
});

// ---------- Message handling for updates ----------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting requested by client');
    self.skipWaiting();
  }
});

// ---------- Strategies ----------

/**
 * Cache-first: serve from cache, fall back to network (and update cache).
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

/**
 * Network-first: try network, fall back to cache.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 408, statusText: 'Offline' });
  }
}

/**
 * Network-first for navigations with offline fallback to cached /dashboard shell.
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try to return the cached version of the requested page
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fall back to cached /dashboard shell
    const dashboardCached = await caches.match('/dashboard');
    if (dashboardCached) return dashboardCached;

    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline — OpenClaw Dashboard</title></head>' +
        '<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;' +
        'background:#09090b;color:#fafafa;font-family:system-ui,sans-serif;">' +
        '<div style="text-align:center"><h1>You are offline</h1>' +
        '<p>OpenClaw Dashboard will be back when your connection is restored.</p></div>' +
        '</body></html>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
