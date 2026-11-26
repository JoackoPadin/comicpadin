// Service worker: permite abrir la app sin conexión y guarda las portadas ya vistas.
const APP_CACHE = 'coleccion-comics-app-v3';
const COVER_CACHE = 'comicpadin-covers-v1';
const COVER_HOSTS = ['books.google.com', 'books.googleusercontent.com', 'covers.openlibrary.org', 'archive.org'];
const SHELL = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './coleccion-inicial.json'];

// Al instalar, guarda la página y todos los archivos que enlaza (JS/CSS con nombre cambiante)
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll(SHELL);
    try {
      const html = await (await fetch('./', { cache: 'no-cache' })).text();
      const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll(assets);
    } catch { /* se guardarán al usarse */ }
  })());
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

  // Portadas de internet: primero caché, si no, red (y se guarda)
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

  // Archivos de la app: primero red (para recibir actualizaciones); sin conexión, caché
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(APP_CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('./') : Response.error())));
  }
});
