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
CLAWHUB_SOURCE_REF=${CLAWHUB_SOURCE_REF:-main}

resolve_source_repo_url() {
  case "$1" in
    http://*|https://*)
      printf '%s\n' "$1"
      ;;
    *)
      printf 'https://github.com/%s.git\n' "$1"
      ;;
  esac
}

resolve_source_commit() {
  repo_url=$(resolve_source_repo_url "$1")
  ref_name=$2
  git ls-remote "$repo_url" "refs/heads/$ref_name" 2>/dev/null | awk 'NR==1 { print $1 }'
}

if [ -z "${CLAWHUB_SOURCE_COMMIT:-}" ]; then
  CLAWHUB_SOURCE_COMMIT=$(resolve_source_commit "$CLAWHUB_SOURCE_REPO" "$CLAWHUB_SOURCE_REF")
fi

if [ -z "${CLAWHUB_SOURCE_COMMIT:-}" ]; then
  echo "Error: could not resolve CLAWHUB_SOURCE_COMMIT for $CLAWHUB_SOURCE_REPO@$CLAWHUB_SOURCE_REF" >&2
  echo "Set CLAWHUB_SOURCE_COMMIT explicitly or push the source repository first." >&2
  exit 1
fi

set -- \
  package publish "$PACKAGE_DIR" \
  --family code-plugin \
  --name "$PACKAGE_NAME" \
  --display-name "$DISPLAY_NAME" \
  --version "$PACKAGE_VERSION" \
  --tags "$CLAWHUB_PACKAGE_TAGS" \
  --source-repo "$CLAWHUB_SOURCE_REPO" \
  --source-commit "$CLAWHUB_SOURCE_COMMIT" \
  --source-ref "$CLAWHUB_SOURCE_REF" \
  --source-path "$CLAWHUB_SOURCE_PATH" \
  "$@"

if [ -n "${CLAWHUB_CHANGELOG:-}" ]; then
  set -- "$@" --changelog "$CLAWHUB_CHANGELOG"
fi

cd "$PACKAGE_DIR"
pnpm run build

if [ "$CLAWHUB_BIN" = "clawhub" ]; then
  exec clawhub "$@"
else
  exec npx -y clawhub@latest "$@"
fi
