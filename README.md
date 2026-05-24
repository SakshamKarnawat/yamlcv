# yamlcv

YAML-driven LaTeX resume builder for developers.
Edit one file. Get a professional PDF.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/yamlcv/main/install.sh | sh
```

## Prerequisites

- macOS or Linux (Windows not supported)
- `git` — [install](https://git-scm.com)
- **Editor:** any — for live PDF preview in editor:
  - VS Code: [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop)
  - Neovim: `vimtex`
  - JetBrains: `TeXiFy IDEA`

## Quick Start

```bash
cd ~/yamlcv

# option A — web UI (recommended)
uv run server.py

# option B — CLI watch mode
vim templates/jake/details.yml
uv run templates/jake/build.py --watch
```

## Structure

yamlcv/
├── install.sh
├── server.py
├── templates/
│ └── jake/
│ ├── template.tex ← original (do not edit)
│ ├── details.yml ← your info goes here
│ └── build.py ← generates resume from details.yml
└── generated/ ← auto-generated output (do not edit)

## Options (`details.yml`)

```yaml
options:
  icons: true # fontawesome icons in links
  font: "charter" # charter | times | default
  color_links: false # colored vs underlined links
```

## Notes

- `projects` section is optional — remove from `details.yml` to exclude
- To disable VS Code auto-rebuild on save: `"latex-workshop.latex.autoBuild.run": "never"` in `settings.json`
- To add a new template: create `templates/{name}/` with its own `details.yml` and `build.py`

## Roadmap

- More templates
- More customization options
