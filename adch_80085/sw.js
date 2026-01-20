const CACHE_NAME = "stockflux-adch_80085-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./state.js",
  "./storage.js",
  "./calc.js",
  "./ui.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./README.txt"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        // Runtime cache same-origin assets
        try {
          const url = new URL(req.url);
          if (url.origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
        } catch (_) {}
        return res;
      }).catch(() => cached)
    )
  );
});
