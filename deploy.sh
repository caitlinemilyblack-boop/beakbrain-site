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
#   ./deploy.sh              deploy to production (beakbrain.com)
#   ./deploy.sh --dry-run    stage and report, upload nothing
#   ./deploy.sh --preview    upload to a preview branch, NOT beakbrain.com
#
# --preview exists to test the raised file limit safely. Preview deployments are
# unlimited, get their own *.pages.dev URL, and cannot affect the live site: a
# rejected upload leaves production exactly as it was.

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

# The share card is composed from the app's mark and the site's screenshots, so it
# goes stale silently when either moves. This repo has no CI, so the deploy is the
# only gate there is. Skipped rather than fatal when Pillow is absent, because a
# missing local dependency should not block a copy fix at midnight.
if python3 -c 'import PIL' 2>/dev/null; then
  python3 "$SRC/build/make-og-image.py" --check || {
    print -u2 "ABORT: assets/og-card.png is stale. Run: python3 build/make-og-image.py"
    exit 1
  }
else
  print "skipping the og-card check (no Pillow: pip3 install Pillow)"
fi

# The account moved to Workers Paid on 2026-08-29, lifting the static-asset ceiling
# from 20,000 files to 100,000. On Cloudflare Pages that also needs
# PAGES_WRANGLER_MAJOR_VERSION=4 set in the project settings; if the upload is still
# refused past 20,000, the project has to move to Workers Static Assets instead.
#
# The 2,100 REDIRECT ceiling is NOT lifted by any plan. Check both.
FILES=$(find "$STAGE" -type f | wc -l | tr -d ' ')
RULES=$(grep -vc '^[[:space:]]*#\|^[[:space:]]*$' "$STAGE/_redirects" 2>/dev/null || print 0)
print "staged $FILES files, $RULES redirect rules (limits: 100,000 files on the paid plan, 2,100 rules on every plan)"

if (( FILES > 20000 )); then
  print "NOTE: past 20,000 files. This needs the paid file limit to be live; if the"
  print "      upload fails, that setting has not taken effect."
fi

if (( FILES > 95000 )); then
  print -u2 "WARNING: close to the 100,000 file limit."
fi

if (( RULES > 2000 )); then
  print -u2 "ABORT: $RULES redirect rules, past Cloudflare's 2,100 ceiling. Rules over the"
  print -u2 "       limit are dropped silently, which turns live URLs into 404s."
  exit 1
fi

if [[ "${1:-}" == "--dry-run" ]]; then
  print "dry run, nothing uploaded"
  exit 0
fi

if [[ "${1:-}" == "--preview" ]]; then
  BRANCH="${2:-filecap-test}"
  print "uploading to PREVIEW branch '$BRANCH' — beakbrain.com is untouched"
  npx wrangler pages deploy "$STAGE" --project-name="$PROJECT" --branch="$BRANCH" --commit-dirty=true
  print
  print "Preview only. Nothing above is live on beakbrain.com."
  exit 0
fi

npx wrangler pages deploy "$STAGE" --project-name="$PROJECT" --branch=main --commit-dirty=true

print "verifying"
for p in / /trips/ /cams/ /birds/; do
  print "  $(curl -s -m 25 -o /dev/null -w '%{http_code}' "https://beakbrain.com$p")  $p"
done
print "  $(curl -s -m 20 -o /dev/null -w '%{http_code}' "https://beakbrain.com/build/README.md")  /build/README.md (want 301 from the _redirects guard, never 200 text/markdown)"
