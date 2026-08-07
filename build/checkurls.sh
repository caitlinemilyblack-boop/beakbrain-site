#!/bin/bash
# Independently re-verify every URL in one or more batch/data JSON files.
#
#   build/checkurls.sh build/data/incoming/na-usa.json          # failures only
#   build/checkurls.sh --all build/data/incoming/*.json         # every row
#
# Exists because a research agent once reported "all URLs verified, HTTP 200" for a batch in which
# 13 of 74 were dead, including nine invented from a URL pattern that does not exist. ingest.js
# cannot catch that: those are well formed https URLs that pass schema validation. Only a real
# request does. Never trust a batch's own verification claim, run this instead.
#
# Prints "<code>  <url>  <title>". The title matters as much as the code: a soft 404 returns 200
# while serving a "page not found" page, and parked domains return 200 too.
#
# Expected noise, NOT breakage:
#   400  facebook.com, instagram.com, discord, x.com   they block headless clients
#   403  Cloudflare fronted sites ("Attention Required!", "Just a moment...")
#   429  rate limited, the site is real
# Treat 000, 404 and parking/unrelated titles as genuinely broken. Retry a 000 once with a longer
# timeout before dropping it, some are transient DNS or IPv6 timeouts rather than dead hosts.

set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

if [ "${1:-}" = "--all" ]; then SHOW_ALL=1; shift; else SHOW_ALL=0; fi
if [ $# -eq 0 ]; then echo "usage: $0 [--all] <file.json> [file.json ...]" >&2; exit 2; fi

one() {
  local f code t
  f=$(mktemp)
  code=$(curl -s -m 25 --retry 1 -A "$UA" -o "$f" -w '%{http_code}' -L "$1" 2>/dev/null)
  t=$(grep -o -i '<title>[^<]*' "$f" 2>/dev/null | head -1 | sed 's/<title>//I' | tr -d '\n\r' | cut -c1-52)
  rm -f "$f"
  printf "%s  %-46s %s\n" "$code" "${1:0:46}" "$t"
}

if [ "${CHECKURLS_CHILD:-}" = "1" ]; then one "$1"; exit 0; fi
export CHECKURLS_CHILD=1 UA

urls=$(python3 - "$@" <<'PY'
import json, sys
for path in sys.argv[1:]:
    for c in json.load(open(path)):
        for r in c.get('regions', []):
            for g in r.get('groups', []):
                print(g['url'])
PY
)

total=$(printf '%s\n' "$urls" | grep -c . || true)
# -P 8 matters: a 70 group batch checked serially runs long enough to hit a tool timeout.
out=$(printf '%s\n' "$urls" | xargs -P 8 -n1 "$0" | sort)

if [ "$SHOW_ALL" = "1" ]; then
  printf '%s\n' "$out"
else
  printf '%s\n' "$out" | grep -v '^200' || true
fi

bad=$(printf '%s\n' "$out" | grep -cE '^(000|404)' || true)
echo "--- $total urls checked, $bad hard failures (000/404); 400/403/429 above are expected noise"
