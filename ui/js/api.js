import { state } from "./state.js";
import { collectFormData } from "./form-collector.js";
import { dumpYaml } from "./utils.js";
import { cancelAutoSave } from "./autosave.js";
import { apiQuery } from "./profiles.js";
import {
  setStatus,
  setUnsaved,
  toast,
  showError,
  hideError,
  showWarning,
  hideWarning,
  updatePageBadge,
} from "./ui.js";
import { playBuildSpectacle, playPdfScanSpectacle } from "./spectacle.js";

export async function fetchBuildInfo() {
  try {
    const res = await fetch("/api/build-info");
    if (res.ok) {
      const data = await res.json();
      updatePageBadge(data.pages);
    }
  } catch {
    /* ignore */
  }
}

export function clearPDFPreview() {
  const frame = document.getElementById("pdf-frame");
  const placeholder = document.getElementById("pdf-placeholder");
  frame.classList.remove("pdf-visible");
  frame.src = "about:blank";
  frame.style.display = "none";
  placeholder.style.display = "flex";
  requestAnimationFrame(() => placeholder.classList.add("visible"));
  updatePageBadge(null);
  hideWarning();
}

export async function applyBuildResult(resp, { notify = false, auto = false } = {}) {
  if (resp.ok) {
    state.pdfCacheBust = Date.now();
    if (!auto) await playBuildSpectacle();
    showPDF(`/api/pdf?${apiQuery()}&v=${state.pdfCacheBust}`, { scan: !auto });
    setStatus("ready", "ready");
    hideError();
    updatePageBadge(resp.pages);
    if (resp.pages > 1) {
      showWarning(
        resp.warning ||
          `⚠️ Resume is ${resp.pages} pages — consider trimming to fit 1 page`,
      );
    } else if (resp.warning) {
      showWarning(resp.warning);
    } else {
      hideWarning();
    }
    if (notify) toast("✓ PDF updated", "success");
  } else {
    clearPDFPreview();
    setStatus("error", "build failed");
    showError(resp.error);
    if (notify) toast("✗ Build failed", "error");
  }
}

/** Build PDF from the profile YAML on disk (no form save). */
export async function buildProfile({ notify = false } = {}) {
  if (state.saving) return;
  state.saving = true;
  setStatus("building", "building…");
  if (!notify) hideError();

  try {
    const res = await fetch(`/api/build?${apiQuery()}`, { method: "POST" });
    if (!res.ok) {
      clearPDFPreview();
      setStatus("error", "build failed");
      if (notify) toast("✗ Build failed", "error");
      return;
    }
    const resp = await res.json();
    await applyBuildResult(resp, { notify, auto: false });
  } catch {
    clearPDFPreview();
    setStatus("error", "error");
    if (notify) toast("✗ Build failed", "error");
  } finally {
    state.saving = false;
  }
}

export async function save({ auto = false } = {}) {
  if (!state.initialLoadComplete || !state.schema) return;
  if (state.saving) return;
  cancelAutoSave();

  const yamlStr = dumpYaml(collectFormData());

  state.saving = true;
  setStatus("building", auto ? "auto-saving…" : "building…");
  if (!auto) hideError();
  hideWarning();
  document.getElementById("btn-save").disabled = true;

  try {
    const res = await fetch(`/api/save?${apiQuery()}`, {
      method: "POST",
      body: yamlStr,
      headers: { "Content-Type": "text/plain" },
    });
    if (!res.ok) {
      setStatus("error", "save failed");
      if (!auto) toast("✗ Save failed", "error");
      return;
    }
    const resp = await res.json();

    if (resp.ok) setUnsaved(false);
    await applyBuildResult(resp, { notify: !auto, auto });
    if (resp.ok && auto) setStatus("ready", "ready");
  } catch {
    setStatus("error", "error");
    if (!auto) toast("✗ Save failed", "error");
  } finally {
    state.saving = false;
    document.getElementById("btn-save").disabled = false;
  }
}

export function showPDF(url, { scan = false } = {}) {
  const frame = document.getElementById("pdf-frame");
  const placeholder = document.getElementById("pdf-placeholder");
  placeholder.classList.remove("visible");
  placeholder.style.display = "none";
  frame.src = url;
  frame.style.display = "block";
  requestAnimationFrame(() => {
    frame.classList.add("pdf-visible");
    if (scan) playPdfScanSpectacle();
  });
  hideError();
}

export async function tryLoadPDF() {
  const res = await fetch(`/api/pdf?${apiQuery()}&v=${state.pdfCacheBust}`);
  if (res.ok) {
    showPDF(`/api/pdf?${apiQuery()}&v=${state.pdfCacheBust}`, { scan: false });
  }
}

export async function refreshPDF() {
  state.pdfCacheBust = Date.now();
  const res = await fetch(`/api/pdf?${apiQuery()}&v=${state.pdfCacheBust}`);
  if (res.ok) {
    showPDF(`/api/pdf?${apiQuery()}&v=${state.pdfCacheBust}`, { scan: true });
  }
}

export function downloadPDF() {
  const a = document.createElement("a");
  a.href = `/api/pdf?${apiQuery()}&v=${Date.now()}`;
  a.download = "resume.pdf";
  a.click();
}

export function downloadYAML() {
  if (!state.initialLoadComplete || !state.schema) {
    toast("✗ Resume not loaded yet", "error");
    return;
  }
  const yamlStr = dumpYaml(collectFormData());
  const blob = new Blob([yamlStr], { type: "text/yaml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${state.currentProfile || "resume"}.yml`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function downloadTeX() {
  const res = await fetch(`/api/tex?${apiQuery()}&v=${Date.now()}`);
  if (!res.ok) {
    toast("✗ No TeX yet — save & build first", "error");
    return;
  }
  const tex = await res.text();
  const blob = new Blob([tex], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "resume.tex";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function initDownloads() {
  const menu = document.getElementById("download-menu");
  document.getElementById("btn-download").addEventListener("click", downloadPDF);
  document.getElementById("btn-download-more").addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  menu.querySelectorAll("[data-download]").forEach((btn) => {
    btn.addEventListener("click", () => {
      menu.hidden = true;
      if (btn.dataset.download === "pdf") downloadPDF();
      else if (btn.dataset.download === "yaml") downloadYAML();
      else if (btn.dataset.download === "tex") downloadTeX();
    });
  });
  document.addEventListener("click", () => {
    menu.hidden = true;
  });
}
