import { state } from "./state.js";

const STORAGE_KEY = "resumekit_autosave_delay";
const DEFAULT_DELAY = "30000";

let autoSaveTimer = null;
let countdownInterval = null;

export function initAutoSaveSelect() {
  const select = document.getElementById("autosave-select");
  const saved = readSavedDelay();
  select.value = saved;
  state.autoSaveDelayMs = delayToMs(saved);

  select.addEventListener("change", () => {
    const value = select.value;
    localStorage.setItem(STORAGE_KEY, value);
    state.autoSaveDelayMs = delayToMs(value);
    if (state.autoSaveDelayMs === 0) {
      cancelAutoSave();
    } else if (state.unsaved) {
      scheduleAutoSave();
    }
    updateCountdownDisplay();
  });

  countdownInterval = setInterval(updateCountdownDisplay, 250);
  updateCountdownDisplay();
}

export function scheduleAutoSave() {
  if (!state.initialLoadComplete) return;
  state.lastEditAt = Date.now();
  if (!state.autoSaveDelayMs) {
    clearTimeout(autoSaveTimer);
    state.autoSaveDeadline = null;
    updateCountdownDisplay();
    return;
  }
  clearTimeout(autoSaveTimer);
  state.autoSaveDeadline = state.lastEditAt + state.autoSaveDelayMs;
  autoSaveTimer = setTimeout(() => {
    state.autoSaveDeadline = null;
    updateCountdownDisplay();
    import("./api.js").then(({ save }) => save({ auto: true }));
  }, state.autoSaveDelayMs);
  updateCountdownDisplay();
}

export function cancelAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
  state.autoSaveDeadline = null;
  updateCountdownDisplay();
}

export function clearAutoSavePending() {
  cancelAutoSave();
  state.lastEditAt = null;
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  const el = document.getElementById("autosave-countdown");
  if (!el) return;

  if (state.saving) {
    el.hidden = false;
    el.textContent = "Saving…";
    return;
  }

  if (!state.unsaved || !state.lastEditAt) {
    el.hidden = true;
    el.textContent = "";
    return;
  }

  const elapsedSec = Math.max(0, Math.floor((Date.now() - state.lastEditAt) / 1000));

  if (!state.autoSaveDelayMs) {
    el.hidden = false;
    el.textContent = `${elapsedSec}s since edit`;
    return;
  }

  if (!state.autoSaveDeadline) {
    el.hidden = false;
    el.textContent = `${elapsedSec}s since edit`;
    return;
  }

  const remainingSec = Math.max(
    0,
    Math.ceil((state.autoSaveDeadline - Date.now()) / 1000),
  );

  el.hidden = false;
  el.textContent =
    remainingSec > 0
      ? `${elapsedSec}s · ${remainingSec}s left`
      : `${elapsedSec}s · saving…`;
}

function readSavedDelay() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved != null) return normalizeDelay(saved);
  return DEFAULT_DELAY;
}

function normalizeDelay(value) {
  const allowed = ["off", "2000", "5000", "10000", "30000", "60000"];
  return allowed.includes(value) ? value : DEFAULT_DELAY;
}

export function delayToMs(value) {
  return value === "off" ? 0 : Number(value);
}
