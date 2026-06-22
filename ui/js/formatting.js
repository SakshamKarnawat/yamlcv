export function wrapBulletFormat(input, marker, onChange) {
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const val = input.value;
  const len = marker.length;
  const selected = val.slice(start, end);

  let bounds = null;

  if (
    selected.length >= 2 * len &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    bounds = {
      open: start,
      close: end - len,
      innerStart: start + len,
      innerEnd: end - len,
    };
  } else if (
    val.slice(start - len, start) === marker &&
    val.slice(end, end + len) === marker
  ) {
    bounds = { open: start - len, close: end, innerStart: start, innerEnd: end };
  } else {
    bounds = findEnclosingFormat(val, start, end, marker);
  }

  if (bounds) {
    const inner = val.slice(bounds.innerStart, bounds.innerEnd);
    input.value =
      val.slice(0, bounds.open) + inner + val.slice(bounds.close + len);
    if (start === end) {
      const cursor = bounds.open + (start - bounds.innerStart);
      input.selectionStart = input.selectionEnd = cursor;
    } else {
      input.selectionStart = bounds.open;
      input.selectionEnd = bounds.open + inner.length;
    }
  } else if (start === end) {
    input.value = val.slice(0, start) + marker + marker + val.slice(end);
    input.selectionStart = input.selectionEnd = start + len;
  } else {
    input.value =
      val.slice(0, start) + marker + selected + marker + val.slice(end);
    input.selectionStart = start;
    input.selectionEnd = end + 2 * len;
  }
  onChange?.();
}

function findEnclosingFormat(val, selStart, selEnd, marker) {
  if (marker === "**") {
    let open = -1;
    for (let i = selStart; i >= 0; i--) {
      if (val.slice(i, i + 2) === "**") {
        open = i;
        break;
      }
    }
    if (open === -1) return null;
    const searchFrom = Math.max(open + 2, selEnd);
    let close = -1;
    for (let i = searchFrom; i <= val.length - 2; i++) {
      if (val.slice(i, i + 2) === "**") {
        close = i;
        break;
      }
    }
    if (close === -1) return null;
    const innerStart = open + 2;
    const innerEnd = close;
    if (selStart >= innerStart && selEnd <= innerEnd) {
      return { open, close, innerStart, innerEnd };
    }
    return null;
  }

  let open = -1;
  for (let i = selStart; i >= 0; i--) {
    if (val[i] === "*" && val[i - 1] !== "*" && val[i + 1] !== "*") {
      open = i;
      break;
    }
  }
  if (open === -1) return null;
  const searchFrom = Math.max(open + 1, selEnd);
  let close = -1;
  for (let i = searchFrom; i < val.length; i++) {
    if (val[i] === "*" && val[i - 1] !== "*" && val[i + 1] !== "*") {
      close = i;
      break;
    }
  }
  if (close === -1) return null;
  const innerStart = open + 1;
  const innerEnd = close;
  if (selStart >= innerStart && selEnd <= innerEnd) {
    return { open, close, innerStart, innerEnd };
  }
  return null;
}

export function initFormatting(onChange) {
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const input = e.target;
    if (
      input.tagName === "INPUT" &&
      input.closest(".bullet-row") &&
      (e.key === "b" || e.key === "B" || e.key === "i" || e.key === "I")
    ) {
      e.preventDefault();
      wrapBulletFormat(input, e.key.toLowerCase() === "b" ? "**" : "*", onChange);
    }
  });
}
