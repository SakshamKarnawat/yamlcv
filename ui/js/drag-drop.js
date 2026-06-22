import { state } from "./state.js";

let onReorder = null;

export function initDragDrop(reorderCallback) {
  onReorder = reorderCallback;
  document.addEventListener("dragstart", handleDragStart);
  document.addEventListener("dragover", handleDragOver);
  document.addEventListener("drop", handleDrop);
  document.addEventListener("dragend", handleDragEnd);
}

let dragged = null;

function handleDragStart(e) {
  const handle = e.target.closest(".drag-handle");
  if (!handle) return;
  dragged = handle.closest(".bullet-row[data-sortable]");
  if (!dragged) return;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "");
  requestAnimationFrame(() => dragged.classList.add("dragging"));
}

function handleDragOver(e) {
  if (!dragged) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const target = e.target.closest("[data-sortable]");
  if (
    !target ||
    target === dragged ||
    target.dataset.sortableGroup !== dragged.dataset.sortableGroup
  )
    return;

  const container = target.parentElement;
  const siblings = [...container.querySelectorAll(":scope > [data-sortable]")];
  const dragIdx = siblings.indexOf(dragged);
  const targetIdx = siblings.indexOf(target);
  if (dragIdx < targetIdx) {
    container.insertBefore(dragged, target.nextElementSibling);
  } else {
    container.insertBefore(dragged, target);
  }
}

function handleDrop(e) {
  e.preventDefault();
}

function handleDragEnd() {
  if (dragged) {
    dragged.classList.remove("dragging");
    dragged = null;
    onReorder?.();
  }
}

export function dragHandleHtml() {
  return `<span class="drag-handle" draggable="true" title="Drag to reorder bullet" aria-label="Drag to reorder bullet">⠿</span>`;
}
