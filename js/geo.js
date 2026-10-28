// Поиск адресов и маршрут: Яндекс (если подключён), при сбое — Photon / OSRM (OpenStreetMap).
(function (root) {
  const PHOTON = "https://photon.komoot.io";
  const OSRM = "https://router.project-osrm.org";

  function label(p) {
    const a = p.properties || {};
    const street = [a.street, a.housenumber].filter(Boolean).join(", ");
    const main = a.name && a.name !== a.street ? a.name : street || a.name || "";
    const place = a.city || a.town || a.village || a.district || a.county || "";
    const parts = [main, main === street ? "" : street, place !== main ? place : "", a.state].filter(Boolean);
    return [...new Set(parts)].join(", ");
  }

  async function osmSearch(q, near) {
    const u = new URL(PHOTON + "/api/");
    u.searchParams.set("q", q);
    u.searchParams.set("limit", "7");
    if (near) { u.searchParams.set("lat", near.lat); u.searchParams.set("lon", near.lon); }
    const r = await fetch(u);
    if (!r.ok) throw new Error("Поиск адреса недоступен");
    const j = await r.json();
    return (j.features || [])
      .filter(f => !f.properties.countrycode || ["RU", "KG", "KZ", "BY", "AB", "UA", "GE", "AM"].includes(f.properties.countrycode))
      .map(f => ({ name: label(f) || q, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }));
  }

  async function osmReverse(lat, lon) {
    try {
      const r = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lon}`);
      const j = await r.json();
      const f = (j.features || [])[0];
      if (f) return label(f);
    } catch (e) { /* без адреса — покажем координаты */ }
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }

  async function osmRoute(a, b) {
    const u = `${OSRM}/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
    const r = await fetch(u);
    if (!r.ok) throw new Error("Сервис маршрутов недоступен");
    const j = await r.json();
    if (j.code !== "Ok" || !j.routes || !j.routes.length) throw new Error("Маршрут не найден");
    const rt = j.routes[0];
    return {
      km: rt.distance / 1000,
      min: rt.duration / 60,
      coords: rt.geometry.coordinates.map(([lon, lat]) => [lat, lon])
    };
  }

  function yandexLink(a, b) {
    return `https://yandex.ru/maps/?rtext=${a.lat},${a.lon}~${b.lat},${b.lon}&rtt=auto`;
  }

  // ----- Яндекс -----
  let Y = null;
  function useYandex(ymaps) { Y = ymaps; }
  const yName = o => o.getAddressLine ? o.getAddressLine() : (o.properties.get("text") || o.properties.get("name") || "");

  async function ySearch(q, near) {
    const opts = { results: 7 };
    if (near) opts.boundedBy = [[near.lat - 1.5, near.lon - 2], [near.lat + 1.5, near.lon + 2]];
    const res = await Y.geocode(q, opts);
    const out = [];
    res.geoObjects.each(o => { const [lat, lon] = o.geometry.getCoordinates(); out.push({ name: yName(o), lat, lon }); });
    return out;
  }
  async function yReverse(lat, lon) {
    const res = await Y.geocode([lat, lon], { results: 1 });
    const o = res.geoObjects.get(0);
    return o ? yName(o) : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
  async function yRoute(a, b) {
    const r = await Y.route([[a.lat, a.lon], [b.lat, b.lon]], { routingMode: "auto", mapStateAutoApply: false });
    const coords = [];
    r.getPaths().each(p => coords.push(...p.geometry.getCoordinates()));
    return { km: r.getLength() / 1000, min: r.getTime() / 60, coords, by: "yandex" };
  }

  // Сначала Яндекс, при ошибке (лимит, сбой) — OpenStreetMap
  const withFallback = (yf, of) => async (...args) => {
    if (Y) { try { return await yf(...args); } catch (e) { console.warn("Яндекс недоступен, использую OSM:", e && e.message); } }
    return of(...args);
  };
  const search = withFallback(ySearch, osmSearch);
  const reverse = withFallback(yReverse, osmReverse);
  const route = withFallback(yRoute, osmRoute);
  const provider = () => (Y ? "yandex" : "osm");

  root.Geo = { search, reverse, route, yandexLink, useYandex, provider };
})(self);
