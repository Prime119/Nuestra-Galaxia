/* Service Worker de Nuestra Galaxia
   Guarda la app (y lo que se va viendo) para poder abrirla sin internet. */
const CACHE = "galaxia-v1";

// Archivos base que se guardan al instalar
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
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Navegación (abrir la página): primero red, si no hay, lo guardado
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Resto (scripts, fuentes, fotos, videos): primero lo guardado, si no, red (y se guarda)
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
