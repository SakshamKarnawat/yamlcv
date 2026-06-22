const TUTORIAL_STORAGE_KEY = "resumekit_tutorial_done";

const TUTORIAL_STEPS = [
  {
    target: null,
    label: "Welcome",
    title: "Welcome to ResumeKit",
    body:
      "Build a polished, ATS-friendly resume locally — no Overleaf needed. " +
      "This quick tour walks through the main controls. Click Next to continue, or Skip tour anytime.",
  },
  {
    target: "#form-scroll",
    label: "Editor",
    title: "Edit your resume",
    body:
      "Fill in the form on the left — personal info, experience, education, and more. " +
      "Your name appears in the top bar as you type.",
    cardDock: "preview",
  },
  {
    target: ".bullets-list",
    label: "Reorder",
    title: "Reorder content",
    body:
      "Use ↑↓ on section headers, job entries, links, and skill rows. " +
      "Drag ⠿ handles to reorder bullet points within a section.",
  },
  {
    target: "#autosave-select",
    label: "Auto-save",
    title: "Auto-save",
    body:
      "Pick how long to wait after you stop typing before saving and rebuilding — " +
      "or turn auto-save off and use Save & Build manually.",
  },
  {
    target: "#btn-save",
    label: "Save & Build",
    title: "Save & build",
    body:
      "Writes your YAML and compiles the PDF. Press ⌘S or rely on auto-save when enabled.",
  },
  {
    target: ".preview-pane",
    label: "Preview",
    title: "PDF preview",
    body:
      "Your compiled resume shows here. The page badge warns when you're over one page. " +
      "Use Refresh if the preview looks stale.",
  },
  {
    target: "#btn-download",
    label: "Download",
    title: "Export",
    body:
      "Download PDF when you're ready. The ▾ menu also offers YAML source and generated TeX.",
    cardDock: "preview",
  },
  {
    target: ".profile-control",
    label: "Profiles",
    title: "Profiles & reset",
    body:
      "Switch YAML files per role or version — ✎ rename, + add, − delete. " +
      "Reset in the editor footer restores the sample resume.",
  },
  {
    target: null,
    label: "Done",
    title: "You're all set",
    body:
      "Press / for keyboard shortcuts, ⌘Z / ⌘⇧Z to undo and redo, and ? to replay this tour.",
  },
];

let tutorialIndex = 0;

export function maybeStartTutorial() {
  if (localStorage.getItem(TUTORIAL_STORAGE_KEY)) return;
  startTutorial(false);
}

export function startTutorial(force) {
  if (!force && localStorage.getItem(TUTORIAL_STORAGE_KEY)) return;
  tutorialIndex = 0;
  document.getElementById("tutorial").hidden = false;
  document.body.classList.add("tutorial-active");
  renderTutorialStep();
}

function finishTutorial() {
  localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  document.getElementById("tutorial").hidden = true;
  document.body.classList.remove("tutorial-active");
  document.getElementById("tutorial-spotlight").style.cssText = "";
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutorialIndex];
  const total = TUTORIAL_STEPS.length;
  const isFirst = tutorialIndex === 0;
  const isLast = tutorialIndex === total - 1;

  document.getElementById("tutorial-step-label").textContent =
    `Step ${tutorialIndex + 1} of ${total} · ${step.label}`;
  document.getElementById("tutorial-title").textContent = step.title;
  document.getElementById("tutorial-body").textContent = step.body;

  document.getElementById("tutorial-progress").innerHTML = TUTORIAL_STEPS.map(
    (_, i) =>
      `<span class="tutorial-dot${i === tutorialIndex ? " active" : i < tutorialIndex ? " done" : ""}"></span>`,
  ).join("");

  document.getElementById("tutorial-back").hidden = isFirst;
  document.getElementById("tutorial-next").textContent = isLast ? "Get started" : "Next";
  document.getElementById("tutorial-next").disabled = false;
  document.getElementById("tutorial-next").title = "";

  requestAnimationFrame(() => {
    const { el } = resolveStepTarget(step);
    scrollTargetIntoView(el);
    positionTutorialSpotlight(step);
    positionTutorialCard(step);
  });
}

function resolveStepTarget(step) {
  for (const sel of [step.target, step.fallbackTarget].filter(Boolean)) {
    const el = document.querySelector(sel);
    if (el) return { el, selector: sel };
  }
  return { el: null, selector: step.target };
}

function scrollTargetIntoView(el) {
  if (!el) return;
  const scrollParent = el.closest("#form-scroll");
  if (!scrollParent) {
    el.scrollIntoView({ block: "nearest", behavior: "instant" });
    return;
  }
  const pad = 12;
  const parentRect = scrollParent.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  if (elRect.top < parentRect.top + pad) {
    scrollParent.scrollTop += elRect.top - parentRect.top - pad;
  } else if (elRect.bottom > parentRect.bottom - pad) {
    scrollParent.scrollTop += elRect.bottom - parentRect.bottom + pad;
  }
}

function clampCardPosition(top, left, cardW, cardH, margin = 16) {
  return {
    top: Math.max(margin, Math.min(top, window.innerHeight - cardH - margin)),
    left: Math.max(margin, Math.min(left, window.innerWidth - cardW - margin)),
  };
}

function applyCardPosition(card, top, left, cardW, cardH, margin = 16) {
  const clamped = clampCardPosition(top, left, cardW, cardH, margin);
  card.style.top = `${clamped.top}px`;
  card.style.left = `${clamped.left}px`;
}

function positionTutorialSpotlight(step) {
  const spotlight = document.getElementById("tutorial-spotlight");
  const selector = step?.target;
  if (!selector) {
    spotlight.style.cssText = "opacity:0";
    return;
  }
  const { el, selector: resolved } = resolveStepTarget(step);
  if (!el) {
    spotlight.style.cssText = "opacity:0";
    return;
  }
  const pad = resolved === "#resizer" ? 16 : 6;
  const rect = el.getBoundingClientRect();
  let width = rect.width + pad * 2;
  let height = rect.height + pad * 2;
  let top = rect.top - pad;
  let left = rect.left - pad;

  if (resolved === "#resizer") {
    width = Math.max(width, 24);
    left = rect.left + rect.width / 2 - width / 2;
  }

  spotlight.style.cssText = [
    "opacity:1",
    `top:${top}px`,
    `left:${left}px`,
    `width:${width}px`,
    `height:${height}px`,
  ].join(";");
}

function isElementVisible(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && el.getBoundingClientRect().width > 0;
}

function dockCardInPreview(card, cardW, cardH, margin) {
  const preview = document.querySelector(".preview-pane");
  if (!isElementVisible(preview)) return false;
  const pr = preview.getBoundingClientRect();
  if (pr.width < 160) return false;
  card.style.top = `${Math.max(margin, pr.top + (pr.height - cardH) / 2)}px`;
  card.style.left = `${Math.max(margin, pr.left + (pr.width - cardW) / 2)}px`;
  return true;
}

function positionTutorialCard(step = {}) {
  const card = document.getElementById("tutorial-card");
  card.style.cssText = "";
  card.classList.remove("tutorial-card-centered");

  const selector = step?.target;
  if (!selector) {
    card.classList.add("tutorial-card-centered");
    return;
  }

  const { el } = resolveStepTarget(step);
  if (!el) {
    card.classList.add("tutorial-card-centered");
    return;
  }

  const rect = el.getBoundingClientRect();
  const margin = 16;
  const gap = 14;
  const cardRect = card.getBoundingClientRect();
  const cardW = cardRect.width || Math.min(400, window.innerWidth - margin * 2);
  const cardH = cardRect.height || 200;
  let top;
  let left;

  if (step.cardDock === "preview" && dockCardInPreview(card, cardW, cardH, margin)) {
    return;
  }

  if (rect.height > window.innerHeight * 0.35 || rect.width > window.innerWidth * 0.45) {
    top = rect.top + gap;
    left = rect.left + rect.width / 2 - cardW / 2;
    left = Math.max(rect.left + margin, Math.min(left, rect.right - cardW - margin));
    applyCardPosition(card, top, left, cardW, cardH, margin);
    return;
  }

  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;

  if (spaceBelow >= cardH + margin || spaceBelow >= spaceAbove) {
    top = rect.bottom + gap;
  } else {
    top = rect.top - gap - cardH;
  }

  left = rect.left + rect.width / 2 - cardW / 2;
  applyCardPosition(card, top, left, cardW, cardH, margin);
}

export function initTutorial() {
  document.getElementById("btn-help").addEventListener("click", () =>
    startTutorial(true),
  );
  document.getElementById("tutorial-next").addEventListener("click", () => {
    if (tutorialIndex < TUTORIAL_STEPS.length - 1) {
      tutorialIndex++;
      renderTutorialStep();
    } else {
      finishTutorial();
    }
  });
  document.getElementById("tutorial-back").addEventListener("click", () => {
    if (tutorialIndex > 0) {
      tutorialIndex--;
      renderTutorialStep();
    }
  });
  document.getElementById("tutorial-skip").addEventListener("click", finishTutorial);

  document.addEventListener("keydown", (e) => {
    const tutorial = document.getElementById("tutorial");
    if (tutorial.hidden) return;
    if (e.key === "Escape") finishTutorial();
    if (e.key === "Enter" && e.target.closest(".tutorial")) {
      e.preventDefault();
      document.getElementById("tutorial-next").click();
    }
  });

  window.addEventListener("resize", () => {
    if (document.getElementById("tutorial").hidden) return;
    const step = TUTORIAL_STEPS[tutorialIndex];
    const { el } = resolveStepTarget(step);
    scrollTargetIntoView(el);
    positionTutorialSpotlight(step);
    positionTutorialCard(step);
  });
}
