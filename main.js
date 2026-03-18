const { app, BrowserWindow } = require("electron");
const path = require("path");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 720,
    height: 720,

    // ✅ 작업표시줄 + 앱 아이콘
    icon: path.join(__dirname, "myicon.ico"),

    minWidth: 360,
    minHeight: 360,

    // ✅ 상단 바 제거 (가은님 원하는 디자인)
    frame: false,

    autoHideMenuBar: true,
    alwaysOnTop: true,
    resizable: true,

    backgroundColor: "#eef2f6",

    show: false, // 로딩 후 보여주기

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // ✅ HTML 로드
  win.loadFile("index.html");

  // ✅ 깜빡임 방지
  win.once("ready-to-show", () => {
    win.show();
  });
}

// ✅ Windows 작업표시줄 아이콘 핵심 설정
app.whenReady().then(() => {
  app.setAppUserModelId("com.gaeun.pomodoro"); // ⭐ 중요
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ✅ 앱 종료 처리
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});