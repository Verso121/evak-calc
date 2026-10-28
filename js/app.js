(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rub = n => Math.round(n).toLocaleString("ru-RU") + " ₽";

  // ---------- хранилище ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* нет места/запрещено */ } }
  };
  let T = Pricing.migrate(store.get("evak.tariffs", null));
  let prefs = Object.assign({ shareDetail: false }, store.get("evak.prefs", {}));
  let history = store.get("evak.history", []);
  const saveT = () => store.set("evak.tariffs", T);
  const saveP = () => store.set("evak.prefs", prefs);

  const S = { car: null, cat: "L", loaded: false, a: null, b: null, km: null, min: null, extras: {}, pick: null };

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- навигация между экранами ----------
  function show(view) {
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + view));
    document.body.classList.toggle("on-calc", view === "calc");
    if (view === "settings") renderSettings();
    if (view === "history") renderHistory();
    if (view === "calc") { renderExtras(); recalc(); setTimeout(() => map && map.refresh(), 50); }
    window.scrollTo(0, 0);
  }
  $$("[data-view]").forEach(b => b.addEventListener("click", () => show(b.dataset.view)));

  // ---------- автоподсказки ----------
  function autocomplete(input, list, fetcher, onPick, delay) {
    let items = [], sel = -1, timer, seq = 0;
    const close = () => { list.classList.remove("open"); sel = -1; };
    const draw = () => {
      list.innerHTML = items.map((it, i) => `<li data-i="${i}" class="${i === sel ? "sel" : ""}">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</li>`).join("");
      list.classList.toggle("open", items.length > 0);
    };
    const run = async () => {
      const q = input.value.trim(), my = ++seq;
      if (q.length < 2) { items = []; draw(); return; }
      try { const r = await fetcher(q); if (my === seq) { items = r; sel = -1; draw(); } }
      catch (e) { if (my === seq) { items = [{ label: e.message || "Нет связи", sub: "", disabled: true }]; draw(); } }
    };
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, delay); });
    input.addEventListener("focus", () => { if (items.length) draw(); });
    input.addEventListener("keydown", e => {
      if (!list.classList.contains("open")) return;
      if (e.key === "ArrowDown") { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter") { const it = items[sel >= 0 ? sel : 0]; if (it && !it.disabled) { onPick(it); close(); input.blur(); } e.preventDefault(); }
      else if (e.key === "Escape") close();
    });
    // Выбор — по click (срабатывает только на тап, не на прокрутку пальцем)
    list.addEventListener("click", e => {
      const li = e.target.closest("li"); if (!li) return;
      const it = items[+li.dataset.i];
      if (it && !it.disabled) { onPick(it); close(); input.blur(); }
    });
    // На ПК не даём полю терять фокус при клике по списку
    list.addEventListener("mousedown", e => e.preventDefault());
    // Закрываем список только при нажатии вне поля и списка
    const wrap = input.closest(".field") || input.parentNode;
    document.addEventListener("pointerdown", e => { if (!wrap.contains(e.target)) close(); });
    input.addEventListener("keydown", e => { if (e.key === "Tab") close(); });
  }

  // ---------- транспорт ----------
  const catName = id => (Pricing.CATEGORIES.find(c => c.id === id) || {}).name || id;
  const catMeta = () => Pricing.CATEGORIES.find(c => c.id === S.cat) || Pricing.CATEGORIES[0];
  const fixCat = id => (id === "B" || id === "T") ? "C" : (Pricing.CATEGORIES.some(c => c.id === id) ? id : "L");
  function renderCats() {
    S.cat = fixCat(S.cat);
    $("#cats").innerHTML = Pricing.CATEGORIES.map(c => `<button class="chip ${c.id === S.cat ? "on" : ""}" data-cat="${c.id}" title="${esc(c.name)}">${esc(c.short || c.name)}</button>`).join("");
    const m = catMeta();
    $("#heavy").classList.toggle("hidden", !m.heavy);
    $("#load-seg").classList.toggle("hidden", m.weight !== "cargo");
    $("#mass-label").textContent = m.weight === "own" ? "Масса техники, т" : "Масса авто (пустого), т";
    $("#mass").placeholder = m.defMass ? `~${m.defMass}` : "—";
    $("#cargo-wrap").classList.toggle("hidden", !(m.weight === "cargo" && S.loaded));
  }
  function setMassFromCar() {
    $("#mass").value = S.car && S.car.mass ? String(S.car.mass) : "";
  }
  $("#cats").addEventListener("click", e => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    S.cat = b.dataset.cat; renderCats(); recalc();
  });
  autocomplete($("#car"), $("#car-list"),
    async q => CarDB.search(q, 12).map(c => ({ label: c.brand + " " + c.model, sub: (Pricing.CATEGORIES.find(x => x.id === c.cat) || {}).short || catName(c.cat), car: c })),
    it => { S.car = it.car; S.cat = it.car.cat; $("#car").value = it.label; setMassFromCar(); renderCats(); recalc(); }, 60);
  $("#car").addEventListener("input", () => { if (!$("#car").value.trim()) { S.car = null; recalc(); } });
  $("#load-seg").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    S.loaded = b.dataset.load === "1";
    $$("#load-seg button").forEach(x => x.classList.toggle("on", x === b));
    renderCats(); recalc();
    if (S.loaded) $("#cargo").focus();
  });
  ["#mass", "#cargo"].forEach(id => $(id).addEventListener("input", recalc));

  // ---------- карта ----------
  let map = null;
  async function initMap() {
    map = await MapView.create($("#map"), async (lat, lon) => {
      if (!S.pick) return;
      const which = S.pick; setPick(null);
      const p = { lat, lon, name: "…" };
      setPoint(which, p);
      p.name = await Geo.reverse(lat, lon);
      $(which === "a" ? "#pa" : "#pb").value = p.name;
    });
    if (map) { map.marker("a", S.a); map.marker("b", S.b); if (S.a && S.b) updateRoute(); }
  }
  function setPick(which) {
    S.pick = which;
    $$("[data-pick]").forEach(b => b.classList.toggle("on", b.dataset.pick === which));
    $("#pick-hint").classList.toggle("hidden", !which);
  }
  $$("[data-pick]").forEach(b => b.addEventListener("click", () => setPick(S.pick === b.dataset.pick ? null : b.dataset.pick)));

  function setPoint(which, p) {
    S[which] = p;
    $(which === "a" ? "#pa" : "#pb").value = p ? p.name : "";
    if (map) {
      map.marker(which, p);
      if (p && !(S.a && S.b)) map.setView(p.lat, p.lon, 13);
    }
    updateRoute();
  }

  let routeSeq = 0;
  async function updateRoute() {
    const my = ++routeSeq;
    $("#route-err").classList.add("hidden");
    if (map) map.line(null);
    S.km = null; S.min = null;
    if (S.a && S.b) {
      $("#r-km").textContent = "…";
      try {
        const r = await Geo.route(S.a, S.b);
        if (my !== routeSeq) return;
        S.km = r.km; S.min = r.min;
        if (map) map.line(r.coords);
      } catch (e) {
        if (my !== routeSeq) return;
        $("#route-err").textContent = (e.message || "Ошибка маршрута") + ". Введи км вручную.";
        $("#route-err").classList.remove("hidden");
      }
    }
    if (my === routeSeq) { drawRouteInfo(); recalc(); }
  }
  function drawRouteInfo() {
    $("#r-km").textContent = S.km != null ? S.km.toFixed(1).replace(".", ",") : "—";
    if (S.min != null) { const h = Math.floor(S.min / 60), m = Math.round(S.min % 60); $("#r-min").textContent = h ? `${h} ч ${m} м` : `${m} мин`; }
    else $("#r-min").textContent = "—";
  }

  const near = () => S.a || S.b || null;
  const addrFetch = async q => (await Geo.search(q, near())).map(p => ({ label: p.name, p }));
  autocomplete($("#pa"), $("#pa-list"), addrFetch, it => setPoint("a", it.p), 450);
  autocomplete($("#pb"), $("#pb-list"), addrFetch, it => setPoint("b", it.p), 450);
  $("#swap").addEventListener("click", () => { const a = S.a, b = S.b; S.a = null; S.b = null; setPoint("a", b); setPoint("b", a); });
  $("#gps").addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Геолокация недоступна");
    $("#gps").classList.add("on");
    navigator.geolocation.getCurrentPosition(async pos => {
      $("#gps").classList.remove("on");
      const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Моё местоположение" };
      setPoint("a", p);
      p.name = await Geo.reverse(p.lat, p.lon); $("#pa").value = p.name;
    }, () => { $("#gps").classList.remove("on"); toast("Не удалось определить место"); }, { enableHighAccuracy: true, timeout: 15000 });
  });
  $("#km-manual").addEventListener("input", recalc);

  // ---------- условия ----------
  function renderExtras() {
    $("#extras").innerHTML = T.extras.map(e => {
      const q = S.extras[e.id] || 0;
      const price = e.type === "percent" ? `+${e.price}%` : e.type === "unit" ? `${rub(e.price)} / ${e.unitName || "ед"}` : rub(e.price);
      const ctl = e.type === "unit"
        ? `<div class="stepper"><button data-dec="${e.id}">−</button><span>${q}</span><button data-inc="${e.id}">+</button></div>`
        : `<div class="box">${q ? "✓" : ""}</div>`;
      return `<div class="ex ${q ? "on" : ""}" data-ex="${e.id}"><div class="nm">${esc(e.name)}</div><div class="pr">${price}</div>${ctl}</div>`;
    }).join("") || '<p class="note">Нет пунктов — добавь их в тарифах.</p>';
  }
  $("#extras").addEventListener("click", e => {
    const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), row = e.target.closest("[data-ex]");
    if (!row) return;
    const ex = T.extras.find(x => x.id === row.dataset.ex); if (!ex) return;
    const q = S.extras[ex.id] || 0;
    if (ex.type === "unit") {
      const max = ex.max || 99;
      if (dec) S.extras[ex.id] = Math.max(0, q - 1);
      else S.extras[ex.id] = Math.min(max, q + 1);
    } else S.extras[ex.id] = q ? 0 : 1;
    renderExtras(); recalc();
  });

  // ---------- расчёт ----------
  function currentKm() {
    const m = parseFloat(String($("#km-manual").value).replace(",", "."));
    return Number.isFinite(m) && m > 0 ? m : (S.km || 0);
  }
  let last = null;
  function recalc() {
    const input = {
      cat: S.cat, loaded: S.loaded,
      mass: parseFloat(String($("#mass").value).replace(",", ".")) || 0,
      cargo: parseFloat(String($("#cargo").value).replace(",", ".")) || 0,
      km: currentKm(), extras: S.extras
    };
    const r = Pricing.calc(T, input);
    last = { input, r };
    $("#lines").innerHTML = r.lines.map(l => `<li><span>${esc(l.label)}</span><b>${rub(l.sum)}</b></li>`).join("")
      + (r.total !== r.raw ? `<li class="round"><span>Округление (было ${rub(r.raw)})</span><b>${r.total > r.raw ? "+" : "−"}${rub(Math.abs(r.total - r.raw))}</b></li>` : "");
    $("#total").textContent = rub(r.total);
    const m = catMeta();
    if (m.weight) {
      const c = T.cats[S.cat], heavy = c.hFrom > 0 && r.weight >= c.hFrom;
      const w = String(Math.round(r.weight * 10) / 10).replace(".", ",");
      const from = String(c.hFrom).replace(".", ",");
      $("#weight-info").innerHTML = `${m.weight === "cargo" ? "Общая масса" : "Масса"} ≈ <b>${w} т</b> → `
        + (heavy ? `<b class="hv">тяжёлый тариф</b> (от ${from} т)` : `обычный тариф (тяжёлый — от ${from} т)`)
        + (input.mass ? "" : " · масса примерная, уточни");
    }
  }

  // ---------- клиенту / навигатор ----------
  function clientText() {
    const { input, r } = last;
    const car = S.car ? `${S.car.brand} ${S.car.model}` : ($("#car").value.trim() || catName(S.cat));
    const out = [`Эвакуация: ${car}`];
    if (Pricing.CATEGORIES.find(c => c.id === S.cat).heavy) {
      const m = catMeta(), d = [];
      if (m.weight === "cargo") d.push(S.loaded ? `гружёный${input.cargo ? ", груз " + input.cargo + " т" : ""}` : "пустой");
      else if (input.mass) d.push(`масса ${input.mass} т`);
      if (d.length) out[0] += ` (${d.join(", ")})`;
    }
    if (S.a) out.push(`Откуда: ${S.a.name}`);
    if (S.b) out.push(`Куда: ${S.b.name}`);
    if (input.km) out.push(`Расстояние: ~${Math.ceil(input.km)} км`);
    const conds = T.extras.filter(e => S.extras[e.id]).map(e => e.type === "unit" ? `${e.name.toLowerCase()} (${S.extras[e.id]} ${e.unitName || ""})`.trim() : e.name.toLowerCase());
    if (conds.length) out.push(`Условия: ${conds.join(", ")}`);
    if (prefs.shareDetail) { out.push(""); r.lines.forEach(l => out.push(`${l.label} — ${rub(l.sum)}`)); }
    out.push(`Стоимость: ${rub(r.total)}`);
    return out.join("\n");
  }
  $("#btn-copy").addEventListener("click", async () => {
    if (!last || !last.r.total) return toast("Нечего отправлять");
    const text = clientText();
    saveHistory(text);
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ text }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text); toast("Скопировано — вставь клиенту"); }
    catch (e) { prompt("Скопируй текст:", text); }
  });
  $("#btn-nav").addEventListener("click", () => {
    if (!(S.a && S.b)) return toast("Укажи точки A и B");
    window.open(Geo.yandexLink(S.a, S.b), "_blank");
  });

  // ---------- история ----------
  function saveHistory(text) {
    history.unshift({
      t: Date.now(), text, total: last.r.total,
      state: { car: S.car, carText: $("#car").value, cat: S.cat, loaded: S.loaded, mass: $("#mass").value, cargo: $("#cargo").value,
        a: S.a, b: S.b, kmManual: $("#km-manual").value, extras: Object.assign({}, S.extras) }
    });
    history = history.slice(0, 50); store.set("evak.history", history);
  }
  function renderHistory() {
    $("#history").innerHTML = history.map((h, i) => {
      const d = new Date(h.t);
      const title = h.state.carText || catName(h.state.cat);
      const route = [h.state.a && h.state.a.name, h.state.b && h.state.b.name].filter(Boolean).join(" → ");
      return `<li data-h="${i}"><div class="h-top"><span>${esc(title)}</span><b>${rub(h.total)}</b></div>
        <div class="h-sub">${d.toLocaleDateString("ru-RU")} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}${route ? " · " + esc(route) : ""}</div></li>`;
    }).join("") || '<p class="note">Пока пусто.</p>';
  }
  $("#history").addEventListener("click", e => {
    const li = e.target.closest("[data-h]"); if (!li) return;
    const s = history[+li.dataset.h].state;
    S.car = s.car; S.cat = s.cat; S.loaded = s.loaded; S.extras = Object.assign({}, s.extras);
    $("#car").value = s.carText || ""; $("#mass").value = s.mass || ""; $("#cargo").value = s.cargo || ""; $("#km-manual").value = s.kmManual || "";
    $$("#load-seg button").forEach(x => x.classList.toggle("on", (x.dataset.load === "1") === !!s.loaded));
    renderCats(); show("calc");
    S.a = null; S.b = null; setPoint("a", s.a); setPoint("b", s.b);
  });
  $("#clear-history").addEventListener("click", () => { if (confirm("Очистить историю?")) { history = []; store.set("evak.history", history); renderHistory(); } });

  // ---------- тарифы ----------
  const F_BASE = [["base", "Подача (цена по городу), ₽"], ["perKm", "За каждый км маршрута, ₽"]];
  const F_TIER = [["hFrom", "Тяжёлый тариф с массы, т"], ["hBase", "Тяжёлый: подача, ₽"], ["hPerKm", "Тяжёлый: за км, ₽"]];
  const fld = (path, label, val) => `<label class="mini">${label}<input type="number" inputmode="decimal" step="any" min="0" data-path="${path}" value="${esc(val)}"></label>`;
  function renderSettings() {
    $("#cat-settings").innerHTML = Pricing.CATEGORIES.map(c => {
      const t = T.cats[c.id];
      let h = F_BASE.map(([k, l]) => fld(`cats.${c.id}.${k}`, l, t[k])).join("");
      if (c.weight) h += `<div class="sub">${c.weight === "cargo" ? "Тяжёлый тариф (масса авто + груз)" : "Тяжёлый тариф (масса техники)"}</div>` + F_TIER.map(([k, l]) => fld(`cats.${c.id}.${k}`, l, t[k])).join("");
      return `<details class="card cat-card"><summary>${esc(c.name)} <small style="color:var(--mute);font-weight:400;margin-left:auto;margin-right:8px">${rub(t.base)} + ${t.perKm} ₽/км</small></summary><div class="grid">${h}</div></details>`;
    }).join("");
    renderExtraSettings();
    $("#round").value = T.roundStep;
    $("#min-total").value = T.minTotal;
    $("#share-detail").checked = !!prefs.shareDetail;
  }
  $("#cat-settings").addEventListener("input", e => {
    const p = e.target.dataset.path; if (!p) return;
    const [, id, k] = p.split(".");
    T.cats[id][k] = parseFloat(String(e.target.value).replace(",", ".")) || 0;
    saveT();
    const sm = e.target.closest("details").querySelector("summary small");
    sm.textContent = `${rub(T.cats[id].base)} + ${T.cats[id].perKm} ₽/км`;
  });

  function renderExtraSettings() {
    $("#extra-settings").innerHTML = T.extras.map((e, i) => `
      <div class="ex-edit" data-i="${i}">
        <input class="name" type="text" data-k="name" value="${esc(e.name)}" placeholder="Название">
        <select data-k="type">
          <option value="fixed" ${e.type === "fixed" ? "selected" : ""}>Фикс, ₽</option>
          <option value="unit" ${e.type === "unit" ? "selected" : ""}>За ед., ₽</option>
          <option value="percent" ${e.type === "percent" ? "selected" : ""}>%</option>
        </select>
        <input type="number" inputmode="decimal" min="0" step="any" data-k="price" value="${esc(e.price)}">
        <button class="del" data-del="${i}" title="Удалить">✕</button>
        ${e.type === "unit" ? `<input type="text" data-k="unitName" value="${esc(e.unitName || "")}" placeholder="ед. (шт, ч)"><input type="number" inputmode="numeric" min="1" data-k="max" value="${esc(e.max || "")}" placeholder="макс.">` : ""}
      </div>`).join("");
  }
  $("#extra-settings").addEventListener("input", e => {
    const row = e.target.closest("[data-i]"), k = e.target.dataset.k; if (!row || !k) return;
    const ex = T.extras[+row.dataset.i];
    ex[k] = (k === "price" || k === "max") ? (parseFloat(String(e.target.value).replace(",", ".")) || 0) : e.target.value;
    saveT();
    if (k === "type") renderExtraSettings();
  });
  $("#extra-settings").addEventListener("change", e => { if (e.target.dataset.k === "type") renderExtraSettings(); });
  $("#extra-settings").addEventListener("click", e => {
    const d = e.target.closest("[data-del]"); if (!d) return;
    const ex = T.extras[+d.dataset.del];
    if (!confirm(`Удалить «${ex.name}»?`)) return;
    T.extras.splice(+d.dataset.del, 1); delete S.extras[ex.id]; saveT(); renderExtraSettings();
  });
  $("#add-extra").addEventListener("click", () => {
    T.extras.push({ id: "x" + Date.now().toString(36), name: "Новый пункт", type: "fixed", price: 0 });
    saveT(); renderExtraSettings();
    const inputs = $$("#extra-settings .name"); const last = inputs[inputs.length - 1]; last.focus(); last.select();
  });

  $("#round").addEventListener("input", e => { T.roundStep = +e.target.value || 0; saveT(); });
  $("#min-total").addEventListener("input", e => { T.minTotal = +e.target.value || 0; saveT(); });
  $("#share-detail").addEventListener("change", e => { prefs.shareDetail = e.target.checked; saveP(); });

  $("#export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ app: "evak-calc", tariffs: T, prefs }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `evak-tarify-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("#import").addEventListener("click", () => $("#import-file").click());
  $("#import-file").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j.tariffs || !j.tariffs.cats) throw new Error();
      T = Pricing.migrate(j.tariffs); if (j.prefs) prefs = Object.assign(prefs, j.prefs);
      saveT(); saveP(); renderSettings(); toast("Тарифы загружены");
    } catch (err) { toast("Это не файл тарифов"); }
    e.target.value = "";
  });
  $("#reset").addEventListener("click", () => {
    if (!confirm("Вернуть все тарифы к начальным? Твои цены сотрутся.")) return;
    T = Pricing.defaultTariffs(); saveT(); renderSettings(); toast("Сброшено");
  });

  // ---------- старт ----------
  document.body.classList.add("on-calc");
  renderCats(); renderExtras(); initMap(); drawRouteInfo(); recalc();
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
    // Пришла новая версия — один раз перезагружаемся, чтобы её показать
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloaded) return; reloaded = true; location.reload();
    });
  }
})();
