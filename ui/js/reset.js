import { state } from "./state.js";
import { loadProfiles } from "./profiles.js";
import { loadSchemaAndDetails } from "./app-data.js";
import { applyBuildResult } from "./api.js";
import { cancelAutoSave } from "./autosave.js";
import { toast, updateTemplateAttribution } from "./ui.js";

export function initReset() {
  document.getElementById("btn-reset").addEventListener("click", resetAll);
}

async function resetAll() {
  if (state.saving) return;

  let msg =
    "Reset everything to the sample resume?\n\n" +
    "This deletes all profiles, personal YAML files, and generated PDFs. " +
    "This cannot be undone.";
  if (state.unsaved) {
    msg += "\n\nYou have unsaved edits that will be lost.";
  }
  if (!confirm(msg)) return;

  cancelAutoSave();

  let res;
  try {
    res = await fetch(
      `/api/reset?template=${encodeURIComponent(state.currentTemplate)}`,
      { method: "POST" },
    );
  } catch {
    toast("✗ Reset failed — is the server running?", "error");
    return;
  }

  if (!res.ok) {
    let detail = "Reset failed";
    try {
      const err = await res.json();
      if (err.error) detail = err.error;
    } catch {
      /* ignore */
    }
    toast(`✗ ${detail}`, "error");
    return;
  }

  const result = await res.json();
  state.currentProfile = "personal";
  state.currentTemplate = "classic";
  state.unsaved = false;
  document.getElementById("template-select").value = "classic";
  updateTemplateAttribution();
  await loadProfiles();
  await loadSchemaAndDetails();
  applyBuildResult(result, { notify: false });
  if (result.ok) {
    toast("✓ Reset to sample resume", "success");
  }
}
