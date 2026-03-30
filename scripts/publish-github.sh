#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PACKAGE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

PACKAGE_NAME=$(node -p "JSON.parse(require('fs').readFileSync('$PACKAGE_DIR/package.json', 'utf8')).name")
PACKAGE_VERSION=$(node -p "JSON.parse(require('fs').readFileSync('$PACKAGE_DIR/package.json', 'utf8')).version")

GITHUB_RELEASE_REPO=${GITHUB_RELEASE_REPO:-https://github.com/z-imagine/openclaw-baidu-search.git}
GITHUB_RELEASE_BRANCH=${GITHUB_RELEASE_BRANCH:-main}
GITHUB_RELEASE_MESSAGE=${GITHUB_RELEASE_MESSAGE:-"release: $PACKAGE_NAME@$PACKAGE_VERSION"}

TMP_DIR=$(mktemp -d)
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

git clone --depth 1 --branch "$GITHUB_RELEASE_BRANCH" "$GITHUB_RELEASE_REPO" "$TMP_DIR/repo" >/dev/null 2>&1

rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'coverage' \
  --exclude '*.tgz' \
  --exclude '.DS_Store' \
  --exclude 'LICENSE' \
  "$PACKAGE_DIR"/ "$TMP_DIR/repo"/

cd "$TMP_DIR/repo"

if git diff --quiet --no-ext-diff && git diff --cached --quiet --no-ext-diff; then
  echo "No changes to push."
  exit 0
fi

git add -A
git commit -m "$GITHUB_RELEASE_MESSAGE" >/dev/null
git push origin "$GITHUB_RELEASE_BRANCH"
git rev-parse HEAD
