const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let win;

const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 720;
const TODO_OPEN_WIDTH = 1020;

function createWindow() {
  win = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    icon: path.join(__dirname, "myicon.ico"),
    minWidth: 360,
    minHeight: 360,
    frame: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    resizable: true,
    backgroundColor: "#eef2f6",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");

  win.once("ready-to-show", () => {
    win.show();
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.gaeun.pomodoro");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-always-on-top", () => {
  if (!win) return false;
  return win.isAlwaysOnTop();
});

ipcMain.handle("toggle-always-on-top", () => {
  if (!win) return false;
  const next = !win.isAlwaysOnTop();
  win.setAlwaysOnTop(next);
  return next;
});

ipcMain.on("quit-app", () => {
  app.quit();
});

ipcMain.handle("set-todo-window-open", (_, isOpen) => {
  if (!win) return false;

  const [, currentHeight] = win.getSize();
  const targetWidth = isOpen ? TODO_OPEN_WIDTH : DEFAULT_WIDTH;
  win.setSize(targetWidth, currentHeight, true);

  return true;
});