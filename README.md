# yamlcv

This project started because I wanted to build a better resume. All the good templates I found online were formatted as LaTeX, which means I had to use Overleaf.

As someone who is actively trying to use FOSS over enterprise software for almost everything, this didn't sit well with me. So here's yamlcv (looking for a better name)

> macOS and Linux ✅  · Windows support planned

## Get started

Edits save to `templates/jake/details.personal.yml` (auto-created from the sample on first run). PDF output: `generated/resume.pdf`.

Pick one:

| # | Setup | Interface | Local deps |
|---|-------|-----------|------------|
| 1 | Docker | Web UI | None |
| 2 | Local install | Web UI | TeX Live + uv |
| 3 | Local install | CLI watch | TeX Live + uv |

**1. Docker — web UI**

   ```bash
   git clone https://github.com/SakshamKarnawat/yamlcv
   cd yamlcv && docker compose up -d --build
   # → http://localhost:7878
   ```

**2. Local — web UI**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/yamlcv/main/install.sh | sh
   cd ~/yamlcv && uv run server.py --details templates/jake/details.personal.yml
   # → http://localhost:7878
   ```

**3. Local — CLI watch mode**

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SakshamKarnawat/yamlcv/main/install.sh | sh
   cd ~/yamlcv && uv run templates/jake/build.py --watch --details templates/jake/details.personal.yml
   ```

Use `--details ~/path/to/my-resume.yml` to keep personal data outside the repo.

## Features

- Split-pane web editor with live PDF preview and instant error feedback
- Jake template — clean, ATS-friendly, widely used in SWE hiring
- Fonts: Charter, Lato, Inter, Source Sans Pro, Roboto, Outfit, Times
- Reorder sections; optional title, summary, projects, contact fields
- Experience and project links; bold/italic formatting in bullets
- FontAwesome icons, colored links, page overflow warning

## Notes

- Keep personal details outside the repo: `uv run server.py --details ~/path/to/details.personal.yml` or `uv run templates/jake/build.py --details ~/path/to/details.personal.yml`
- To add a new template: create `templates/{name}/` with its own `details.yml`, `build.py`, and `schema.yml`
- VS Code: disable auto-rebuild on save with `"latex-workshop.latex.autoBuild.run": "never"` in `.vscode/settings.json`

## Planned work

See [open issues](https://github.com/SakshamKarnawat/yamlcv/issues).