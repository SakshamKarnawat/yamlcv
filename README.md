# yamlcv

This project started because I wanted to build a better resume.
All the good templates I found online were formatted as LaTeX, which means I had to use Overleaf.
As someone who is actively trying to use FOSS over enterprise software for almost everything, this didn't sit well with me.
So here's yamlcv (looking for a better name :/)

## Prerequisites

- macOS or Linux ✅ (Windows support planned)

## Installation

### Option 1 — Docker (easiest, no deps needed)

```bash
git clone https://github.com/SakshamKarnawat/yamlcv
cd yamlcv && docker compose up -d --build
```

Open `http://localhost:7878`

### Option 2 — Install script (recommended for local use)

```bash
curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/yamlcv/main/install.sh | sh
cd ~/yamlcv && uv run server.py
```

Installs `texlive` and `uv` automatically if missing.

### Option 3 — Manual

```bash
git clone https://github.com/SakshamKarnawat/yamlcv
cd yamlcv
brew install texlive        # mac
# sudo apt install texlive-full  # linux
curl -LsSf https://astral.sh/uv/install.sh | sh
uv run server.py
```

## Usage

```bash
cd ~/yamlcv

# web UI (recommended)
uv run server.py

# CLI watch mode
uv run templates/jake/build.py --watch
```

Open `templates/jake/details.yml` and fill in your info. PDF appears in `generated/`.

## Features

- **Web UI** — split-pane form editor with live PDF preview and instant error feedback
- **Watch mode** — CLI alternative that auto-rebuilds on every save
- **Jake's template** — clean, ATS-friendly, widely recognized in SWE hiring
- **Charter font** — serif, easy on the eyes, recruiter-friendly
- **FontAwesome icons** — optional icons on contact links
- **Page overflow warning** — alerts you if resume spills to 2 pages
- **Optional sections** — projects, title, summary, website all optional
- **Project links** — per-project demo and repo links
- **Private details** — keep personal yml outside repo via `--details` flag
- **YAML validation** — clear error shown before LaTeX even runs

## Notes

- Keep personal details outside repo: `uv run templates/jake/build.py --details ~/path/to/details.personal.yml`
- To add a new template: create `templates/{name}/` with its own `details.yml`, `build.py`, and `schema.yml`
- VS Code: disable auto-rebuild on save with `"latex-workshop.latex.autoBuild.run": "never"` in `.vscode/settings.json`

## Roadmap

- Add option to move sections up and down
- More templates (McDowell, etc.)
- More customization options
- Proper attribution for templates and tooling used
- Uninstall script with option to keep generated resume
- Add .ttf import for users to allow custom fonts