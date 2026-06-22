import { state, TEMPLATE_ATTRIBUTIONS } from "./state.js";

export function setStatus(type, text) {
  document.getElementById("status-dot").className = `status-dot ${type}`;
  document.getElementById("status-text").textContent = text;
}

export function setUnsaved(val) {
  state.unsaved = val;
  document.getElementById("unsaved-bar").classList.toggle("visible", val);
  if (!val) {
    import("./autosave.js").then(({ clearAutoSavePending }) => clearAutoSavePending());
  }
}

export function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove("show"), 3000);
}

export function showError(msg) {
  const el = document.getElementById("error-banner");
  el.textContent = msg;
  el.classList.add("visible");
}

export function hideError() {
  document.getElementById("error-banner").classList.remove("visible");
}

export function showWarning(msg) {
  const el = document.getElementById("warning-banner");
  el.textContent = msg;
  el.classList.add("visible");
}

export function hideWarning() {
  document.getElementById("warning-banner").classList.remove("visible");
}

export function updatePageBadge(pages) {
  const badge = document.getElementById("page-badge");
  if (pages == null) {
    badge.hidden = true;
    badge.className = "page-badge";
    return;
  }
  badge.hidden = false;
  badge.textContent = pages === 1 ? "1 page" : `${pages} pages`;
  badge.className = "page-badge" + (pages > 1 ? " page-badge-warn" : "");
  badge.title =
    pages > 1
      ? "Resume exceeds 1 page — consider trimming content"
      : "Resume fits on one page";
}

export function updateHeaderResumeName() {
  const el = document.getElementById("header-resume-name");
  const nameInput = document.querySelector('[data-field-id="heading.name"]');
  const name =
    nameInput?.value.trim() || state.formData.heading?.name?.trim() || "";
  if (name) {
    el.textContent = name;
    el.classList.add("visible");
  } else {
    el.textContent = "";
    el.classList.remove("visible");
  }
}

export function updateTemplateAttribution() {
  const el = document.getElementById("template-attribution");
  const attr = TEMPLATE_ATTRIBUTIONS[state.currentTemplate];
  if (!attr) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `${attr.name} layout · inspired by <a href="${attr.inspirationUrl}" target="_blank" rel="noopener noreferrer">${attr.inspiration}</a> (${attr.license}) · <a href="${attr.authorUrl}" target="_blank" rel="noopener noreferrer">${attr.author}</a> · based on <a href="${attr.basedOn.url}" target="_blank" rel="noopener noreferrer">${attr.basedOn.name}</a>`;
}

export function toggleSection(header, body) {
  const chevron = header.querySelector(".chevron");
  body.classList.toggle("open");
  chevron.classList.toggle("open");
}

export function toggleEntry(header, body) {
  body.classList.toggle("open");
}
