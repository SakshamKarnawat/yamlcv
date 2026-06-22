import { loadTemplates, loadSchemaAndDetails, loadTemplate } from "./app-data.js";
import {
  save,
  tryLoadPDF,
  fetchBuildInfo,
  refreshPDF,
  initDownloads,
} from "./api.js";
import { initDragDrop } from "./drag-drop.js";
import { initLayout } from "./layout.js";
import { initAutoSaveSelect } from "./autosave.js";
import { initFormatting } from "./formatting.js";
import { initTutorial, maybeStartTutorial } from "./tutorial.js";
import { initShortcuts } from "./shortcuts.js";
import { initUndoRedo, undo, redo } from "./undo.js";
import { initProfiles, loadProfiles } from "./profiles.js";
import { initReset } from "./reset.js";
import { notifyEdit } from "./callbacks.js";
import { initSpectacle, signalAppReady } from "./spectacle.js";

function onReorder() {
  notifyEdit();
}

async function init() {
  initSpectacle();
  initAutoSaveSelect();
  initLayout();
  initDragDrop(onReorder);
  initFormatting(onReorder);
  initTutorial();
  initShortcuts();
  initUndoRedo();
  initProfiles();
  initReset();
  initDownloads();

  document.getElementById("btn-save").addEventListener("click", () =>
    save({ auto: false }),
  );
  document.getElementById("template-select").addEventListener("change", loadTemplate);
  document.getElementById("btn-refresh").addEventListener("click", refreshPDF);
  document.getElementById("btn-undo").addEventListener("click", undo);
  document.getElementById("btn-redo").addEventListener("click", redo);

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save({ auto: false });
    }
  });

  try {
    await loadProfiles();
    await loadTemplates();
    await loadSchemaAndDetails();
    await tryLoadPDF();
    await fetchBuildInfo();
    maybeStartTutorial();
  } finally {
    signalAppReady();
  }
}

init();
