#!/bin/sh
set -e

REPO="https://github.com/abc/yamlcv"
DEST="$HOME/yamlcv"

echo "→ Installing yamlcv..."

# Check dependencies
check() {
  if ! command -v "$1" > /dev/null 2>&1; then
    echo "✗ '$1' not found. $2"
    exit 1
  fi
}

check git  "Install git: https://git-scm.com"
check uv   "Install uv: https://docs.astral.sh/uv/getting-started/installation"

# Check texlive (latexmk is the key binary)
if ! command -v latexmk > /dev/null 2>&1; then
  echo "✗ texlive not found."
  echo "  Mac:   brew install texlive"
  echo "  Linux: sudo apt install texlive-full"
  exit 1
fi

# Clone repo
if [ -d "$DEST" ]; then
  echo "→ yamlcv already exists at $DEST, pulling latest..."
  git -C "$DEST" pull
else
  git clone "$REPO" "$DEST"
fi

echo ""
echo "✓ yamlcv installed at $DEST"
echo ""
echo "Next steps:"
echo "  1. Edit your details:  $DEST/templates/jake/details.yml"
echo "  2. Build + watch:      cd $DEST && uv run templates/jake/build.py --watch"
echo "  3. PDF appears in:     $DEST/generated/"