#!/bin/zsh
# Deploy beakbrain.com as a Cloudflare WORKER with static assets (worker: beakbrain-web).
#
# This replaces ./deploy.sh, which deployed to Cloudflare Pages. Pages reads the ZONE
# plan for its file ceiling, beakbrain.com is a Free zone, and the tree passed 20,000
# files on 24 August — so the site could not deploy for a week. Workers static assets
# reads the ACCOUNT plan, and this account is on Workers Paid: 100,000 files.
#
# Usage:
#   ./deploy-worker.sh --dry-run    stage and report, upload nothing
#   ./deploy-worker.sh --preview    deploy, reachable ONLY on the workers.dev URL
#   ./deploy-worker.sh              deploy (live once the routes are attached)
#
# WHAT THE STAGING IS FOR. The repo root holds build/ (the PRIVATE pipeline repo), the
# handover notes, this script and the Worker source. Pages hid functions/ and compiled
# it; Workers would serve it as plain JavaScript. Uploading the root would publish all
# of that, which is how build/README.md reached the public site on 2026-08-12.

set -euo pipefail

SRC="${0:A:h}"
STAGE="$SRC/../.beakbrain-web-deploy"
WORKER="beakbrain-web"

# macOS 15 replaced GNU rsync with Apple's openrsync, which still announces itself as
# "rsync version 2.6.9 compatible" and is a different implementation. Staging 24,000
# files under it exhausts the process file-descriptor limit and dies partway with
#   copy_file fromfd: openat: Too many open files
# leaving a half-built tree that the guards below would happily have deployed.
#
# `launchctl limit maxfiles` on this Mac is 256, so every shell starts there and a
# terminal inherits it. The hard limit is unlimited, so the soft limit is ours to
# raise, and the script raises it itself rather than trusting whatever shell invoked
# it. --link-dest still hardlinks correctly under openrsync (verified by inode), so
# the staged tree costs no extra disk once it can finish.
ulimit -n 65536 2>/dev/null || print -u2 "WARNING: could not raise the file-descriptor limit; staging may die partway."

print "staging $SRC"
rm -rf "$STAGE"
mkdir -p "$STAGE"

# --link-dest hardlinks instead of copying, so staging 900MB+ costs no extra disk.
rsync -a --delete --link-dest="$SRC" \
  --exclude='.git/' \
  --exclude='.gitignore' \
  --exclude='build/' \
  --exclude='.wrangler/' \
  --exclude='node_modules/' \
  --exclude='.DS_Store' \
  --exclude='deploy.sh' \
  --exclude='deploy-worker.sh' \
  --exclude='wrangler.jsonc' \
  --exclude='worker/' \
  --exclude='functions/' \
  --exclude='HANDOVER-*.md' \
  --exclude='TODO.md' \
  "$SRC/" "$STAGE/"

# Guards. Each one is a thing that has actually reached the public site, or that this
# migration would have published for the first time. Cheap to check, expensive to miss.
leaked=0
for bad in build .gitignore wrangler.jsonc worker functions deploy.sh deploy-worker.sh; do
  if [[ -e "$STAGE/$bad" ]]; then print -u2 "ABORT: $bad reached the staging tree."; leaked=1; fi
done
# The (N) qualifier is load-bearing. Written as a bare `ls "$STAGE"/HANDOVER-*.md`, zsh
# aborts the glob with "no matches found" on stderr whenever the tree is CLEAN, which is
# every healthy run, and prints it in the same place an ABORT would appear.
notes=( "$STAGE"/HANDOVER-*.md(N) "$STAGE"/TODO.md(N) )
if (( ${#notes} )); then
  print -u2 "ABORT: internal notes reached the staging tree: ${notes:t}"
  leaked=1
fi
(( leaked )) && exit 1

# The share card is composed from the app's mark and the site's screenshots, so it goes
# stale silently when either moves. This repo has no CI, so the deploy is the only gate.
if python3 -c 'import PIL' 2>/dev/null; then
  python3 "$SRC/build/make-og-image.py" --check || {
    print -u2 "ABORT: assets/og-card.png is stale. Run: python3 build/make-og-image.py"
    exit 1
  }
else
  print "skipping the og-card check (no Pillow: pip3 install Pillow)"
fi

# 100,000 files on Workers Paid. The 2,100 REDIRECT ceiling is NOT lifted by any plan
# and is identical on Workers and Pages; rules past it are dropped SILENTLY, which
# turns live URLs into 404s. Check both, every time.
# COUNT DIRECTORIES TOO. `find -type f` is NOT the number Cloudflare enforces against:
# wrangler's manifest carries a directory entry as well, so a tree of 23,957 files in
# 21,559 directories is read as 45,515 assets. deploy.sh reported only the file half and
# so understated the budget by nearly 100% for as long as it existed. Measured
# 2026-09-01 against wrangler's own "Read N files from the assets directory" line.
FILES=$(find "$STAGE" -type f | wc -l | tr -d ' ')
DIRS=$(find "$STAGE" -type d | wc -l | tr -d ' ')
ASSETS=$(( FILES + DIRS - 1 ))
RULES=$(grep -vc '^[[:space:]]*#\|^[[:space:]]*$' "$STAGE/_redirects" 2>/dev/null || print 0)
print "staged $FILES files in $DIRS directories = $ASSETS assets, $RULES redirect rules"
print "  (limits: 100,000 assets, 2,100 rules. The asset figure is the one that counts.)"

if (( ASSETS > 100000 )); then
  print -u2 "ABORT: $ASSETS assets, past the 100,000 ceiling. Lower COMPARE_CAP and"
  print -u2 "       regenerate — never delete from the staging tree, because the pages"
  print -u2 "       and the links that reach them are a matched pair."
  exit 1
fi
if (( ASSETS > 95000 )); then print -u2 "WARNING: close to the 100,000 asset limit."; fi
if (( RULES > 2000 )); then
  print -u2 "ABORT: $RULES redirect rules, past Cloudflare's 2,100 ceiling."
  exit 1
fi

# deploy.sh rsyncs the WORKING TREE, not HEAD, and so does this. On 19 August a
# concurrent session's in-flight _redirects rode out inside an unrelated deploy and
# turned 26 live URLs into 404s. A clean tree at session start proves nothing about
# the tree now, so look immediately before every upload.
print
print "working tree (uncommitted changes ride out with this deploy):"
git -C "$SRC" status --short | head -20 || true
print "touched in the last 30 minutes, outside trips/:"
find "$SRC" -mmin -30 -type f -not -path '*/.git/*' -not -path "$SRC/trips/*" \
  -not -path '*/build/*' -not -path '*/.wrangler/*' 2>/dev/null | head -10 || true
print

if [[ "${1:-}" == "--dry-run" ]]; then
  print "dry run, nothing uploaded"
  exit 0
fi

cd "$SRC"
npx wrangler deploy

print
print "verifying"
if [[ "${1:-}" == "--preview" ]]; then
  BASE="${WORKERS_DEV_URL:-}"
  if [[ -z "$BASE" ]]; then
    print "set WORKERS_DEV_URL to the workers.dev address to verify the preview"
    exit 0
  fi
else
  BASE="https://beakbrain.com"
fi
for p in / /trips/ /cams/ /birds/ /daily/; do
  print "  $(curl -s -m 25 -o /dev/null -w '%{http_code}' "$BASE$p")  $p"
done
print "  $(curl -s -m 20 -o /dev/null -w '%{http_code}' "$BASE/build/README.md")  /build/README.md (want 301, never 200)"
print "  $(curl -s -m 20 -o /dev/null -w '%{http_code}' "$BASE/TODO.md")  /TODO.md (want 404)"
print "  $(curl -s -m 20 -o /dev/null -w '%{http_code}' "$BASE/functions/go.js")  /functions/go.js (want 404)"
