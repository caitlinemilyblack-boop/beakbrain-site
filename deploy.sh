#!/bin/zsh
# RETIRED 2026-09-01. beakbrain.com is no longer served by Cloudflare Pages.
#
# Pages reads the ZONE plan for its file ceiling and beakbrain.com is a Free zone, so
# this script could not deploy anything from 24 August onward: the tree needed more than
# 20,000 files and the upload token kept issuing `max_file_count_allowed: 20000`.
# Workers static assets reads the ACCOUNT plan instead, and this account is on Workers
# Paid, where the ceiling is 100,000. The site moved there on 2026-09-01.
#
#   USE ./deploy-worker.sh INSTEAD.
#
# The Pages project `beakbrain-site` still exists with its custom domain attached, on
# purpose: the Worker takes the domain with a ROUTE, which wins over a Pages custom
# domain, so deleting the route in wrangler.jsonc and redeploying rolls the whole
# migration back to Pages. Do not delete the Pages project while that is still the
# rollback. Deploying to it now changes nothing anybody can see, because the route
# means Pages no longer answers for beakbrain.com.

print -u2 "RETIRED: beakbrain.com is served by the Worker 'beakbrain-web', not Pages."
print -u2 "         Use ./deploy-worker.sh. See the comment at the top of this file."
exit 1

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
