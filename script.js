const dial = document.getElementById("dial");
const wedge = document.getElementById("wedge");
const ticks = document.getElementById("ticks");
const labels = document.getElementById("labels");
const lamp = document.getElementById("lamp");
const timerCard = document.getElementById("timerCard");

const customMenu = document.getElementById("customMenu");
const menuTime = document.getElementById("menuTime");
const menuAlwaysOnTop = document.getElementById("menuAlwaysOnTop");
const menuStart = document.getElementById("menuStart");
const menuPause = document.getElementById("menuPause");
const menuReset = document.getElementById("menuReset");
const menuQuit = document.getElementById("menuQuit");

let isDragging = false;
let isRunning = false;
let timerId = null;
let blinkId = null;

let savedMinutes = 25;
let totalSeconds = 25 * 60;

function getDialSize() {
  return dial.offsetWidth;
}

function getCenter() {
  return getDialSize() / 2;
}

function getTickRadius() {
  return getDialSize() * 0.43;
}

function getLabelRadius() {
  return getDialSize() * 0.52;
}

function getPointerLength() {
  return getDialSize() * 0.27;
}

function updateDialSize() {
  const cardRect = timerCard.getBoundingClientRect();
  const availableWidth = cardRect.width - 36;
  const availableHeight = cardRect.height - 36;
  const dialSize = Math.max(140, Math.min(availableWidth, availableHeight));
  timerCard.style.setProperty("--dial-size", `${dialSize}px`);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const min = Math.floor(safeSeconds / 60);
  const sec = safeSeconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function updateMenuTime() {
  if (menuTime) {
    menuTime.textContent = formatTime(totalSeconds);
  }
}

function updatePointerByMinutes(min) {
  const angle = (min / 60) * 360;
  const pointerLength = getPointerLength();

  dial.style.setProperty("--pointer-angle", `${angle}deg`);
  dial.style.setProperty("--pointer-length", `${pointerLength}px`);

  wedge.style.background = `conic-gradient(
    from 0deg,
    #8fb5f6 0deg,
    #6f9df0 ${Math.max(angle * 0.45, 1)}deg,
    #5f8fe8 ${angle}deg,
    transparent ${angle}deg 360deg
  )`;
}

function updateUIFromMinutes(min) {
  if (min < 1) min = 1;
  if (min > 60) min = 60;

  savedMinutes = min;
  totalSeconds = Math.round(min * 60);
  updatePointerByMinutes(min);
  updateMenuTime();
}

function getAngleFromMouse(event) {
  const rect = dial.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;

  let deg = Math.atan2(dy, dx) * (180 / Math.PI);
  deg += 90;

  if (deg < 0) deg += 360;
  return deg;
}

function createTicks() {
  ticks.innerHTML = "";

  const center = getCenter();
  const tickRadius = getTickRadius();

  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360 - 90;
    const rad = (angle * Math.PI) / 180;

    const x = center + Math.cos(rad) * tickRadius;
    const y = center + Math.sin(rad) * tickRadius;

    const tick = document.createElement("div");
    tick.className = i % 5 === 0 ? "tick major" : "tick";
    tick.style.left = `${x}px`;
    tick.style.top = `${y}px`;
    tick.style.transform = `rotate(${angle + 90}deg)`;

    ticks.appendChild(tick);
  }
}

function createLabels() {
  labels.innerHTML = "";

  const center = getCenter();
  const labelRadius = getLabelRadius();
  const fontSize = Math.max(12, getDialSize() * 0.055);
  const values = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  values.forEach((value) => {
    const angle = (value / 60) * 360 - 90;
    const rad = (angle * Math.PI) / 180;

    const x = center + Math.cos(rad) * labelRadius;
    const y = center + Math.sin(rad) * labelRadius;

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = value;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.fontSize = `${fontSize}px`;

    labels.appendChild(label);
  });
}

function rebuildDial() {
  updateDialSize();

  requestAnimationFrame(() => {
    createTicks();
    createLabels();
    updatePointerByMinutes(totalSeconds / 60);
    updateMenuTime();
  });
}

function stopBlinking() {
  if (blinkId) {
    clearInterval(blinkId);
    blinkId = null;
  }

  lamp.style.background = "#d6d6d6";
  lamp.style.boxShadow = "0 0 0 rgba(255, 0, 0, 0)";
}

function startBlinking() {
  stopBlinking();

  let isOn = false;
  let count = 0;

  blinkId = setInterval(() => {
    isOn = !isOn;

    if (isOn) {
      lamp.style.background = "#ff2d2d";
      lamp.style.boxShadow = "0 0 18px rgba(255, 45, 45, 0.9)";
    } else {
      lamp.style.background = "#d6d6d6";
      lamp.style.boxShadow = "0 0 0 rgba(255, 0, 0, 0)";
    }

    count++;
    if (count >= 30) stopBlinking();
  }, 1000);
}

function startTimer() {
  if (isRunning) return;

  stopBlinking();
  isRunning = true;

  timerId = setInterval(() => {
    if (totalSeconds > 0) {
      totalSeconds--;
      updatePointerByMinutes(totalSeconds / 60);
      updateMenuTime();
    } else {
      clearInterval(timerId);
      timerId = null;
      isRunning = false;
      updatePointerByMinutes(0);
      updateMenuTime();
      startBlinking();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;
  updateMenuTime();
}

function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;

  stopBlinking();
  totalSeconds = savedMinutes * 60;
  updatePointerByMinutes(savedMinutes);
  updateMenuTime();
}

async function syncAlwaysOnTopLabel() {
  if (!window.electronAPI?.getAlwaysOnTop) return;

  const alwaysOnTop = await window.electronAPI.getAlwaysOnTop();
  menuAlwaysOnTop.textContent = alwaysOnTop ? "항상 위 해제" : "항상 위 켜기";
}

function hideCustomMenu() {
  customMenu.classList.remove("show");
}

function showCustomMenu(x, y) {
  updateMenuTime();
  syncAlwaysOnTopLabel();

  customMenu.classList.add("show");

  const rect = customMenu.getBoundingClientRect();
  const padding = 8;

  let left = x;
  let top = y;

  if (left + rect.width > window.innerWidth - padding) {
    left = window.innerWidth - rect.width - padding;
  }

  if (top + rect.height > window.innerHeight - padding) {
    top = window.innerHeight - rect.height - padding;
  }

  if (left < padding) left = padding;
  if (top < padding) top = padding;

  customMenu.style.left = `${left}px`;
  customMenu.style.top = `${top}px`;
}

dial.addEventListener("mousedown", (event) => {
  event.stopPropagation();
  hideCustomMenu();
  isDragging = true;
  dial.classList.add("dragging");
});

window.addEventListener("mousemove", (event) => {
  if (!isDragging) return;

  const angle = getAngleFromMouse(event);
  let min = Math.round((angle / 360) * 60);

  if (min < 1) min = 1;
  if (min > 60) min = 60;

  stopBlinking();
  updateUIFromMinutes(min);

  if (isRunning) {
    totalSeconds = min * 60;
    updatePointerByMinutes(min);
    updateMenuTime();
  }
});

window.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    dial.classList.remove("dragging");
  }
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  showCustomMenu(event.clientX, event.clientY);
});

window.addEventListener("click", (event) => {
  if (!customMenu.contains(event.target)) {
    hideCustomMenu();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideCustomMenu();
  }
});

menuStart.addEventListener("click", () => {
  startTimer();
  hideCustomMenu();
});

menuPause.addEventListener("click", () => {
  pauseTimer();
  hideCustomMenu();
});

menuReset.addEventListener("click", () => {
  resetTimer();
  hideCustomMenu();
});

menuAlwaysOnTop.addEventListener("click", async () => {
  if (window.electronAPI?.toggleAlwaysOnTop) {
    const alwaysOnTop = await window.electronAPI.toggleAlwaysOnTop();
    menuAlwaysOnTop.textContent = alwaysOnTop ? "항상 위 해제" : "항상 위 켜기";
  }
  hideCustomMenu();
});

menuQuit.addEventListener("click", () => {
  if (window.electronAPI?.quitApp) {
    window.electronAPI.quitApp();
  }
});

window.addEventListener("resize", rebuildDial);

rebuildDial();
updateUIFromMinutes(25);
updateMenuTime();