#!/usr/bin/env bash
# Opens the staging -> main release PR.
#
# WHY THIS IS A LOCAL SCRIPT AND NOT A WORKFLOW. A pull request opened with a
# workflow's GITHUB_TOKEN does not trigger pull_request workflows, so it never
# gets the "Build & Lint" check that main requires — and with enforce_admins
# on, a PR missing a required check cannot be merged by anyone, including the
# repo owner. Run from your machine, your own token opens it and CI runs
# normally. See .github/workflows/release-drift.yml, which nags you to run this.
#
# Merging the PR this opens IS the release approval. release-tag.yml tags main
# from VERSION afterwards.
set -euo pipefail

BASE=main
HEAD=staging

command -v gh >/dev/null || { echo "gh is not installed."; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh is not authenticated — run: gh auth login"; exit 1; }

echo "Fetching..."
git fetch origin "$BASE" "$HEAD" --quiet

BEHIND=$(git rev-list --count "origin/$BASE..origin/$HEAD")
if [ "$BEHIND" -eq 0 ]; then
  echo "$BASE is already level with $HEAD — nothing to release."
  exit 0
fi

# `.[0] | ...` on an empty list yields the string "null null", which reads as a
# PR that is not there. Iterate and take the first line instead.
EXISTING=$(gh pr list --base "$BASE" --head "$HEAD" --state open --json number,url \
           --jq '.[] | "#\(.number) \(.url)"' 2>/dev/null | head -1 || true)
if [ -n "$EXISTING" ]; then
  echo "A release PR is already open: $EXISTING"
  exit 0
fi

VERSION=$(git show "origin/$HEAD:VERSION" 2>/dev/null | tr -d '[:space:]' || echo "")
[ -n "$VERSION" ] || { echo "No VERSION file on $HEAD — bump it before releasing."; exit 1; }

if git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null 2>&1; then
  echo "WARNING: tag v$VERSION already exists. Bump VERSION on develop first,"
  echo "or this release will land untagged."
fi

OLDEST_TS=$(git log "origin/$BASE..origin/$HEAD" --format=%ct | tail -1)
DAYS=$(( ( $(date +%s) - OLDEST_TS ) / 86400 ))

BODY=$(
  printf 'Release \x60v%s\x60 — %s commit(s) from \x60%s\x60, the oldest waiting %s day(s).\n\n' \
    "$VERSION" "$BEHIND" "$HEAD" "$DAYS"
  printf 'Merging this is the release approval. \x60release-tag.yml\x60 tags \x60main\x60 as \x60v%s\x60 afterwards.\n\n' "$VERSION"
  printf '## Before merging\n\n'
  printf -- '- [ ] Validated on staging (it deploys \x60staging\x60, not this PR)\n'
  printf -- '- [ ] \x60VERSION\x60 is \x60%s\x60 and no \x60v%s\x60 tag exists yet\n\n' "$VERSION" "$VERSION"
  printf '## Changes\n\n'
  git log "origin/$BASE..origin/$HEAD" --format='- %s' --no-merges | head -100
  TOTAL=$(git log "origin/$BASE..origin/$HEAD" --no-merges --oneline | wc -l | tr -d ' ')
  if [ "$TOTAL" -gt 100 ]; then printf '\n<sub>…and %s more.</sub>\n' "$((TOTAL - 100))"; fi
  printf '\n<sub>Opened by \x60npm run release:open\x60.</sub>\n'
)

gh pr create --base "$BASE" --head "$HEAD" --title "release: v$VERSION" --body "$BODY"
