# yamlcv

YAML-driven LaTeX resume builder for developers.
Edit one file. Get a professional PDF.

## Prerequisites

- Runs on macOS and Linux with git installed

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/yamlcv/main/install.sh | sh
cd ~/yamlcv && uv run server.py
```

## Features

- **Web UI** — split-pane editor with live PDF preview, YAML syntax highlighting, and instant error feedback
- **Watch mode** — CLI alternative that auto-rebuilds on every save
- **Jake's template** — clean, ATS-friendly, widely recognized in SWE hiring
- **Charter font** — serif, easy on the eyes, recruiter-friendly
- **FontAwesome icons** — optional icons on contact links
- **Page overflow warning** — alerts you if resume spills to 2 pages
- **Optional sections** — projects, title, summary, website all optional
- **Project links** — per-project demo and repo links
- **Private details** — keep personal yml outside repo via `--details` flag
- **YAML validation** — clear error shown before LaTeX even runs

## Quick Start

```bash
cd ~/yamlcv

# web UI (recommended)
uv run server.py

# CLI watch mode
uv run templates/jake/build.py --watch
```

Open `templates/jake/details.yml` and fill in your info. PDF appears in `generated/`.

## Notes

- `projects` section optional — remove from `details.yml` to exclude
- Keep personal details outside repo: `--details ~/path/to/details.personal.yml`
- To add a new template: create `templates/{name}/` with its own `details.yml` and `build.py`
- VS Code: disable auto-rebuild on save with `"latex-workshop.latex.autoBuild.run": "never"` in .vscode/settings.json

## Roadmap

- More templates (McDowell, etc.)
- More customization options
- Proper attribution for templates and tooling used
