// Service worker: permite abrir la app sin conexión y guarda las portadas ya vistas.
const APP_CACHE = 'comicpadin-app-v1';
const COVER_CACHE = 'comicpadin-covers-v1';
const COVER_HOSTS = ['books.google.com', 'books.googleusercontent.com', 'covers.openlibrary.org', 'archive.org'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icon.svg'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => ![APP_CACHE, COVER_CACHE].includes(k)).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Portadas: primero caché, si no, red (y se guarda)
  if (req.destination === 'image' && COVER_HOSTS.some((h) => url.hostname.endsWith(h))) {
    e.respondWith(caches.open(COVER_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  // Archivos de la app: primero red (para recibir actualizaciones), si no hay conexión, caché
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) caches.open(APP_CACHE).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./'))));
  }
});
