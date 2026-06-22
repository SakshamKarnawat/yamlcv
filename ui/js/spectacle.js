/**
 * Showpiece animations: boot sequence, manual build pipeline, PDF holo-scan.
 *
 * Boot: #app-root stays hidden until app data loads AND runBootSequence() finishes.
 * The overlay is removed on reveal — no body-class visibility hacks.
 */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function spawnParticles(container, count = 55) {
  container.replaceChildren();
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "spectacle-particle";
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 260;
    p.style.setProperty("--px", `${Math.cos(angle) * dist}px`);
    p.style.setProperty("--py", `${Math.sin(angle) * dist}px`);
    p.style.setProperty("--delay", `${0.8 + Math.random() * 0.5}s`);
    p.style.setProperty("--size", `${5 + Math.random() * 10}px`);
    p.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    container.appendChild(p);
  }
}

/*
  Boot reveal waits for both app data load and the cinematic (or skip).
*/
let appReady = false;
let cinematicDone = false;
let revealed = false;

function revealApp() {
  if (revealed || !appReady || !cinematicDone) return;
  revealed = true;
  const appRoot = document.getElementById("app-root");
  if (appRoot) appRoot.hidden = false;
  const overlay = document.getElementById("boot-overlay");
  if (overlay) overlay.remove();
}

export function signalAppReady() {
  appReady = true;
  const hint = document.getElementById("boot-hint");
  if (hint && !revealed) hint.textContent = "Almost ready…";
  revealApp();
}

const SPLASH_MIN_MS = 1200;
const CINEMATIC_MS = 2800;
const splashStart = performance.now();

async function runBootSequence() {
  const overlay = document.getElementById("boot-overlay");
  const boot = document.getElementById("spectacle-boot");

  if (prefersReducedMotion() || !overlay || !boot) {
    cinematicDone = true;
    revealApp();
    return;
  }

  const elapsed = performance.now() - splashStart;
  if (elapsed < SPLASH_MIN_MS) await wait(SPLASH_MIN_MS - elapsed);

  boot.setAttribute("aria-hidden", "false");
  boot.classList.add("playing");
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  overlay.classList.add("boot-cine");

  let ended = false;
  const finish = (delay) => {
    if (ended) return;
    ended = true;
    boot.classList.add("done");
    overlay.classList.add("boot-exiting");
    wait(delay).then(() => {
      cinematicDone = true;
      revealApp();
    });
  };

  overlay.addEventListener(
    "click",
    () => finish(400),
    { once: true },
  );
  wait(CINEMATIC_MS).then(() => finish(650));
}

export function initSpectacle() {
  runBootSequence();
}

export function playBuildSpectacle() {
  if (prefersReducedMotion()) return Promise.resolve();

  const el = document.getElementById("spectacle-build");
  if (!el) return Promise.resolve();

  const particles = el.querySelector(".spectacle-build-particles");
  spawnParticles(particles, 65);

  el.hidden = false;
  el.classList.remove("playing", "done");
  void el.offsetWidth;
  el.classList.add("playing");

  return wait(2600)
    .then(() => {
      el.classList.add("done");
      return wait(550);
    })
    .then(() => {
      el.hidden = true;
      el.classList.remove("playing", "done");
    });
}

export function playPdfScanSpectacle() {
  if (prefersReducedMotion()) return;

  const scan = document.getElementById("spectacle-scan");
  const pane = document.getElementById("preview-pane");
  if (!scan || !pane) return;

  scan.hidden = false;
  scan.classList.remove("playing");
  pane.classList.remove("revealing");
  void scan.offsetWidth;
  scan.classList.add("playing");
  pane.classList.add("revealing");

  setTimeout(() => {
    scan.hidden = true;
    scan.classList.remove("playing");
    pane.classList.remove("revealing");
  }, 1800);
}
