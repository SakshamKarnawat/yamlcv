import { isTyping } from "./utils.js";

const SHORTCUTS = [
  { keys: ["⌘", "S"], action: "Save & build PDF" },
  { keys: ["⌘", "Z"], action: "Undo" },
  { keys: ["⌘", "Shift", "Z"], action: "Redo" },
  { keys: ["⌘", "Y"], action: "Redo (alternate)" },
  { keys: ["⌘", "B"], action: "Bold selected bullet text" },
  { keys: ["⌘", "I"], action: "Italic selected bullet text" },
  { keys: ["/"], action: "Open this shortcuts panel" },
  { keys: ["Esc"], action: "Close modals / skip tour" },
];

export function initShortcuts() {
  document.getElementById("btn-shortcuts").addEventListener("click", openShortcuts);
  document.getElementById("shortcuts-close").addEventListener("click", closeShortcuts);
  document.getElementById("shortcuts-backdrop").addEventListener("click", closeShortcuts);

  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("shortcuts-modal");
    if (!modal.hidden && e.key === "Escape") {
      closeShortcuts();
      return;
    }
    if (e.key === "/" && !isTyping(e.target)) {
      e.preventDefault();
      openShortcuts();
    }
  });
}

export function openShortcuts() {
  const modal = document.getElementById("shortcuts-modal");
  const list = document.getElementById("shortcuts-list");
  list.innerHTML = SHORTCUTS.map(
    (s) => `
    <div class="shortcut-row">
      <span class="shortcut-keys">${s.keys.map((k) => `<kbd>${k}</kbd>`).join("")}</span>
      <span class="shortcut-action">${s.action}</span>
    </div>`,
  ).join("");
  modal.hidden = false;
}

function closeShortcuts() {
  document.getElementById("shortcuts-modal").hidden = true;
}
