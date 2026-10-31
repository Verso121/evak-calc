// Программа для Windows: открывает калькулятор в своём окне.
const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");

if (!app.requestSingleInstanceLock()) app.quit();

function createWindow() {
  // Сервер карт OpenStreetMap требует адрес источника — указываем адрес сайта приложения
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ["https://*.openstreetmap.org/*"] }, (d, cb) => {
    d.requestHeaders["Referer"] = "https://verso121.github.io/evak-calc/";
    cb({ requestHeaders: d.requestHeaders });
  });
  const win = new BrowserWindow({
    width: 1200, height: 860, minWidth: 380, minHeight: 600,
    title: "Эвак Калькулятор", backgroundColor: "#121417", autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { contextIsolation: true, spellcheck: false }
  });
  // Внешние ссылки (Навигатор → Яндекс Карты) — в обычном браузере
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file:")) { e.preventDefault(); shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, "web", "index.html"));
}

app.on("second-instance", () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
