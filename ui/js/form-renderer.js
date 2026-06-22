import { state } from "./state.js";
import { escHtml } from "./utils.js";
import { dragHandleHtml } from "./drag-drop.js";
import { notifyEdit } from "./callbacks.js";
import {
  toggleSection,
  toggleEntry,
  updateHeaderResumeName,
} from "./ui.js";

function onEdit() {
  notifyEdit();
}

function onFieldInput(id) {
  return () => {
    onEdit();
    if (id === "heading.name") updateHeaderResumeName();
  };
}

export function renderForm() {
  const container = document.getElementById("form-scroll");
  container.innerHTML = "";

  container.appendChild(buildOptionsBlock());

  const headingSec = state.schema.sections.find((s) => s.key === "heading");
  if (headingSec) container.appendChild(buildSectionBlock(headingSec));

  getSectionOrder().forEach((key) => {
    if (key === "heading") return;
    const sec = state.schema.sections.find((s) => s.key === key);
    if (sec) container.appendChild(buildSectionBlock(sec));
  });

  container.classList.remove("form-enter");
  void container.offsetWidth;
  container.classList.add("form-enter");
}

function getSectionOrder() {
  const defaultOrder = state.schema.sections
    .map((s) => s.key)
    .filter((k) => k !== "heading");
  const saved = state.formData.options?.section_order;
  if (!saved?.length) return defaultOrder;
  const ordered = saved.filter((k) => defaultOrder.includes(k));
  defaultOrder.forEach((k) => {
    if (!ordered.includes(k)) ordered.push(k);
  });
  return ordered;
}

function buildOptionsBlock() {
  const block = document.createElement("div");
  block.className = "section-block";

  const header = document.createElement("div");
  header.className = "section-header";
  header.innerHTML = `<span class="section-title">Options</span><span class="chevron open">▶</span>`;
  block.appendChild(header);

  const body = document.createElement("div");
  body.className = "section-body open";
  header.onclick = () => toggleSection(header, body);

  const opts = state.formData.options || {};
  state.schema.options.forEach((opt) => {
    if (opt.type === "toggle") {
      const val = opts[opt.key] !== undefined ? opts[opt.key] : opt.default;
      const row = document.createElement("div");
      row.className = "toggle-row";
      const id = `opt_${opt.key}`;
      row.innerHTML = `
        <span class="toggle-label">${opt.label}</span>
        <label class="toggle">
          <input type="checkbox" id="${id}" ${val ? "checked" : ""}>
          <span class="toggle-track"></span>
          <span class="toggle-thumb"></span>
        </label>`;
      row.querySelector("input").addEventListener("change", onEdit);
      body.appendChild(row);
    } else if (opt.type === "select") {
      const val = opts[opt.key] !== undefined ? opts[opt.key] : opt.default;
      const row = document.createElement("div");
      row.className = "field-row";
      const id = `opt_${opt.key}`;
      row.innerHTML = `
        <label class="field-label" for="${id}">${opt.label}</label>
        <select class="field-select" id="${id}">
          ${opt.options.map((o) => `<option value="${o.value}" ${val === o.value ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>`;
      row.querySelector("select").addEventListener("change", onEdit);
      body.appendChild(row);
    }
  });

  block.appendChild(body);
  return block;
}

function buildSectionBlock(sec) {
  const block = document.createElement("div");
  block.className = "section-block";
  block.dataset.sectionKey = sec.key;

  const isOptional = sec.required === false;
  const data = state.formData[sec.key];
  const hasData =
    data &&
    (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0);
  const isEnabled = !isOptional || hasData;

  const header = document.createElement("div");
  header.className = "section-header";
  const reorder =
    sec.key !== "heading"
      ? `<div class="section-actions">
          <button class="btn-entry btn-up" type="button" title="Move section up">↑</button>
          <button class="btn-entry btn-down" type="button" title="Move section down">↓</button>
        </div>`
      : "";
  header.innerHTML = `
    <span class="section-title">
      ${sec.label}
      ${isOptional ? '<span class="section-optional">(optional)</span>' : ""}
    </span>
    ${reorder}
    <span class="chevron ${isEnabled ? "open" : ""}">▶</span>`;

  if (sec.key !== "heading") {
    header.querySelector(".btn-up")?.addEventListener("click", (e) => {
      e.stopPropagation();
      moveSection(block, "up");
    });
    header.querySelector(".btn-down")?.addEventListener("click", (e) => {
      e.stopPropagation();
      moveSection(block, "down");
    });
  }

  const body = document.createElement("div");
  body.className = `section-body ${isEnabled ? "open" : ""}`;
  header.onclick = (e) => {
    if (e.target.closest(".section-actions")) return;
    toggleSection(header, body);
  };
  block.appendChild(header);

  if (sec.type === "single") {
    const d = state.formData[sec.key] || {};
    sec.fields.forEach((f) => {
      body.appendChild(buildField(f, d[f.key], `${sec.key}.${f.key}`));
    });
  } else if (sec.type === "list") {
    const entries = state.formData[sec.key] || [];
    const listContainer = document.createElement("div");
    listContainer.id = `list_${sec.key}`;

    if (entries.length > 0) {
      entries.forEach((entry, i) => addListEntry(listContainer, sec, entry, i));
    } else {
      addListEntry(listContainer, sec, {}, 0);
    }
    body.appendChild(listContainer);

    const addBtn = document.createElement("button");
    addBtn.className = "btn-add";
    addBtn.type = "button";
    addBtn.textContent = `+ add ${sec.label.toLowerCase().replace(/s$/, "")}`;
    addBtn.onclick = () => {
      addListEntry(listContainer, sec, {}, listContainer.querySelectorAll(".list-entry").length);
      onEdit();
    };
    body.appendChild(addBtn);
  } else if (sec.type === "keyvalue") {
    const kvContainer = document.createElement("div");
    kvContainer.id = `kv_${sec.key}`;
    const skills = state.formData[sec.key] || {};
    const entries = Object.entries(skills);
    if (entries.length > 0) {
      entries.forEach(([k, v]) => addKVRow(kvContainer, sec, k, v));
    } else {
      addKVRow(kvContainer, sec, "", "");
    }
    body.appendChild(kvContainer);

    const addBtn = document.createElement("button");
    addBtn.className = "btn-add";
    addBtn.type = "button";
    addBtn.textContent = "+ add skill category";
    addBtn.onclick = () => {
      addKVRow(kvContainer, sec, "", "");
      onEdit();
    };
    body.appendChild(addBtn);
  }

  block.appendChild(body);
  return block;
}

function arrowButtonsHtml() {
  return `<button class="btn-entry btn-up" type="button" title="Move up">↑</button><button class="btn-entry btn-down" type="button" title="Move down">↓</button>`;
}

function bindArrowReorder(row) {
  row.querySelector(".btn-up")?.addEventListener("click", (e) => {
    e.stopPropagation();
    moveRow(row, "up");
  });
  row.querySelector(".btn-down")?.addEventListener("click", (e) => {
    e.stopPropagation();
    moveRow(row, "down");
  });
}

function moveRow(row, dir) {
  if (dir === "up" && row.previousElementSibling) {
    row.parentElement.insertBefore(row, row.previousElementSibling);
    onEdit();
  } else if (dir === "down" && row.nextElementSibling) {
    row.parentElement.insertBefore(row.nextElementSibling, row);
    onEdit();
  }
}

function moveSection(block, dir) {
  const container = document.getElementById("form-scroll");
  if (dir === "up") {
    const prev = block.previousElementSibling;
    if (prev && prev.dataset.sectionKey !== "heading") {
      container.insertBefore(block, prev);
      onEdit();
    }
  } else if (dir === "down" && block.nextElementSibling) {
    container.insertBefore(block.nextElementSibling, block);
    onEdit();
  }
}

function addListEntry(container, sec, data, index) {
  const entry = document.createElement("div");
  entry.className = "list-entry";

  const titleField = sec.fields.find(
    (f) => f.key === "title" || f.key === "name" || f.key === "institution",
  );
  const titleVal =
    data[titleField?.key] || `${sec.label.replace(/s$/, "")} ${index + 1}`;

  const entryHeader = document.createElement("div");
  entryHeader.className = "entry-header";
  entryHeader.innerHTML = `
    <span class="entry-title">${escHtml(titleVal)}</span>
    <div class="entry-actions">
      ${arrowButtonsHtml()}
      <button class="btn-entry btn-remove" type="button" title="remove">✕</button>
    </div>`;

  entryHeader.querySelector(".btn-remove").onclick = (e) => {
    e.stopPropagation();
    entry.remove();
    onEdit();
  };
  entryHeader.querySelector(".entry-title").onclick = (e) => {
    e.stopPropagation();
    toggleEntry(entryHeader, entryBody);
  };
  entryHeader.querySelector(".entry-title").style.cursor = "pointer";
  entryHeader.querySelector(".entry-title").style.flex = "1";
  entry.appendChild(entryHeader);
  bindArrowReorder(entry);

  const entryBody = document.createElement("div");
  entryBody.className = "entry-body open";
  entryBody.dataset.sectionKey = sec.key;

  const regularFields = sec.fields.filter(
    (f) => f.type !== "bullets" && f.type !== "links",
  );
  const bulletField = sec.fields.find((f) => f.type === "bullets");
  const linkField = sec.fields.find((f) => f.type === "links");
  const grid = document.createElement("div");
  grid.className = "two-col";
  const fullFields = ["summary", "stack", "degree", "demo", "repo"];

  regularFields.forEach((f) => {
    const fieldId = `${sec.key}[].${f.key}`;
    const isFull = fullFields.includes(f.key) || f.type === "textarea";
    const fieldEl = buildField(f, data[f.key], fieldId);
    if (isFull) {
      entryBody.appendChild(grid);
      entryBody.appendChild(fieldEl);
      return;
    }
    grid.appendChild(fieldEl);
  });

  if (grid.children.length > 0 && !entryBody.contains(grid)) {
    entryBody.appendChild(grid);
  }
  if (linkField) entryBody.appendChild(buildLinksField(linkField, data[linkField.key] || []));
  if (bulletField) entryBody.appendChild(buildBulletsField(bulletField, data[bulletField.key] || []));

  const firstInput = entryBody.querySelector("input");
  if (firstInput) {
    firstInput.addEventListener("input", () => {
      entryHeader.querySelector(".entry-title").textContent =
        firstInput.value || titleVal;
    });
  }

  entry.appendChild(entryBody);
  container.appendChild(entry);
}

function addKVRow(container, sec, key, value) {
  const row = document.createElement("div");
  row.className = "kv-row";
  row.innerHTML = `
    <input type="text" placeholder="${sec.placeholder_key}" value="${escHtml(key)}">
    <input type="text" placeholder="${sec.placeholder_value}" value="${escHtml(value)}">
    <div class="entry-actions">
      ${arrowButtonsHtml()}
      <button class="btn-bullet-remove" type="button">✕</button>
    </div>`;
  bindArrowReorder(row);
  row.querySelectorAll("input").forEach((i) => i.addEventListener("change", onEdit));
  row.querySelector(".btn-bullet-remove").onclick = () => {
    row.remove();
    onEdit();
  };
  container.appendChild(row);
}

function buildField(field, value, id) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-row";

  const label = document.createElement("label");
  label.className = "field-label";
  label.htmlFor = id;
  label.innerHTML = `${field.label}${field.required ? '<span class="field-required">*</span>' : ""}${field.hint ? `<span class="field-hint">${field.hint}</span>` : ""}`;
  wrapper.appendChild(label);

  const el =
    field.type === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");
  if (field.type !== "textarea") el.type = field.type === "email" ? "email" : "text";
  el.id = id;
  el.dataset.fieldId = id;
  el.placeholder = field.placeholder || "";
  el.value = value || "";
  el.addEventListener("input", onFieldInput(id));
  wrapper.appendChild(el);
  return wrapper;
}

function buildBulletsField(field, bullets) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-row";
  wrapper.innerHTML = `<label class="field-label">${field.label}<span class="field-required">*</span>${field.hint ? `<span class="field-hint">${field.hint}</span>` : ""}</label>`;

  const list = document.createElement("div");
  list.className = "bullets-list";
  const groupId = `bullets-${Math.random().toString(36).slice(2, 9)}`;
  list.dataset.sortableGroup = groupId;

  const addBullet = (val) => {
    const row = document.createElement("div");
    row.className = "bullet-row";
    row.dataset.sortable = "true";
    row.dataset.sortableGroup = groupId;
    row.innerHTML = `
      ${dragHandleHtml()}
      <input type="text" placeholder="${field.placeholder}" value="${escHtml(val)}">
      <button class="btn-bullet-remove" type="button" title="remove">✕</button>`;
    row.querySelector("input").addEventListener("input", onEdit);
    row.querySelector("button").onclick = () => {
      row.remove();
      onEdit();
    };
    list.appendChild(row);
  };

  if (bullets.length > 0) bullets.forEach((b) => addBullet(b));
  else addBullet("");

  wrapper.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.className = "btn-add";
  addBtn.type = "button";
  addBtn.textContent = "+ add bullet";
  addBtn.style.marginTop = "4px";
  addBtn.onclick = () => {
    addBullet("");
    onEdit();
  };
  wrapper.appendChild(addBtn);
  return wrapper;
}

function buildLinksField(field, links) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-row";
  wrapper.innerHTML = `<label class="field-label">${field.label}${field.hint ? `<span class="field-hint">${field.hint}</span>` : ""}</label>`;

  const list = document.createElement("div");
  list.className = "links-list";

  const addLink = (data) => {
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `
      <input type="text" class="link-text" placeholder="${field.placeholder_text || "Label"}" value="${escHtml(data?.text || "")}">
      <input type="text" class="link-url" placeholder="${field.placeholder_url || "https://..."}" value="${escHtml(data?.url || "")}">
      <div class="entry-actions">
        ${arrowButtonsHtml()}
        <button class="btn-bullet-remove" type="button" title="remove">✕</button>
      </div>`;
    bindArrowReorder(row);
    row.querySelectorAll("input").forEach((i) => i.addEventListener("input", onEdit));
    row.querySelector(".btn-bullet-remove").onclick = () => {
      row.remove();
      onEdit();
    };
    list.appendChild(row);
  };

  if (links.length > 0) links.forEach((l) => addLink(l));

  wrapper.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.className = "btn-add";
  addBtn.type = "button";
  addBtn.textContent = "+ add link";
  addBtn.style.marginTop = "4px";
  addBtn.onclick = () => {
    addLink({});
    onEdit();
  };
  wrapper.appendChild(addBtn);
  return wrapper;
}
