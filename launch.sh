#!/usr/bin/env bash
# Launch the ghscreensaver Electron app from any directory.
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm not found; install Node.js first" >&2
  exit 1
fi

if [ ! -x node_modules/.bin/electron ]; then
  echo "Installing dependencies..."
  npm install
fi

exec node_modules/.bin/electron . "$@"
