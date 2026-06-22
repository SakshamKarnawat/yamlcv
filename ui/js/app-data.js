import { state, TEMPLATE_LABELS } from "./state.js";
import { parseYaml } from "./utils.js";
import { renderForm } from "./form-renderer.js";
import {
  setUnsaved,
  updateHeaderResumeName,
  updateTemplateAttribution,
  toast,
} from "./ui.js";
import { resetHistory } from "./undo.js";

export async function loadTemplates() {
  const res = await fetch("/api/templates");
  if (!res.ok) {
    toast("✗ Could not load templates", "error");
    return;
  }
  const templates = await res.json();
  const sel = document.getElementById("template-select");
  sel.innerHTML = templates
    .map((t) => `<option value="${t}">${TEMPLATE_LABELS[t] || t}</option>`)
    .join("");
  state.currentTemplate = templates[0] || "classic";
  updateTemplateAttribution();
}

export async function loadSchemaAndDetails() {
  state.initialLoadComplete = false;
  const { apiQuery } = await import("./profiles.js");
  const q = apiQuery();
  const [schemaRes, detailsRes] = await Promise.all([
    fetch(`/api/schema?${q}`),
    fetch(`/api/details?${q}`),
  ]);
  if (!schemaRes.ok) {
    toast("✗ Could not load template schema", "error");
    return;
  }
  state.schema = parseYaml(await schemaRes.text());

  if (!detailsRes.ok) {
    toast("✗ Could not load resume YAML", "error");
    return;
  }

  try {
    state.formData = parseYaml(await detailsRes.text()) || {};
  } catch {
    toast("✗ Could not parse resume YAML", "error");
    return;
  }

  renderForm();
  updateHeaderResumeName();
  setUnsaved(false);
  resetHistory(state.formData);
  state.initialLoadComplete = true;
}

export async function loadTemplate() {
  state.currentTemplate = document.getElementById("template-select").value;
  updateTemplateAttribution();
  await loadSchemaAndDetails();
  const { buildProfile } = await import("./api.js");
  await buildProfile();
}
