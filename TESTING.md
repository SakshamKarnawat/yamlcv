# Testing ResumeKit

Manual test guide for the three get-started paths. Last verified: June 2026.

Personal resume data: `templates/jake/details.personal.yml` (auto-created from sample `details.yml` on first run).
PDF output: `generated/resume.pdf`.

## 1. Docker — web UI

```bash
git clone https://github.com/SakshamKarnawat/ResumeKit
cd ResumeKit && docker compose up -d --build
# → http://localhost:7878
```

- [x] Container starts and serves UI at localhost:7878
- [x] `details.personal.yml` created on first run
- [x] Form fields load from schema
- [x] Save & Build updates PDF preview
- [x] Initial PDF builds on server startup (no stale empty preview)

```bash
docker compose down
```

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

## 3. Local — web UI

```bash
cd ~/ResumeKit
uv run server.py --details templates/jake/details.personal.yml
# → http://localhost:7878
```

- [x] Browser opens automatically (non-Docker)
- [x] Save & Build triggers PDF rebuild
- [x] PDF preview updates in right pane
- [x] Validation errors shown before LaTeX runs

## 4. Local — CLI watch mode

```bash
cd ~/ResumeKit
uv run templates/jake/build.py --watch --details templates/jake/details.personal.yml
# edit templates/jake/details.personal.yml in another terminal
```

- [x] Builds PDF once on start
- [x] Rebuilds when `details.personal.yml` is saved
- [x] `generated/resume.tex` and `generated/resume.pdf` updated

One-shot CLI build (no watch):

```bash
cd ~/ResumeKit
uv run templates/jake/build.py --details templates/jake/details.personal.yml
ls generated/
# expected: resume.tex, resume.pdf
```

## 5. Feature smoke tests

- [x] Section reorder (Experience, Education, Projects, Skills)
- [x] Experience project links render in PDF
- [x] Bold/italic in bullets (`**bold**`, `*italic*`)
- [x] Optional contact fields (empty fields omitted from PDF)
- [x] Font options including Outfit (xelatex)
- [x] Colored links option
- [x] Page overflow warning when resume exceeds 1 page
- [x] Template attribution shown in UI footer

## 6. Private details path

```bash
uv run server.py --details ~/path/to/my-resume.yml
uv run templates/jake/build.py --watch --details ~/path/to/my-resume.yml
```

- [x] Reads and writes custom path outside repo
- [x] `details.personal.yml` remains gitignored
