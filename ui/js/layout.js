const MOBILE_MAX = 520;
const TABLET_MAX = 960;

export function initLayout() {
  initResizer();
  initPaneTabs();
  updateLayout();
  window.addEventListener("resize", updateLayout);
}

function initResizer() {
  const split = document.querySelector(".split");
  const resizer = document.getElementById("resizer");
  const leftPane = document.getElementById("form-pane");
  const MIN_PCT = 20;
  const MAX_PCT = 80;
  let isResizing = false;

  function setPaneWidth(clientX) {
    const { left, width } = split.getBoundingClientRect();
    const pct = ((clientX - left) / width) * 100;
    const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
    leftPane.style.width = `${clamped}%`;
  }

  resizer.addEventListener("mousedown", (e) => {
    if (window.innerWidth <= TABLET_MAX) return;
    isResizing = true;
    document.body.classList.add("resizing");
    resizer.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  resizer.addEventListener("pointermove", (e) => {
    if (!isResizing) return;
    setPaneWidth(e.clientX);
  });

  resizer.addEventListener("pointerup", (e) => {
    if (!isResizing) return;
    isResizing = false;
    document.body.classList.remove("resizing");
    resizer.releasePointerCapture(e.pointerId);
  });

  resizer.addEventListener("pointercancel", () => {
    isResizing = false;
    document.body.classList.remove("resizing");
  });
}

function initPaneTabs() {
  document.querySelectorAll(".pane-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".pane-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.body.dataset.activePane = tab.dataset.pane;
      const paneId = tab.dataset.pane === "editor" ? "form-pane" : "preview-pane";
      const pane = document.getElementById(paneId);
      pane.classList.remove("pane-enter");
      void pane.offsetWidth;
      pane.classList.add("pane-enter");
    });
  });
}

function updateLayout() {
  const w = window.innerWidth;
  const mobile = document.getElementById("mobile-notice");
  if (w <= MOBILE_MAX) {
    document.body.dataset.layout = "mobile";
    mobile.hidden = false;
  } else if (w <= TABLET_MAX) {
    document.body.dataset.layout = "tablet";
    mobile.hidden = true;
    if (!document.body.dataset.activePane) {
      document.body.dataset.activePane = "editor";
    }
  } else {
    document.body.dataset.layout = "desktop";
    mobile.hidden = true;
    delete document.body.dataset.activePane;
  }
}
