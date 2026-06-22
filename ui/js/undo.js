import { state } from "./state.js";
import { renderForm } from "./form-renderer.js";
import { collectFormData } from "./form-collector.js";
import { cancelAutoSave } from "./autosave.js";
import { setUnsaved, updateHeaderResumeName } from "./ui.js";
import { debounce, isTyping } from "./utils.js";

const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
let recording = true;

const debouncedPush = debounce(() => {
  if (!recording) return;
  pushHistory(collectFormData());
}, 400);

export function initUndoRedo() {
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (isTyping(e.target)) return;
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (e.key === "z" && e.shiftKey) {
      e.preventDefault();
      redo();
    } else if (e.key === "y") {
      e.preventDefault();
      redo();
    }
  });
}

export function resetHistory(formData) {
  undoStack = [JSON.stringify(formData)];
  redoStack = [];
  updateUndoButtons();
}

export function scheduleHistorySnapshot() {
  debouncedPush();
}

function pushHistory(formData) {
  const snapshot = JSON.stringify(formData);
  if (undoStack.length && undoStack[undoStack.length - 1] === snapshot) return;
  undoStack.push(snapshot);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}

export function undo() {
  if (undoStack.length <= 1) return false;
  redoStack.push(undoStack.pop());
  applySnapshot(JSON.parse(undoStack[undoStack.length - 1]));
  return true;
}

export function redo() {
  if (!redoStack.length) return false;
  const snapshot = redoStack.pop();
  undoStack.push(snapshot);
  applySnapshot(JSON.parse(snapshot));
  return true;
}

function applySnapshot(data) {
  recording = false;
  cancelAutoSave();
  state.formData = structuredClone(data);
  renderForm();
  updateHeaderResumeName();
  setUnsaved(true);
  recording = true;
  updateUndoButtons();
}

function updateUndoButtons() {
  const undoBtn = document.getElementById("btn-undo");
  const redoBtn = document.getElementById("btn-redo");
  if (undoBtn) undoBtn.disabled = undoStack.length <= 1;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}
