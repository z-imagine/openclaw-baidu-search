#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PACKAGE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if [ -f "$PACKAGE_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PACKAGE_DIR/.env"
  set +a
fi

if command -v clawhub >/dev/null 2>&1; then
  CLAWHUB_BIN=clawhub
else
  CLAWHUB_BIN="npx -y clawhub@latest"
fi

if [ "${1:-}" = "--" ]; then
  shift
fi

cd "$PACKAGE_DIR"

PACKAGE_NAME=$(node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).name")
PACKAGE_VERSION=$(node -p "JSON.parse(require('fs').readFileSync('package.json', 'utf8')).version")
DISPLAY_NAME=$(node -p "JSON.parse(require('fs').readFileSync('openclaw.plugin.json', 'utf8')).name")

CLAWHUB_PACKAGE_TAGS=${CLAWHUB_PACKAGE_TAGS:-latest}
CLAWHUB_SOURCE_REPO=${CLAWHUB_SOURCE_REPO:-z-imagine/openclaw-baidu-search}
CLAWHUB_SOURCE_PATH=${CLAWHUB_SOURCE_PATH:-.}

set -- \
  package publish "$PACKAGE_DIR" \
  --family code-plugin \
  --name "$PACKAGE_NAME" \
  --display-name "$DISPLAY_NAME" \
  --version "$PACKAGE_VERSION" \
  --tags "$CLAWHUB_PACKAGE_TAGS" \
  --source-repo "$CLAWHUB_SOURCE_REPO" \
  --source-path "$CLAWHUB_SOURCE_PATH" \
  "$@"

if [ -n "${CLAWHUB_CHANGELOG:-}" ]; then
  set -- "$@" --changelog "$CLAWHUB_CHANGELOG"
fi

if [ -n "${CLAWHUB_SOURCE_COMMIT:-}" ]; then
  set -- "$@" --source-commit "$CLAWHUB_SOURCE_COMMIT"
fi

if [ -n "${CLAWHUB_SOURCE_REF:-}" ]; then
  set -- "$@" --source-ref "$CLAWHUB_SOURCE_REF"
fi

cd "$PACKAGE_DIR"
pnpm run build

if [ "$CLAWHUB_BIN" = "clawhub" ]; then
  exec clawhub "$@"
else
  exec npx -y clawhub@latest "$@"
fi
