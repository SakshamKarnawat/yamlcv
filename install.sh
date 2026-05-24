#!/bin/sh
set -e

REPO="https://github.com/SakshamKarnawat/yamlcv"
DEST="$HOME/yamlcv"

echo "→ Installing yamlcv..."

# Check git
if ! command -v git > /dev/null 2>&1; then
  echo "✗ 'git' not found. Install git: https://git-scm.com"
  exit 1
fi

# Auto-install uv if missing
if ! command -v uv > /dev/null 2>&1; then
  echo "→ uv not found, installing..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  . "$HOME/.local/bin/env"
fi

# Auto-install texlive if missing
if ! command -v latexmk > /dev/null 2>&1; then
  echo "→ texlive not found, installing..."
  if command -v brew > /dev/null 2>&1; then
    brew install texlive
  elif command -v apt-get > /dev/null 2>&1; then
    apt-get install -y texlive-full
  elif command -v apk > /dev/null 2>&1; then
    apk add texlive
  else
    echo "✗ Cannot auto-install texlive. Install manually:"
    echo "  Mac:   brew install texlive"
    echo "  Linux: sudo apt install texlive-full"
    exit 1
  fi
fi

# Clone repo
if [ -d "$DEST" ]; then
  echo "→ yamlcv already exists, pulling latest..."
  git -C "$DEST" pull
else
  git clone "$REPO" "$DEST"
fi

echo ""
echo "✓ yamlcv installed at $DEST"
echo ""
echo "⚠️  If uv was just installed, run this first:"
echo "  . \$HOME/.local/bin/env"
echo ""
echo "Next steps:"
echo "  Option A — Web UI (recommended):"
echo "    cd $DEST && uv run server.py"
echo ""
echo "  Option B — CLI watch mode:"
echo "    Edit details in $DEST/templates/jake/details.yml"
echo "    cd $DEST && uv run templates/jake/build.py --watch"
echo ""
echo "  PDF appears in: $DEST/generated/"