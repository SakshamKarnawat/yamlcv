import { state } from "./state.js";

export function collectFormData() {
  const { schema } = state;
  if (!schema) return structuredClone(state.formData || {});

  const result = {};

  result.options = {};
  schema.options.forEach((opt) => {
    const el = document.getElementById(`opt_${opt.key}`);
    if (!el) return;
    result.options[opt.key] = opt.type === "toggle" ? el.checked : el.value;
  });
  result.options.section_order = [
    ...document.querySelectorAll("#form-scroll .section-block[data-section-key]"),
  ]
    .map((b) => b.dataset.sectionKey)
    .filter((k) => k !== "heading");

  schema.sections.forEach((sec) => {
    if (sec.type === "single") {
      result[sec.key] = {};
      sec.fields.forEach((f) => {
        const el = document.querySelector(
          `[data-field-id="${sec.key}.${f.key}"]`,
        );
        if (el) result[sec.key][f.key] = el.value.trim() || undefined;
      });
      Object.keys(result[sec.key]).forEach((k) => {
        if (result[sec.key][k] === undefined) delete result[sec.key][k];
      });
    } else if (sec.type === "list") {
      const entries = document.querySelectorAll(`#list_${sec.key} .list-entry`);
      result[sec.key] = [];
      entries.forEach((entry) => {
        const obj = {};
        const entryBody = entry.querySelector(".entry-body");
        sec.fields.forEach((f) => {
          if (f.type === "bullets") {
            const bullets = [...entryBody.querySelectorAll(".bullet-row input")]
              .map((i) => i.value.trim())
              .filter(Boolean);
            if (bullets.length) obj[f.key] = bullets;
          } else if (f.type === "links") {
            const links = [...entryBody.querySelectorAll(".link-row")]
              .map((row) => ({
                text: row.querySelector(".link-text").value.trim(),
                url: row.querySelector(".link-url").value.trim(),
              }))
              .filter((l) => l.url);
            if (links.length) obj[f.key] = links;
          } else {
            const el = entryBody.querySelector(
              `[data-field-id$=".${f.key}"]`,
            );
            if (el?.value.trim()) obj[f.key] = el.value.trim();
          }
        });
        if (Object.keys(obj).length > 0) result[sec.key].push(obj);
      });
      if (result[sec.key].length === 0 && sec.required === false) {
        result[sec.key] = undefined;
      }
    } else if (sec.type === "keyvalue") {
      result[sec.key] = {};
      document.querySelectorAll(`#kv_${sec.key} .kv-row`).forEach((row) => {
        const inputs = row.querySelectorAll("input");
        const k = inputs[0]?.value.trim();
        const v = inputs[1]?.value.trim();
        if (k && v) result[sec.key][k] = v;
      });
      if (Object.keys(result[sec.key]).length === 0 && sec.required === false) {
        result[sec.key] = undefined;
      }
    }
  });

  Object.keys(result).forEach((k) => {
    if (result[k] === undefined) delete result[k];
  });
  return result;
}
