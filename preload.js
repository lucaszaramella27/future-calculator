const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("winControls", {
  minimize: () => ipcRenderer.send("win:minimize"),
  close: () => ipcRenderer.send("win:close")
});
