// Поиск адресов (Photon) и маршрут (OSRM) — OpenStreetMap, ключи не нужны.
// yandexLink — только для кнопки «Навигатор».
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
    u.searchParams.set("lang", "default"); // местные названия (по-русски), а не язык телефона
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
      const r = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lon}&lang=default`);
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

  const search = osmSearch, reverse = osmReverse, route = osmRoute;

  root.Geo = { search, reverse, route, yandexLink };
})(self);
