#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

TARGET=${1:-all}
if [ $# -gt 0 ]; then
  shift
fi

run_target() {
  name=$1
  shift
  sh "$SCRIPT_DIR/$name" "$@"
}

case "$TARGET" in
  github)
    run_target publish-github.sh "$@"
    ;;
  npm)
    run_target publish-npm.sh "$@"
    ;;
  clawhub)
    run_target publish-clawhub.sh "$@"
    ;;
  all)
    run_target publish-github.sh
    run_target publish-npm.sh
    run_target publish-clawhub.sh
    ;;
  *)
    echo "Usage: sh ./scripts/release.sh [github|npm|clawhub|all] [extra args...]" >&2
    exit 1
    ;;
esac
