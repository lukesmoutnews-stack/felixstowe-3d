// Service worker for the installable app: the app shell is cached on install; map data and the
// 3D engine are cached as they are used (stale-while-revalidate), so revisits load quickly and the
// town still opens with a weak signal. Game progress lives in localStorage, not in this cache.
const CACHE = 'fxmayor-v1';
const SHELL = ['mayor.html', 'mayor.webmanifest', 'icons/mayor-icon.svg', 'icons/mayor-192.png', 'src/mayor/mayor.css', 'src/mayor/app.js', 'src/mayor/engine.js', 'src/mayor/content.js', 'src/mayor/config.js', 'src/mayor/checkin.js', 'src/mayor/store.js', 'src/mayor/screens.js', 'src/mayor/art.js', 'src/mayor/checkin-ui.js', 'src/mayor/admin.js', 'src/mayor/world-layer.js', 'vendor/qr/qrcode.js', 'vendor/qr/jsQR.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url); if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
