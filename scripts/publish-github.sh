#!/usr/bin/env bash
set -euo pipefail

ORG=${1:-${GITHUB_ORG:-}}
REPO=${2:-${GITHUB_REPO:-}}
VISIBILITY=${VISIBILITY:-private} # private|public|internal

if [[ -z "$ORG" || -z "$REPO" ]]; then
  echo "Usage: $0 <org> <repo>" >&2
  echo "Or set GITHUB_ORG and GITHUB_REPO env vars." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install GitHub CLI or create repo manually." >&2
  echo "Manual steps:" >&2
  echo "  1) Create https://github.com/$ORG/$REPO" >&2
  echo "  2) git remote add origin git@github.com:$ORG/$REPO.git" >&2
  echo "  3) git push -u origin main --tags" >&2
  exit 2
fi

# Create repo if it doesn't exist
if ! gh repo view "$ORG/$REPO" >/dev/null 2>&1; then
  gh repo create "$ORG/$REPO" --$VISIBILITY --confirm
fi

git remote remove origin >/dev/null 2>&1 || true
git remote add origin "git@github.com:$ORG/$REPO.git"
git push -u origin main

# Push tags if present
git push --tags || true

echo "Published to https://github.com/$ORG/$REPO"

