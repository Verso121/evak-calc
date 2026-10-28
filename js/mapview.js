// Карта OpenStreetMap (Leaflet).
// Единый интерфейс: setView, marker, line, refresh.
(function (root) {
  const COLORS = { a: "#3ecf8e", b: "#ff6b4a", route: "#f5b301" };
  const START = { lat: 45.04, lon: 38.98, zoom: 8 }; // Краснодарский край

  function leafletView(el, onClick) {
    const L = root.L;
    const map = L.map(el, { zoomControl: true }).setView([START.lat, START.lon], START.zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    map.on("click", e => onClick(e.latlng.lat, e.latlng.lng));
    const icon = (txt, color) => L.divIcon({ className: "", html: `<div class="mk" style="background:${color}"><span>${txt}</span></div>`, iconSize: [28, 28], iconAnchor: [14, 28] });
    const marks = {}; let poly = null;
    return {
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
    if (root.L) return leafletView(el, onClick);
    el.innerHTML = '<p class="note" style="padding:12px">Карта не загрузилась — нет интернета. Км можно ввести вручную.</p>';
    return null;
  }

  root.MapView = { create };
})(self);
