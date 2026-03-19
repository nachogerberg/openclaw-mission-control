#!/usr/bin/env bash
set -euo pipefail

# Mirror upstream history into a BAMC-owned GitHub repo.
#
# Usage:
#   ./scripts/mirror-to-bamc-github.sh git@github.com:<ORG>/<REPO>.git
#
# Notes:
# - Target repo must already exist on GitHub and be EMPTY.
# - This preserves ALL branches/tags/history.

TARGET_REPO_URL="${1:-}"
if [[ -z "$TARGET_REPO_URL" ]]; then
  echo "Missing target repo URL."
  echo "Example: ./scripts/mirror-to-bamc-github.sh git@github.com:BAMC-AI/mission-control.git"
  exit 1
fi

TMP_DIR="/tmp/mission-control-mirror-$$"
rm -rf "$TMP_DIR"

echo "[1/3] Bare-cloning upstream..."
git clone --bare https://github.com/crshdn/mission-control.git "$TMP_DIR"

echo "[2/3] Pushing mirror to target: $TARGET_REPO_URL"
cd "$TMP_DIR"
git push --mirror "$TARGET_REPO_URL"

echo "[3/3] Cleanup"
cd /
rm -rf "$TMP_DIR"

echo "Done. Now clone your BAMC repo and add upstream remote:"
echo "  git clone $TARGET_REPO_URL"
echo "  cd $(basename "$TARGET_REPO_URL" .git)"
echo "  git remote add upstream https://github.com/crshdn/mission-control.git"
echo "  git fetch upstream"
