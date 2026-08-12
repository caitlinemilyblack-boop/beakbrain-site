#!/bin/zsh
# Deploy beakbrain.com to Cloudflare Pages (project: beakbrain-site).
#
# Use this instead of `wrangler pages deploy .`.
#
# Running wrangler against the repo root uploads build/ as well, and build/ is the
# PRIVATE pipeline repo. On 2026-08-12 that put build/README.md and
# build/verify-report.txt on the public site. This script stages a clean copy first,
# so only the deployed site ships.
#
# Usage:
#   ./deploy.sh              deploy to production
#   ./deploy.sh --dry-run    stage and report, upload nothing

set -euo pipefail

SRC="${0:A:h}"
STAGE="$SRC/../.beakbrain-site-deploy"
PROJECT="beakbrain-site"

rm -rf "$STAGE"
mkdir -p "$STAGE"

# --link-dest hardlinks instead of copying, so staging 900MB+ costs no extra disk.
rsync -a --delete --link-dest="$SRC" \
  --exclude='.git/' \
  --exclude='build/' \
  --exclude='.wrangler/' \
  --exclude='node_modules/' \
  --exclude='.DS_Store' \
  --exclude='deploy.sh' \
  "$SRC/" "$STAGE/"

if [[ -e "$STAGE/build" ]]; then
  print -u2 "ABORT: build/ reached the staging tree."
  exit 1
fi

FILES=$(find "$STAGE" -type f | wc -l | tr -d ' ')
print "staged $FILES files (Cloudflare Pages free plan allows 20,000)"

if (( FILES > 19000 )); then
  print -u2 "WARNING: close to the 20,000 file limit."
fi

if [[ "${1:-}" == "--dry-run" ]]; then
  print "dry run, nothing uploaded"
  exit 0
fi

npx wrangler pages deploy "$STAGE" --project-name="$PROJECT" --branch=main --commit-dirty=true

print "verifying"
for p in / /trips/ /cams/ /birds/; do
  print "  $(curl -s -m 25 -o /dev/null -w '%{http_code}' "https://beakbrain.com$p")  $p"
done
print "  $(curl -s -m 20 -o /dev/null -w '%{http_code}' "https://beakbrain.com/build/README.md")  /build/README.md (want 301 from the _redirects guard, never 200 text/markdown)"
