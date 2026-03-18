const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAlwaysOnTop: () => ipcRenderer.invoke("get-always-on-top"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggle-always-on-top"),
  quitApp: () => ipcRenderer.send("quit-app")
});