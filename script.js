const dial = document.getElementById("dial");
const wedge = document.getElementById("wedge");
const ticks = document.getElementById("ticks");
const labels = document.getElementById("labels");
const lamp = document.getElementById("lamp");
const timerCard = document.getElementById("timerCard");

const customMenu = document.getElementById("customMenu");
const menuTime = document.getElementById("menuTime");
const menuAlwaysOnTop = document.getElementById("menuAlwaysOnTop");
const menuReset = document.getElementById("menuReset");
const menuQuit = document.getElementById("menuQuit");
const menuTodo = document.getElementById("menuTodo");

const todoPanel = document.getElementById("todoPanel");
const todoList = document.getElementById("todoList");
const todoDate = document.getElementById("todoDate");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoCloseBtn = document.getElementById("todoCloseBtn");

const timerToggle = document.getElementById("timerToggle");

let isDragging = false;
let isRunning = false;
let timerId = null;
let blinkId = null;

let savedMinutes = 25;
let totalSeconds = 25 * 60;

const TODO_STORAGE_KEY = "pomodoro_todos_by_date";
const TODO_UI_STORAGE_KEY = "pomodoro_todo_ui";

let todoData = loadTodoData();
let todoPanelOpen = false;

/* ---------------- Todo ---------------- */

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadTodoData() {
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTodoData() {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todoData));
}

function loadTodoUIState() {
  try {
    const raw = localStorage.getItem(TODO_UI_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      isOpen: Boolean(parsed?.isOpen),
      selectedDate: parsed?.selectedDate || getTodayString()
    };
  } catch {
    return {
      isOpen: false,
      selectedDate: getTodayString()
    };
  }
}

function saveTodoUIState() {
  localStorage.setItem(
    TODO_UI_STORAGE_KEY,
    JSON.stringify({
      isOpen: todoPanelOpen,
      selectedDate: todoDate.value || getTodayString()
    })
  );
}

function createTodoId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyTodo() {
  return {
    id: createTodoId(),
    text: "",
    checked: false
  };
}

function ensureTodoDateExists(dateKey) {
  if (!todoData[dateKey] || !Array.isArray(todoData[dateKey])) {
    todoData[dateKey] = [createEmptyTodo()];
    saveTodoData();
  }

  if (todoData[dateKey].length === 0) {
    todoData[dateKey].push(createEmptyTodo());
    saveTodoData();
  }
}

function getSelectedDateKey() {
  return todoDate.value || getTodayString();
}

function renderTodos() {
  const dateKey = getSelectedDateKey();
  ensureTodoDateExists(dateKey);

  const items = todoData[dateKey];
  todoList.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "todo-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = item.checked;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "todo-text";
    input.placeholder = "할 일을 입력하세요";
    input.value = item.text || "";

    if (item.checked) {
      input.classList.add("completed");
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "todo-remove-btn";
    removeBtn.textContent = "×";
    removeBtn.title = "삭제";

    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      input.classList.toggle("completed", item.checked);
      saveTodoData();
    });

    input.addEventListener("input", () => {
      item.text = input.value;
      saveTodoData();
    });

    removeBtn.addEventListener("click", () => {
      const currentItems = todoData[dateKey] || [];
      const nextItems = currentItems.filter((todo) => todo.id !== item.id);
      todoData[dateKey] = nextItems.length > 0 ? nextItems : [createEmptyTodo()];
      saveTodoData();
      renderTodos();
    });

    row.appendChild(checkbox);
    row.appendChild(input);
    row.appendChild(removeBtn);
    todoList.appendChild(row);
  });
}

function addTodoItem() {
  const dateKey = getSelectedDateKey();
  ensureTodoDateExists(dateKey);
  todoData[dateKey].push(createEmptyTodo());
  saveTodoData();
  renderTodos();

  const inputs = todoList.querySelectorAll(".todo-text");
  if (inputs.length > 0) {
    inputs[inputs.length - 1].focus();
  }
}

async function setTodoPanelOpen(open) {
  todoPanelOpen = open;
  document.body.classList.toggle("todo-open", open);
  todoPanel.setAttribute("aria-hidden", open ? "false" : "true");
  menuTodo.textContent = open ? "Todo List 닫기" : "Todo List 열기";
  saveTodoUIState();

  if (window.electronAPI?.setTodoWindowOpen) {
    await window.electronAPI.setTodoWindowOpen(open);
  }

  setTimeout(() => {
    rebuildDial();
  }, 220);
}

function initTodoUI() {
  const uiState = loadTodoUIState();
  todoDate.value = uiState.selectedDate || getTodayString();
  ensureTodoDateExists(todoDate.value);
  renderTodos();
  setTodoPanelOpen(uiState.isOpen);
}

/* ---------------- Timer ---------------- */

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
  const size = getDialSize();
  if (size <= 220) return size * 0.44;
  if (size <= 300) return size * 0.465;
  return size * 0.485;
}

function getPointerLength() {
  return getDialSize() * 0.27;
}

function updateDialSize() {
  const cardRect = timerCard.getBoundingClientRect();
  const paddingX = 52;
  const paddingY = 52;
  const availableWidth = cardRect.width - paddingX;
  const availableHeight = cardRect.height - paddingY;
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
  const safeMin = Math.max(0, min);
  const angle = (safeMin / 60) * 360;
  const pointerLength = getPointerLength();

  dial.style.setProperty("--pointer-angle", `${angle}deg`);
  dial.style.setProperty("--pointer-length", `${pointerLength}px`);

  wedge.style.background = `conic-gradient(
    from 0deg,
    #8fb5f6 0deg,
    #6f9df0 ${Math.max(angle * 0.45, safeMin > 0 ? 1 : 0)}deg,
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
  const dialSize = getDialSize();
  const fontSize = Math.max(9, Math.min(18, dialSize * 0.04));
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
  let toggleCount = 0;
  const maxToggleCount = 20;

  blinkId = setInterval(() => {
    isOn = !isOn;

    if (isOn) {
      lamp.style.background = "#ff2d2d";
      lamp.style.boxShadow = "0 0 22px rgba(255, 45, 45, 0.95)";
    } else {
      lamp.style.background = "#d6d6d6";
      lamp.style.boxShadow = "0 0 0 rgba(255, 0, 0, 0)";
    }

    toggleCount++;

    if (toggleCount >= maxToggleCount) {
      stopBlinking();
    }
  }, 350);
}

function updateTimerToggleUI() {
  timerToggle.classList.toggle("on", isRunning);
  timerToggle.classList.toggle("off", !isRunning);
  timerToggle.querySelector(".toggle-text").textContent = isRunning ? "ON" : "OFF";
}

function startTimer() {
  if (isRunning) return;

  stopBlinking();
  isRunning = true;
  updateTimerToggleUI();

  timerId = setInterval(() => {
    if (totalSeconds > 0) {
      totalSeconds--;
      updatePointerByMinutes(totalSeconds / 60);
      updateMenuTime();
    } else {
      clearInterval(timerId);
      timerId = null;
      isRunning = false;
      updateTimerToggleUI();
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
  updateTimerToggleUI();
  updateMenuTime();
}

function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  isRunning = false;
  updateTimerToggleUI();
  stopBlinking();
  totalSeconds = savedMinutes * 60;
  updatePointerByMinutes(savedMinutes);
  updateMenuTime();
}

function toggleTimerRunning() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

/* ---------------- Menu ---------------- */

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

/* ---------------- Events ---------------- */

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

timerToggle.addEventListener("click", () => {
  toggleTimerRunning();
});

menuReset.addEventListener("click", () => {
  resetTimer();
  hideCustomMenu();
});

menuTodo.addEventListener("click", async () => {
  await setTodoPanelOpen(!todoPanelOpen);
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

todoCloseBtn.addEventListener("click", async () => {
  await setTodoPanelOpen(false);
});

addTodoBtn.addEventListener("click", () => {
  addTodoItem();
});

todoDate.addEventListener("change", () => {
  ensureTodoDateExists(getSelectedDateKey());
  saveTodoUIState();
  renderTodos();
});

window.addEventListener("resize", rebuildDial);

/* ---------------- Init ---------------- */

const initialTodoUI = loadTodoUIState();
todoDate.value = initialTodoUI.selectedDate || getTodayString();

rebuildDial();
updateUIFromMinutes(25);
updateMenuTime();
initTodoUI();
updateTimerToggleUI();