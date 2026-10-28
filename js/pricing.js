// Тарифы по умолчанию (заглушки — меняются в приложении) и сам расчёт.
(function (root) {
  // weight: "cargo" — масса авто + груз; "own" — только масса техники
  const CATEGORIES = [
    { id: "L", name: "Легковой", heavy: false },
    { id: "K", name: "Кроссовер / внедорожник / микроавтобус", short: "Кроссовер / микроавтобус", heavy: false },
    { id: "M", name: "Мото / квадро", heavy: false },
    { id: "C", name: "Коммерческий до 5 т (Газель, фургон, автобус, грузовик)", short: "Коммерческий до 5 т", heavy: true, weight: "cargo", defMass: 2.5 },
    { id: "S", name: "Спецтехника до 5 т", heavy: true, weight: "own", defMass: 3 }
  ];

  // base — подача (цена по городу), perKm — за каждый км маршрута.
  // Для C/S: hBase/hPerKm — тяжёлый тариф, включается с массы hFrom (т).
  // lenLimit/lenFix/lenPerM — надбавка за длину, hLimit/hFix — за высоту (0 — выкл.).
  function defaultTariffs() {
    return {
      version: 3,
      cats: {
        L: { base: 3000, perKm: 70 },
        K: { base: 3000, perKm: 70 },
        M: { base: 3000, perKm: 70 },
        C: { base: 4000, perKm: 100, hBase: 5000, hPerKm: 120, hFrom: 4.5, lenLimit: 0, lenFix: 0, lenPerM: 0, hLimit: 0, hFix: 0 },
        S: { base: 5000, perKm: 100, hBase: 5000, hPerKm: 120, hFrom: 3, lenLimit: 0, lenFix: 0, lenPerM: 0, hLimit: 0, hFix: 0 }
      },
      // type: fixed — фикс., unit — за штуку/час, percent — % от суммы
      extras: [
        { id: "ditch", name: "В кювете (вытаскивание)", type: "fixed", price: 3000 },
        { id: "wheel", name: "Заблокировано колесо", type: "unit", price: 1000, unitName: "шт", max: 4 },
        { id: "steer", name: "Заблокирован руль (2 подката)", type: "fixed", price: 1500 },
        { id: "gear", name: "Заблокирована КПП / паркинг (2 телеги)", type: "fixed", price: 1500 },
        { id: "crash", name: "После ДТП / сильные повреждения", type: "fixed", price: 3000 }
      ],
      feed: { enabled: false, perKm: 40, baseName: "", baseLat: null, baseLon: null },
      roundStep: 100,
      minTotal: 0
    };
  }

  const num = v => (Number.isFinite(+v) ? +v : 0);

  // Масса для выбора тарифа: C — авто + груз (если гружёный), S — сама техника
  function weightOf(meta, input) {
    if (!meta || !meta.weight) return 0;
    const own = num(input.mass) || meta.defMass;
    return meta.weight === "cargo" && input.loaded ? own + num(input.cargo) : own;
  }
  const t1 = n => (Math.round(n * 10) / 10).toString().replace(".", ",");

  // input: { cat, loaded, cargo, mass, length, height, km, feedKm, extras: {id: qty} }
  function calc(t, input) {
    const c = t.cats[input.cat];
    const meta = CATEGORIES.find(x => x.id === input.cat);
    const lines = [];
    if (!c) return { lines, total: 0 };
    const km = Math.ceil(Math.max(0, num(input.km)));

    let base = num(c.base), perKm = num(c.perKm), tier = "";
    const w = weightOf(meta, input);
    if (meta && meta.weight) {
      const heavy = num(c.hFrom) > 0 && w >= num(c.hFrom);
      if (heavy) { base = num(c.hBase); perKm = num(c.hPerKm); }
      tier = ` — ${heavy ? "тяжёлый" : "обычный"}, ~${t1(w)} т`;
    }
    lines.push({ label: `Подача (цена по городу)${tier}`, sum: base });
    if (km > 0) lines.push({ label: `Пробег ${km} км × ${perKm} ₽`, sum: km * perKm });

    const feedKm = Math.ceil(Math.max(0, num(input.feedKm)));
    if (t.feed && t.feed.enabled && feedKm > 0)
      lines.push({ label: `Подача от базы ${feedKm} км × ${num(t.feed.perKm)} ₽`, sum: feedKm * num(t.feed.perKm) });

    if (meta && meta.heavy) {
      const len = num(input.length), lim = num(c.lenLimit);
      if (len > 0 && lim > 0 && len > lim && (num(c.lenFix) || num(c.lenPerM))) {
        const extraM = Math.ceil(Math.round((len - lim) * 1000) / 100) / 10;
        lines.push({ label: `Длина ${len} м (свыше ${lim} м)`, sum: num(c.lenFix) + Math.ceil(extraM * num(c.lenPerM)) });
      }
      const h = num(input.height), hl = num(c.hLimit);
      if (h > 0 && hl > 0 && h > hl && num(c.hFix)) lines.push({ label: `Высота ${h} м (свыше ${hl} м)`, sum: num(c.hFix) });
    }

    const sel = input.extras || {};
    const percents = [];
    for (const e of t.extras || []) {
      const q = num(sel[e.id]);
      if (!q) continue;
      if (e.type === "percent") percents.push(e);
      else if (e.type === "unit") lines.push({ label: `${e.name} × ${q} ${e.unitName || ""}`.trim(), sum: q * num(e.price) });
      else lines.push({ label: e.name, sum: num(e.price) });
    }

    const subtotal = lines.reduce((s, l) => s + l.sum, 0);
    for (const e of percents)
      lines.push({ label: `${e.name} +${num(e.price)}%`, sum: Math.round(subtotal * num(e.price) / 100) });

    let total = lines.reduce((s, l) => s + l.sum, 0);
    if (num(t.minTotal) && total < num(t.minTotal)) {
      lines.push({ label: "Доплата до минимального заказа", sum: num(t.minTotal) - total });
      total = num(t.minTotal);
    }
    const step = num(t.roundStep);
    const rounded = step > 0 ? Math.ceil(total / step) * step : total;
    return { lines, raw: total, total: rounded, weight: w };
  }

  // Подмешивает недостающие поля из умолчаний (после обновлений приложения)
  function migrate(saved) {
    const d = defaultTariffs();
    if (!saved || typeof saved !== "object") return d;
    const out = Object.assign({}, d, saved);
    out.cats = {};
    // v3: новые категории и цены — старые цены категорий заменяются
    const keepCats = (saved.version || 1) >= 3 ? saved.cats || {} : {};
    for (const id of Object.keys(d.cats)) out.cats[id] = Object.assign({}, d.cats[id], keepCats[id]);
    out.feed = Object.assign({}, d.feed, saved.feed);
    // v2: новый набор надбавок — заменяем старый список целиком
    if (!Array.isArray(saved.extras) || (saved.version || 1) < 2) out.extras = d.extras;
    out.version = d.version;
    return out;
  }

  const api = { CATEGORIES, defaultTariffs, calc, migrate, weightOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Pricing = api;
})(typeof self !== "undefined" ? self : this);
