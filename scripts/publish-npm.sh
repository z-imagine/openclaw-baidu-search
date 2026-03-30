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

: "${NPM_PUBLISH_TOKEN:?NPM_PUBLISH_TOKEN is required in .env}"

NPM_REGISTRY_URL=${NPM_REGISTRY_URL:-https://registry.npmjs.org/}
TMP_NPMRC=$(mktemp)
trap 'rm -f "$TMP_NPMRC"' EXIT INT TERM

chmod 600 "$TMP_NPMRC"
cat >"$TMP_NPMRC" <<EOF
registry=$NPM_REGISTRY_URL
@z-imagine:registry=$NPM_REGISTRY_URL
//registry.npmjs.org/:_authToken=$NPM_PUBLISH_TOKEN
EOF

cd "$PACKAGE_DIR"
npm publish --registry="$NPM_REGISTRY_URL" --access public --userconfig "$TMP_NPMRC" "$@"
