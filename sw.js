/* Service Worker de Nuestra Galaxia
   - Archivos de la app: PRIMERO la red (para ver siempre lo más nuevo),
     y si no hay internet, lo guardado.
   - Librerías, fuentes, fotos y videos: PRIMERO lo guardado (no cambian). */
const CACHE = "galaxia-v3";

const CORE = [
  "./",
  "index.html",
  "styles.css",
  "main.js",
  "astros.js",
  "effects.js",
  "content.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-180.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // App: primero la red (lo más nuevo), guardando copia; si no hay red, lo guardado
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("index.html") : r))
        )
    );
    return;
  }

  // Externos (three.js, fuentes, fotos, videos): primero lo guardado; si no, red
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
    })
  );
});
