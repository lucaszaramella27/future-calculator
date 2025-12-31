'use strict';

const path = require('path');
const { app, BrowserWindow, shell } = require('electron');

let mainWindow = null;

function createMainWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const indexPath = path.join(__dirname, '..', 'renderer', 'index.html');

  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 340,
    minHeight: 560,
    backgroundColor: '#0b0f14',
    title: 'Calculadora Moderna',
    show: false, // evita “flash” e janela branca
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Remove menu (Windows/Linux)
  mainWindow.removeMenu();

  // Segurança: bloqueia abertura de novas janelas
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Se em algum momento existir link externo, abre no navegador do sistema
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  // Segurança: bloqueia navegação fora do app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocalFile = url.startsWith('file://');
    if (!isLocalFile) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Carrega a UI
  mainWindow.loadFile(indexPath).catch(() => {
    // Fallback simples caso o caminho esteja incorreto (evita crash silencioso)
    if (mainWindow) mainWindow.loadURL('data:text/plain,Erro ao carregar index.html');
  });

  return mainWindow;
}

app.whenReady().then(() => {
  createMainWindow();

  // macOS: recria janela ao clicar no ícone do app
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Fecha o app quando todas as janelas fecharem (exceto macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
