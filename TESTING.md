# Testing yamlcv

## Clean Slate Test (Docker)

```bash
# spin up clean debian container
docker run -it --rm debian:bookworm-slim bash

# install bare minimum
apt update && apt install -y curl git

# run install script (force no cache)
curl -fsSL "https://raw.githubusercontent.com/SakshamKarnawat/yamlcv/main/install.sh?nocache=$(date +%s)" | sh

# source uv if just installed
. "$HOME/.local/bin/env"

# go to installed dir
cd ~/yamlcv

# test CLI build
uv run templates/jake/build.py

# verify output
ls generated/
# expected: resume.tex, resume.pdf
```

## Web UI Test

```bash
cd ~/yamlcv
uv run server.py
# open http://localhost:7878
# fill in form fields in left pane
# cmd+s or click Save & Build
# verify PDF updates in right pane
```

## Watch Mode Test

```bash
cd ~/yamlcv
uv run templates/jake/build.py --watch
# edit templates/jake/details.yml in another terminal/editor
# verify resume.tex regenerates and PDF rebuilds
```

## Verify PDF

```bash
# copy PDF out of container to host
docker ps  # get container ID
docker cp <container_id>:/root/yamlcv/generated/resume.pdf ~/Desktop/
# open from Desktop and verify layout
```

## Checklist

- [ ] Install script runs clean on fresh Debian
- [ ] `uv` auto-installs if missing
- [ ] `texlive` auto-installs if missing
- [ ] PDF generates correctly
- [ ] Web UI loads at localhost:7878
- [ ] Save & Build triggers PDF rebuild
- [ ] Watch mode detects `.yml` changes
- [ ] PDF preview updates in web UI
- [ ] Form fields render correctly from schema.yml
- [ ] Template switcher works
