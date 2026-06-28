/* Service worker AUTODESTRUCTOR.
   El caché offline estaba dejando atascada una versión vieja en algunos
   teléfonos. Este SW borra todo lo guardado, se da de baja a sí mismo y
   recarga la página para servir SIEMPRE la versión más nueva desde la red.
   (Volveremos a activar el modo offline cuando el contenido esté final.) */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.navigate(c.url));
      } catch (e) {}
    })()
  );
});

// Sin manejador de "fetch": todo va directo a la red (siempre lo más nuevo).
