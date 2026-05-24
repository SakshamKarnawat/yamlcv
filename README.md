# yamlcv

YAML-driven LaTeX resume builder for developers.
Edit one file. Get a professional PDF.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/abc/yamlcv/main/install.sh | sh
```

## Prerequisites & Assumptions

- **OS:** macOS or Linux (Windows not supported)
- **Shell:** bash/zsh
- **Required:**
  - `git`
  - `brew install texlive` (Mac) or `sudo apt install texlive-full` (Linux)
  - `uv` — [install](https://docs.astral.sh/uv/getting-started/installation)
- **Editor:** any — but for live PDF preview, VS Code + [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) is recommended
  - Neovim: `vimtex` plugin
  - JetBrains: `TeXiFy IDEA` plugin

## Structure

yamlcv/
├── install.sh
├── templates/
│ └── jake/
│ ├── template.tex ← original template (do not edit)
│ ├── details.yml ← sample data (edit this)
│ └── build.py ← generates resume from details.yml
└── generated/ ← auto-generated output (do not edit)

## Quick Start

```bash
# fill in your details
vim templates/jake/details.yml

# build + watch
uv run templates/jake/build.py --watch

# PDF appears in generated/
```

## Options (`details.yml`)

```yaml
options:
  icons: true # fontawesome icons in links
  font: "charter" # charter | times | default
  color_links: false # colored vs underlined links
```

## Notes

- `projects` section is optional — remove it from `details.yml` to exclude
- To disable VS Code auto-rebuild on save: set `"latex-workshop.latex.autoBuild.run": "never"` in `settings.json`
- To add a new template: create `templates/{name}/` with its own `details.yml` and `build.py`
