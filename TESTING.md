# Testing ResumeKit

Manual and automated test guide. Last updated: June 2026.

Personal resume data: `templates/classic/details.personal.yml` (auto-created from sample `details.yml` on first run).  
PDF output: `generated/resume.pdf`.  
Profile registry: `generated/profiles.json` (auto-created on first run).

---

## Automated tests

Run the full suite from the repo root:

```bash
uv run --with pytest pytest tests/ -v
```

### What is covered

| Area | Tests |
|------|-------|
| **Helpers** | `load_profiles`, `find_profile`, `get_page_count`, `ensure_details_file`, `reset_workspace` |
| **HTTP — core** | `/`, `/api/status`, `/api/templates`, `/api/build-info` |
| **HTTP — data** | `/api/schema`, `/api/details`, `/api/save`, `/api/build` |
| **HTTP — profiles** | `GET/POST/PUT/DELETE /api/profiles` (switch rebuilds PDF from disk) |
| **HTTP — reset** | `POST /api/reset` (clears generated/, personal YAMLs, restores sample) |
| **HTTP — exports** | `/api/pdf`, `/api/tex` |
| **HTTP — static** | `/`, `/styles.css`, `/spectacle.css`, `/js/app.js`, `/js/spectacle.js`, other UI modules |
| **Build pipeline** | TeX generation; PDF build when `latexmk` is installed |
| **Error paths** | PDF/TeX 404 before build; invalid YAML returns `ok: false`; unknown profile returns 404 |

Tests run against an isolated temp workspace (copied templates + UI) on a random local port — no need to stop a running dev server.

### Requirements

- Python 3.14+ (via `uv`)
- `pytest` (installed automatically with `--with pytest`)
- `latexmk` + TeX Live for the PDF build test (skipped if `latexmk` is not on `PATH`)

---

## 1. Docker — web UI

```bash
git clone https://github.com/SakshamKarnawat/ResumeKit
cd ResumeKit && docker compose up -d --build
# → http://localhost:7878
```

- [x] Container starts and serves UI at localhost:7878
- [x] Boot splash → cinematic → editor (no blank split pane during load)
- [x] `details.personal.yml` created on first run
- [x] `generated/profiles.json` created on first run (no local pre-seeding)
- [x] Profiles and YAML persist via `./generated` and `./templates` volume mounts
- [x] UI and server changes apply without rebuild (`./ui` and `./server.py` mounted)
- [x] Form fields load from schema
- [x] Save & Build updates PDF preview
- [x] Initial PDF builds on server startup (no stale empty preview)

```bash
docker compose down
docker compose restart   # pick up ./ui or server.py changes without rebuild
```

---

## 2. Local install script

Fresh Debian container (optional — simulates clean machine):

```bash
docker run -it --rm debian:bookworm-slim bash
apt update && apt install -y curl git
curl -fsSL "https://raw.githubusercontent.com/SakshamKarnawat/ResumeKit/main/install.sh?nocache=$(date +%s)" | sh
. "$HOME/.local/bin/env"
```

On macOS/Linux directly:

```bash
curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/ResumeKit/main/install.sh | sh
cd ~/ResumeKit
```

- [x] Install script completes without errors
- [x] `uv` auto-installs if missing
- [x] TeX Live auto-installs if missing
- [x] Repo cloned to `~/ResumeKit`

---

## 3. Local — web UI

```bash
cd ~/ResumeKit
uv run server.py --details templates/classic/details.personal.yml
# → http://localhost:7878
```

- [x] Browser opens automatically (non-Docker)
- [x] Boot sequence: logo splash → YAML→LaTeX→PDF cinematic → editor (click overlay to skip)
- [x] No blank split pane or resizer visible before/during boot
- [x] Save & Build triggers PDF rebuild
- [x] PDF preview updates in right pane
- [x] Validation errors shown before LaTeX runs
- [ ] Auto-save fires after selected delay (default 30 sec); countdown shows time remaining
- [ ] Undo/redo (⌘Z / ⌘⇧Z) restores form state
- [ ] Profile dropdown shows **Personal** by default (`details.personal.yml`)
- [ ] **Download PDF** button and **▾** menu (YAML / TeX exports)
- [ ] Profile switch rebuilds PDF from that profile's YAML (not stale preview)
- [ ] Profile switch loads correct YAML; **✎** renames; **+** adds; **−** deletes (YAML kept on disk)
- [ ] Template preview thumbnails (not yet implemented)
- [ ] Page count badge updates after build; warns when > 1 page
- [ ] Onboarding tour (`?`) highlights main UI controls
- [ ] Shortcuts panel opens with `/`
- [ ] Section ↑↓; drag ⠿ on bullet rows only; ↑↓ on entries, links, and skills
- [ ] Editor / Preview tabs work at ≤960px width
- [ ] **Reset** in editor footer restores sample resume and default profile

---

## 4. Local — CLI watch mode

```bash
cd ~/ResumeKit
uv run templates/classic/build.py --watch --details templates/classic/details.personal.yml
# edit templates/classic/details.personal.yml in another terminal
```

- [x] Builds PDF once on start
- [x] Rebuilds when `details.personal.yml` is saved
- [x] `generated/resume.tex` and `generated/resume.pdf` updated

One-shot CLI build (no watch):

```bash
cd ~/ResumeKit
uv run templates/classic/build.py --details templates/classic/details.personal.yml
ls generated/
# expected: resume.tex, resume.pdf
```

---

## 5. UI animations & motion

Boot and showpiece animations live in `ui/spectacle.css` + `ui/js/spectacle.js`. The app shell (`#app-root`) stays `hidden` until both data load and the boot sequence finish.

### Boot (every page load)

- [ ] Instant logo splash with “Loading…” hint
- [ ] Crossfade into cinematic (logo slam, glitch title, YAML→LaTeX→PDF nodes)
- [ ] Click anywhere on overlay to skip
- [ ] Editor appears after fade — no flash of empty split pane
- [ ] With `prefers-reduced-motion: reduce`, boot is skipped and app appears immediately after load

### Manual Save & Build

- [ ] **Save & Build** (⌘S) plays full-screen build pipeline animation
- [ ] Auto-save does **not** trigger build spectacle (only manual save)

### PDF refresh

- [ ] **↻ Refresh** on preview pane plays holo-scan effect over the PDF area

---

## 6. Feature smoke tests

### Editor & PDF

- [x] Section reorder via ↑↓ on section headers (Experience, Education, Projects, Skills)
- [x] Experience project links render in PDF
- [x] Bold/italic in bullets (`**bold**`, `*italic*`)
- [x] Optional contact fields (empty fields omitted from PDF)
- [x] Font options including Outfit (xelatex)
- [x] Colored links option
- [x] Page overflow warning when resume exceeds 1 page
- [x] Template attribution shown in UI footer
- [ ] Header shows resume name as you type
- [ ] Unsaved indicator appears after edits

### Profiles & exports

- [ ] Switch profile → form reloads from that YAML path
- [ ] Save writes to active profile's YAML file
- [ ] YAML download matches current form (including unsaved edits)
- [ ] TeX download available after successful build
- [ ] TeX download shows error toast if no build yet

---

## 7. API smoke tests (curl)

With the server running on port 7878:

```bash
# Core
curl -s http://localhost:7878/api/status
curl -s http://localhost:7878/api/templates
curl -s http://localhost:7878/api/build-info

# Schema & details (profile-aware)
curl -s "http://localhost:7878/api/schema?template=classic"
curl -s "http://localhost:7878/api/details?template=classic&profile=personal"

# Profiles
curl -s http://localhost:7878/api/profiles
curl -s -X POST http://localhost:7878/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Role","path":"templates/classic/details.test-role.yml"}'

# Exports (after a successful save/build)
curl -s -o /dev/null -w "%{http_code}" http://localhost:7878/api/pdf      # expect 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:7878/api/tex      # expect 200

# Save
curl -s -X POST "http://localhost:7878/api/save?template=classic&profile=personal" \
  -H "Content-Type: text/plain" \
  --data-binary @templates/classic/details.personal.yml
# expect JSON: {"ok": true, "pages": N, ...}

# Reset (clears generated/, personal YAMLs, restores sample profile)
curl -s -X POST "http://localhost:7878/api/reset?template=classic"
```

---

## 8. Private details path

```bash
uv run server.py --details ~/path/to/my-resume.yml
uv run templates/classic/build.py --watch --details ~/path/to/my-resume.yml
```

- [x] Reads and writes custom path outside repo
- [x] `details.personal.yml` remains gitignored
- [x] `--details` updates default profile path in `generated/profiles.json`

---

## Adding tests

New server routes or build behavior should get pytest coverage in `tests/test_server.py`.  
New UI features should get a checkbox in section 3 or 5 above.

Run before opening a PR:

```bash
uv run --with pytest pytest tests/ -v
```

---

## Reset from scratch

Use **Reset** in the editor footer (next to GitHub). This calls `POST /api/reset` and:

- Clears `generated/` (PDF, profiles.json, build logs)
- Deletes all `templates/*/details.*.yml` personal files (keeps sample `details.yml`)
- Recreates default **Personal** profile and sample YAML
- Rebuilds the PDF

---
