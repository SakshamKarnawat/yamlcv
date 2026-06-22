# ResumeKit

This project started because I wanted to build a better resume. All the good templates I found online were formatted as LaTeX, which means I had to use Overleaf.

As someone who is actively trying to use FOSS over enterprise software for almost everything, this didn't sit well with me. So here's ResumeKit.

> macOS and Linux ✅  · Windows support planned

## Get started

Edits save to `templates/classic/details.personal.yml` (auto-created from the sample on first run). PDF output: `generated/resume.pdf`.

Pick one:

| # | Setup | Interface | Local deps |
|---|-------|-----------|------------|
| 1 | Docker | Web UI | None |
| 2 | Local install | Web UI | TeX Live + uv |
| 3 | Local install | CLI watch | TeX Live + uv |

**1. Docker — web UI**

   ```bash
   git clone https://github.com/SakshamKarnawat/ResumeKit
   cd ResumeKit && docker compose up -d --build
   # → http://localhost:7878
   ```

   `./ui` and `server.py` are volume-mounted — after the first build, run `docker compose restart` to pick up UI/server changes (rebuild only when the Dockerfile or dependencies change).

**2. Local — web UI**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/ResumeKit/main/install.sh | sh
   cd ~/ResumeKit && uv run server.py --details templates/classic/details.personal.yml
   # → http://localhost:7878
   ```

**3. Local — CLI watch mode**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/ResumeKit/main/install.sh | sh
   cd ~/ResumeKit && uv run templates/classic/build.py --watch --details templates/classic/details.personal.yml
   ```

Use `--details ~/path/to/my-resume.yml` to keep personal data outside the repo.

## Features

- Split-pane web editor with live PDF preview and instant error feedback
- **Auto-save** with configurable delay (Off, 2s–1 min; default **30 sec**) and countdown indicator
- **Showpiece animations** — boot cinematic on load, build pipeline on manual Save & Build, holo-scan on PDF refresh (respects `prefers-reduced-motion`)
- Subtle UI motion — ambient background, pipeline glow, section transitions, resizable split pane
- **Drag-and-drop** bullet reordering; **↑↓ arrows** for sections, entries, links, and skills
- **Undo / redo** (⌘Z / ⌘⇧Z) across form edits
- **Multiple profiles** — switch YAML files in the editor (e.g. one resume per role)
- **Reset to sample** — wipe all personal data and start fresh from the editor footer
- **Downloads** — PDF (primary), plus optional YAML source and generated TeX
- **Page count badge** with warning when resume exceeds one page
- **Onboarding tour** — guided walkthrough of the UI (replay with `?`)
- **Keyboard shortcuts** panel (`/`)
- **Classic** layout — clean, ATS-friendly; inspired by [Jake's Resume](https://github.com/jakegut/resume)
- Fonts: Charter, Lato, Inter, Source Sans Pro, Roboto, Outfit, Times
- Reorder sections; optional title, summary, projects, contact fields
- Experience and project links; bold/italic formatting in bullets
- FontAwesome icons, colored links

## Profiles

Profiles are stored in `generated/profiles.json` (auto-created on first run). Each profile points to its own YAML file under `templates/`:

```json
[
  { "id": "personal", "name": "Personal", "path": "templates/classic/details.personal.yml" }
]
```

Use the profile dropdown to switch — the PDF rebuilds from that profile's YAML on disk. **✎** renames the profile and its YAML file, **+** add, **−** delete (YAML kept on delete only). **Reset** in the editor footer wipes all personal data and restores the sample resume.

Pass `--details` on startup to set the default Personal profile path.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘S | Save & build PDF |
| ⌘Z | Undo |
| ⌘⇧Z / ⌘Y | Redo |
| ⌘B / ⌘I | Bold / italic in bullet fields |
| `/` | Open shortcuts panel |
| `?` | Replay onboarding tour |
| Esc | Close modals / skip tour |

## Project layout

```
ResumeKit/
├── server.py              # Web UI + API
├── templates/classic/     # Classic layout (schema, build, details)
├── ui/                    # Frontend
│   ├── index.html         # Boot overlay + app shell (#app-root)
│   ├── styles.css         # Main UI styles
│   ├── spectacle.css      # Boot, build, and PDF scan animations
│   └── js/                # ES modules (app, api, spectacle, …)
├── generated/             # resume.pdf, profiles.json, build logs
└── tests/                 # Automated pytest suite
```

Each template is a folder under `templates/` with three required files:

| File | Purpose |
|------|---------|
| `details.yml` | Sample resume YAML (copied to `details.personal.yml` on first run) |
| `schema.yml` | Form structure for the web UI |
| `build.py` | Reads YAML → writes `generated/resume.tex` → runs `latexmk` for PDF |

The server auto-discovers templates: any folder under `templates/` that contains both `build.py` and `schema.yml` appears in the editor dropdown.

## Adding a template

Use a **lowercase slug** for the folder name (e.g. `modern`, `compact`). That slug is the template id in API calls (`?template=modern`).

### 1. Scaffold the folder

Copy the Classic template as a starting point:

```bash
cp -R templates/classic templates/modern
```

Remove personal data and build output from the copy:

```bash
rm -f templates/modern/details.personal.yml
```

Edit the three core files for your layout. Keep the same YAML shape at first; change `build.py` to emit your LaTeX. Optional extras: `fonts/` for bundled fonts (see Classic’s `build.py` for the `\fontspec` path pattern).

### 2. Implement `build.py`

Your script must:

1. Read the YAML path passed via `--details` (or default to `details.yml` in the template folder).
2. Write **`generated/resume.tex`** relative to the project root (run from repo root, same as Classic).
3. Invoke `latexmk` so **`generated/resume.pdf`** is produced.
4. Exit **`0`** on success, **`2`** if TeX succeeded with warnings (e.g. overfull hbox), non-zero on hard failure.

Smoke-test from the repo root:

```bash
uv run templates/modern/build.py --details templates/modern/details.yml
open generated/resume.pdf   # macOS
```

Watch mode (optional): Classic’s `build.py` includes a `--watch` flag using `watchdog` — reuse that pattern for local CLI editing.

### 3. Define `schema.yml`

This file drives the web form (sections, field types, placeholders). It does **not** need to match Classic field-for-field, but every key your `build.py` reads should have a corresponding form field (or a safe default in code).

Field types Classic uses: `text`, `email`, `textarea`, `toggle`, `select`, `single`, `list`, `links`, `bullets`, `keyvalue`. Copy a section block from `templates/classic/schema.yml` and adapt labels/keys.

### 4. Provide sample `details.yml`

Use obviously fake placeholder contact info (Classic uses **Taylor Morgan**). This file is tracked in git; users get `details.personal.yml` copied from it on first run (`details.personal.yml` is gitignored).

### 5. Register the display name and attribution

The dropdown label and footer credit live in **`ui/js/state.js`**. Add entries keyed by your template slug:

```javascript
export const TEMPLATE_LABELS = {
  classic: "Classic",
  modern: "Modern",   // add yours
};

export const TEMPLATE_ATTRIBUTIONS = {
  classic: {
    name: "Classic",
    inspiration: "Jake's Resume",
    inspirationUrl: "https://github.com/jakegut/resume",
    author: "Jake Gutierrez",
    authorUrl: "https://github.com/jakegut/resume",
    license: "MIT",
    basedOn: {
      name: "sb2nov/resume",
      url: "https://github.com/sb2nov/resume",
    },
  },
  modern: {
    name: "Modern",
    inspiration: "Your Layout Name",      // layout you derived from
    inspirationUrl: "https://github.com/you/your-latex-resume",
    author: "Original Author Name",
    authorUrl: "https://github.com/you",
    license: "MIT",                        // must match upstream license
    basedOn: {
      name: "prior-art/repo",              // earlier template, if any
      url: "https://github.com/prior-art/repo",
    },
  },
};
```

The editor footer renders: **{name} layout · inspired by {inspiration} ({license}) · {author} · based on {basedOn}**.

**Attribution guidelines:**

- If your LaTeX layout comes from someone else’s repo, **keep their license** and credit the **original author and repository** in `inspiration` / `author` / `basedOn`.
- ResumeKit’s template name (e.g. “Modern”) is yours; upstream work stays attributed (Classic → [Jake's Resume](https://github.com/jakegut/resume) → [sb2nov/resume](https://github.com/sb2nov/resume)).
- For wholly original layouts, point `inspiration` and `author` at your repo; use `basedOn` only when you forked or adapted earlier work.
- If you add a template to this repo, add a one-line credit under **Features** in this README (same style as Classic).

### 6. Wire up profiles (web UI)

Profiles point at YAML files, not templates directly. When adding a profile for a new template, use a path under your template folder, e.g. `templates/modern/details.personal.yml`. The **+** button in the editor pre-fills `templates/classic/…` — change that default in the prompt to your template path.

To make a new template the default for Personal, either edit `generated/profiles.json` or start the server with:

```bash
uv run server.py --details templates/modern/details.personal.yml
```

### 7. Verify in the web UI

```bash
uv run server.py
# → http://localhost:7878
```

Checklist:

- [ ] Template appears in the dropdown (discovered automatically)
- [ ] Form loads from `schema.yml`
- [ ] Save/build produces PDF and page count
- [ ] Footer shows correct attribution
- [ ] CLI watch mode works (if implemented)

### 8. Tests (recommended)

Add coverage in `tests/test_server.py` if your template changes server behaviour. At minimum, run the existing suite:

```bash
uv run --with pytest pytest tests/ -v
```

## Testing

**Automated (recommended):**

```bash
uv run --with pytest pytest tests/ -v
```

35 tests cover server helpers, all HTTP API routes (including reset), profile CRUD, save/build pipeline, PDF/TeX delivery, static assets (including spectacle UI), and page-count parsing.

**Manual smoke tests:** see [TESTING.md](TESTING.md) for Docker, install script, CLI watch, and UI feature checklists.

## Notes

- Keep personal details outside the repo: `uv run server.py --details ~/path/to/details.personal.yml`
- VS Code: disable auto-rebuild on save with `"latex-workshop.latex.autoBuild.run": "never"` in `.vscode/settings.json`

## Planned work

- Template preview thumbnails in the editor (tracked separately)
- See [open issues](https://github.com/SakshamKarnawat/ResumeKit/issues)
