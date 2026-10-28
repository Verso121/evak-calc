// Офлайн-кэш: свои файлы — сначала сеть (чтобы обновления приходили сразу), при отсутствии сети — из кэша.
const CACHE = "evak-v8";
const SHELL = ["./", "index.html", "css/style.css", "js/cars.js", "js/pricing.js", "js/geo.js", "js/app.js",
  "manifest.webmanifest", "icons/icon-192.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  const own = u.origin === location.origin || u.hostname === "unpkg.com";
  if (!own) return; // карты, поиск, маршруты — всегда из сети
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
