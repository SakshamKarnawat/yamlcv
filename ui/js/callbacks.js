import { setUnsaved } from "./ui.js";
import { scheduleAutoSave } from "./autosave.js";
import { scheduleHistorySnapshot } from "./undo.js";

export function notifyEdit() {
  setUnsaved(true);
  scheduleAutoSave();
  scheduleHistorySnapshot();
}
