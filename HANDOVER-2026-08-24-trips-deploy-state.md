# HANDOVER 2026-08-24 — nine trips guides are built, committed, and none of them are live

**Branch `trips/nation-guides-heroes-and-fixes`, head `8b91507`.** Written from the tree and
from the live site at 2026-08-24, by the session that was reading Search Console. Numbers are
measured, not remembered. This repo moved twice while that reading was in progress, so check
`git log --oneline -3` before trusting any line below.

---

## 0. The state in one table

| Guide | On disk | Committed | Live |
|---|---|---|---|
| costa-rica | yes | yes | **200** |
| netherlands | yes | yes | **200** |
| certifications | yes | yes | **200** |
| england, scotland, wales, northern-ireland, ireland | yes | yes | 404 |
| france, germany, iceland, spain | yes | yes | 404 |
| united-kingdom | deleted | deleted | 404 |

`trips/index.html` on disk links all eleven guides. **The live hub links only two.** So the
live site is internally consistent and nothing is publicly broken: the nine new guides are
invisible rather than half-wired. The orphaned-nav trap has not been sprung.

**Nothing has been deployed since the two-guide era.** Nine guides, the rebuilt hub, the
United Kingdom retirement and the compare-pair redirects are all sitting in the tree.

---

## 1. The deploy is all or nothing, and that is correct here

`./deploy.sh` rsyncs the working tree into `../.beakbrain-site-deploy` and uploads that. There
is no partial deploy and no per-guide deploy. Shipping the hub ships the nine guides with it,
which is exactly what has to happen: a hub that links eleven guides on a site that serves two
would be nine dead links on the most crawlable page in the section.

So the decision is binary. Either all nine go live together or none do. Do not hand-edit the
hub to link fewer.

**The deploy needs Cat.** It has needed Cat since 2026-08-19 and that has not changed.

---

## 2. The file count is the real ceiling on guide twelve

    staged: 18,945 files
    deploy.sh warns at 19,000
    Cloudflare Pages free plan hard limit: 20,000

**Fifty-five files of headroom before the warning fires.** Guides run 11 to 20 files each:

    england 20 · scotland 20 · wales 20 · northern-ireland 20 · france 20
    spain 19 · germany 18 · ireland 13 · iceland 11

So roughly **three more guides before the warning, and about fifty before the deploy fails.**
The 18,062 files under `birds/` are what eat the budget, and 6,001 of those are compare pages
that are capped for exactly this reason (`COMPARE_CAP` in `build/species/generate.js`). Raising
the guide count past about a dozen more means taking files back from `birds/`, not finding
slack elsewhere.

Measure before adding, do not estimate:

    find . -type d \( -name .git -o -name build -o -name node_modules -o -name .wrangler \) \
      -prune -o -type f ! -name '.DS_Store' ! -name 'deploy.sh' -print | wc -l

---

## 3. The United Kingdom retirement is now safe, and it was not this morning

`/trips/united-kingdom/` is retired on Cat's instruction, the directory is deleted, and the
301 to `/trips/` sits at `_redirects:23-24`.

**Those two lines used to sit inside the managed block and were one build away from deletion.**
`writeCompareRedirects` in `build/species/generate.js:1707` keeps only
`body.split(START)[0]`, so anything below `# >>> generated: dropped compare pairs` is
regenerated and lost. Somebody moved them above the marker between the two reads this morning.
They are correct now. **Keep every hand-written rule above line 26.**

No page links `/trips/united-kingdom/` any more; `trips/certifications/index.html` was cleaned.
The URL 404s live until the next deploy, then it 301s.

---

## 4. What Search Console says about this section

From the 2026-08-23 export. The trips section contributes exactly one 404 and it is harmless:

**`/trips/costa-rica/cards/`** is a directory of card JSON with no index page. Googlebot
rendered `trips/costa-rica/index.html:8203`, saw `fetch('/trips/costa-rica/cards/' + n +
'.json')`, and tried the directory. Every new guide with a cards folder will add one of these.
Ignore them, or give the folder a stub index if the count ever becomes noise.

The site-wide picture is healthy and none of it is a trips problem: 7,506 indexed against 1,070
not indexed, impressions up from 14 to 1,435 a day between 10 and 21 August.

**One thing that is NOT fixed and rides along on the same deploy:** 53 compare pages return 404
with no redirect, because they were dropped in the build before `compare-published.json`
existed and nothing recorded them. `_redirects` covers 27 later drops and none of these 53. The
list survives only in
`~/Downloads/beakbrain.com-Coverage-Drilldown-2026-08-23/Table.csv`. Whoever deploys should
decide whether to add them first; they go in as explicit static rules, never as a splat.
`/birds/compare/* …` would 301 all 6,001 working compare pages, because Cloudflare Pages
documents that redirects are followed regardless of whether an asset matches.

---

## 5. Before deploying

1. `node build/trips/verify.js` — schema and honesty checks on `build/trips/data/*.json`.
   Hard-fails on missing evidence URLs, dashes in blurbs, unvetted guide entries.
2. `./deploy.sh --dry-run` — stages, runs the og-card freshness gate, prints the file count,
   uploads nothing. Pillow is installed on this machine so the og-card check will actually run.
3. Read the count it prints. If it is over 19,000, stop and cut before shipping.
4. `./deploy.sh` — then it self-verifies `/`, `/trips/`, `/cams/`, `/birds/`, and checks that
   `/build/README.md` is a 301 rather than served markdown.
5. Spot-check the nine new guides by hand. The deploy script only probes four paths.

`build/` is the private pipeline repo and is excluded from staging, with an abort if it leaks.
That guard exists because on 2026-08-12 it did leak.

---

## 6. Two things happening elsewhere, so nobody trips over them

**The iOS app is in App Store review and is a different repo.** BeakBrain 1.0.0 build 7 came
back under Guideline 2.1 wanting a screen recording. That work lives in
`Birding-Quiz-App/docs/handovers/HANDOVER-2026-08-23b-app-review-2-1-information-needed.md`
and a click-by-click runbook at `docs/handovers/app-review-2-1-runbook.html`. It shares nothing
with this repo. Do not deploy the app, and do not touch `PRO_ENFORCED`.

**`build/species/compare-published.json` is gitignored** (`.gitignore:13`). The sticky list
that stops compare pages churning into 404s exists on this machine only. A fresh clone rebuilds
with an empty `prevPublished` and drops thousands of pairs at once, which is the 53-URL problem
again at fifty times the scale. Worth un-ignoring and committing.
