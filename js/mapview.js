// Карта: Яндекс (если есть ключ и API загрузился), иначе OpenStreetMap (Leaflet).
// Единый интерфейс: setView, marker, line, refresh, provider.
(function (root) {
  const COLORS = { a: "#3ecf8e", b: "#ff6b4a", route: "#f5b301" };
  const START = { lat: 45.04, lon: 38.98, zoom: 8 }; // Краснодарский край

  function loadYandex(key, timeoutMs) {
    return new Promise((resolve, reject) => {
      if (!key) return reject(new Error("нет ключа"));
      const t = setTimeout(() => reject(new Error("таймаут")), timeoutMs);
      const s = document.createElement("script");
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
      s.onerror = () => { clearTimeout(t); reject(new Error("не загрузился")); };
      s.onload = () => {
        if (!root.ymaps) { clearTimeout(t); return reject(new Error("нет ymaps")); }
        root.ymaps.ready(() => { clearTimeout(t); resolve(root.ymaps); }, e => { clearTimeout(t); reject(e); });
      };
      document.head.appendChild(s);
    });
  }

  function yandexView(ymaps, el, onClick) {
    const map = new ymaps.Map(el, { center: [START.lat, START.lon], zoom: START.zoom, controls: ["zoomControl", "trafficControl"] });
    map.events.add("click", e => { const [lat, lon] = e.get("coords"); onClick(lat, lon); });
    const marks = {}; let poly = null;
    return {
      provider: "yandex",
      setView(lat, lon, z) { map.setCenter([lat, lon], z); },
      marker(which, p) {
        if (marks[which]) { map.geoObjects.remove(marks[which]); marks[which] = null; }
        if (!p) return;
        marks[which] = new ymaps.Placemark([p.lat, p.lon], { iconContent: which.toUpperCase() },
          { preset: which === "a" ? "islands#greenIcon" : "islands#redIcon" });
        map.geoObjects.add(marks[which]);
      },
      line(coords) {
        if (poly) { map.geoObjects.remove(poly); poly = null; }
        if (!coords || !coords.length) return;
        poly = new ymaps.Polyline(coords, {}, { strokeColor: COLORS.route, strokeWidth: 5, strokeOpacity: 0.9 });
        map.geoObjects.add(poly);
        map.setBounds(poly.geometry.getBounds(), { checkZoomRange: true, zoomMargin: 30 });
      },
      refresh() { map.container.fitToViewport(); }
    };
  }

  function leafletView(el, onClick) {
    const L = root.L;
    const map = L.map(el, { zoomControl: true }).setView([START.lat, START.lon], START.zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    map.on("click", e => onClick(e.latlng.lat, e.latlng.lng));
    const icon = (txt, color) => L.divIcon({ className: "", html: `<div class="mk" style="background:${color}"><span>${txt}</span></div>`, iconSize: [28, 28], iconAnchor: [14, 28] });
    const marks = {}; let poly = null;
    return {
      provider: "osm",
      setView(lat, lon, z) { map.setView([lat, lon], z); },
      marker(which, p) {
        if (marks[which]) { map.removeLayer(marks[which]); marks[which] = null; }
        if (p) marks[which] = L.marker([p.lat, p.lon], { icon: icon(which.toUpperCase(), COLORS[which]) }).addTo(map);
      },
      line(coords) {
        if (poly) { map.removeLayer(poly); poly = null; }
        if (!coords || !coords.length) return;
        poly = L.polyline(coords, { color: COLORS.route, weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(poly.getBounds(), { padding: [30, 30] });
      },
      refresh() { map.invalidateSize(); }
    };
  }

  async function create(el, onClick) {
    const key = (root.EVAK_CONFIG || {}).yandexKey;
    try {
      const ymaps = await loadYandex(key, 10000);
      root.Geo.useYandex(ymaps);
      return yandexView(ymaps, el, onClick);
    } catch (e) {
      if (root.L) return leafletView(el, onClick);
      el.innerHTML = '<p class="note" style="padding:12px">Карта не загрузилась — нет интернета. Км можно ввести вручную.</p>';
      return null;
    }
  }

  root.MapView = { create };
})(self);
