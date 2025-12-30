const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Ajuda a reduzir artefatos/halo em alguns PCs (opcional, mas costuma ajudar)
app.disableHardwareAcceleration();

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 350,
    height: 575,
    useContentSize: true,

    frame: false,

    // ✅ Janela transparente pra ficar realmente “redonda”
    transparent: true,

    // ✅ Pulo do gato: evita a “bordinha preta” (franja escura) nas curvas
    // (cor base #020617 com alpha 00)
    backgroundColor: "#02061700",

    // ✅ remove sombra do sistema que às vezes parece borda
    hasShadow: false,

    resizable: false,
    maximizable: false,
    fullscreenable: false, // já que você não quer “tela cheia”
    show: false,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "index.html"));

  win.once("ready-to-show", () => {
    win.center();
    win.show();
  });

  // Failsafe: bloqueia F11 (pra ninguém “cair” em fullscreen)
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F11") {
      event.preventDefault();
    }
  });
}

// IPC dos botões
ipcMain.on("win:minimize", () => win?.minimize());
ipcMain.on("win:close", () => win?.close());

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
