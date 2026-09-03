/* EMIL Trade service worker — deliberately minimal and SAFE for a live trading
 * terminal. It exists to make the app installable (PWA) and to provide an
 * offline fallback page. It NEVER serves stale application data:
 *   - API / data requests: passthrough only (never cached, never intercepted).
 *   - Navigations: network-first; only if the network fails do we show the
 *     cached offline fallback. A successful response is always the live one.
 *   - Static icons/manifest: cache-first (safe, immutable-ish assets).
 * There is intentionally no caching of HTML/JS/JSON responses, so a deploy is
 * picked up immediately on the next network fetch. */

const CACHE = 'emil-trade-shell-v1';
const PRECACHE = ['/offline.html', '/raptor-logo.png', '/emil-trade-mark.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // never touch cross-origin (quotes, APIs, TV)
  if (url.pathname.startsWith('/api')) return;             // never intercept data

  // Navigations: network-first, offline.html as last resort. Always live when online.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // Only these static assets are served cache-first.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
