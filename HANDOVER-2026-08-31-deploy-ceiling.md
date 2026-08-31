# HANDOVER 2026-08-31 — the site cannot deploy, and it has not deployed for a week

**Branch `trips/nation-guides-heroes-and-fixes`, head `b7139cc`.** Written at 2026-08-31
by the session that filled in the App Store launch copy and then could not ship it. Every
number below was measured today against the live site and the staging tree, not
remembered. You are writing this tree while I read it, so re-check `git log --oneline -3`
and `find . -mmin -30` before trusting any line.

**If you read one thing: do not run `./deploy.sh`. It will fail, and on the day it stops
failing it will publish whatever you have half-written.**

---

## 0. The state in one table

| | On disk | Live |
|---|---|---|
| Trips guides | 63 | 2 |
| Guides linked from the hub | 62 | 2 |
| Compare pages | 9,921 | 6,001 |
| Homepage says "Coming soon to iPhone" | no | **yes** |
| Files staged by `deploy.sh` | 23,846 | ceiling is 20,000 |

Last production deployment: **24 August**. Everything since then is sitting in the tree:
sixty guides, 3,920 compare pages, and the App Store launch copy.

The live site is internally consistent, so nothing is publicly broken. The live hub links
the two guides that exist. The orphaned-nav trap has not been sprung.

---

## 1. Why the deploy fails

```
✘ Error: Pages only supports up to 20,000 files in a deployment for your current plan
```

This is not a wrangler version problem and it is not a staging problem. The limit arrives
as a claim on the upload token Cloudflare issues at deploy time:

```js
// wrangler-dist/cli.js
const { jwt } = await fetchResult(`/accounts/${id}/pages/projects/${name}/upload-token`)
const fileCountLimit = maxFileCountAllowedFromClaims(jwt)   // reads max_file_count_allowed
```

Read off that token today: **`max_file_count_allowed: 20000`**.

**`PAGES_WRANGLER_MAJOR_VERSION=4` is already set correctly and is not the missing piece.**
Verified from the project API response, production environment, plaintext, value `"4"`.
Cat set it this afternoon. The server still issues a 20,000 token.

**The cause is the zone plan.** Billing shows two separate subscriptions:

```
Compute         Workers Paid    Active     Renews Sep 29, 2026
beakbrain.com   Free Plan       Active     —
```

Cloudflare's Pages file limit reads the **zone** plan, and the docs word the requirement as
"Pro, Business, and Enterprise plans". Workers Paid does not satisfy it. Buying Workers
Paid and getting the Pages ceiling turned out to be two different purchases.

Two ways out, both Cat's call and neither actioned yet:

- Upgrade beakbrain.com to Pro, about $20/month, effective immediately.
- Move the site off Pages onto Workers static assets, where the 100,000 limit is granted on
  Workers Paid with no zone condition. No new money, real migration effort.

---

## 2. Do not try to trim the tree under the ceiling. I tried, and measured why it breaks

The obvious idea is to hold back the 3,921 compare pages that have never been live, ship
19,926 files, and keep everything production already serves. The arithmetic works and it
clears the ceiling by 74 files.

**It creates thousands of 404s.** In a 400-page random sample of species pages there were
712 links into compare pages and **267 of them pointed at pages the trim would hold back**,
a 37% miss rate. Extrapolated across the guide that is several thousand dead links, on the
pages Search Console says carry 91% of the site's clicks.

The reason is structural and worth remembering: production serves 6,001 compare pages *and*
species pages generated back when only 6,001 existed. The species pages in the tree were
regenerated against 9,921. The two halves are a matched pair. Holding back the pages
without holding back the links that reach them is a break, not a trim.

If you ever do need to cut compare pages, cut them by lowering `COMPARE_CAP` and
regenerating, so pages and links move together. Never by deleting from the staging tree.

---

## 3. What is in the tree from my side, and what to leave alone

Commit `13d0f85`, two files, already pushed:

- **`index.html`** — BeakBrain went live on the App Store on 2026-08-31, Apple ID
  `6799414340`. The `#get` band now leads with a white "Download on the App Store" button.
  The hero note and the "Is it on iPhone and Android?" FAQ answer stopped saying the app is
  coming. The iOS link is written into the markup rather than switched on by JavaScript;
  only the Android half is still a `STORE_ANDROID` switch, because that listing does not
  exist yet.
- **`llms.txt`** — the App section pointed at the retired `beakbrain-app.pages.dev` beta
  URL and now names the App Store listing and the browser app.

**`index.html` is hand-maintained and no script writes it.** If you rebuild the fleet,
nothing should touch it. If it changes, something is wrong.

**Your generators are clean and need no launch edit.** `build/travel/generate.js` and
`build/trips/template.html` carry only the nav pill `<a class="btn" href="/#get">Get the
app</a>`, which still resolves correctly now that `/#get` offers the App Store. I checked
all four generators for "coming soon" and beta copy and found none.

---

## 4. The concurrent-write hazard, stated plainly

`deploy.sh` rsyncs the **working tree**, not HEAD. While I was working, the staged file
count moved 23,809 → 23,846 underneath me and `git status` stayed clean throughout, because
`trips/` output is gitignored. Files touched in a 90-minute window:

```
20  trips/zambia/cards        (Zambia did not exist when I started)
17  trips/germany/cards
15  trips/botswana/cards
14  build/travel/data
11  trips/austria/cards
```

That is you. It is also exactly the shape of the 19 August incident, where a concurrent
session's in-flight `_redirects` rode out inside an unrelated deploy and turned 26 live
URLs into 404s.

So: **a clean `git status` proves nothing about who is writing this tree.** When the
ceiling does lift, whoever deploys should re-check `git status` and `find . -mmin -30`
immediately before running `deploy.sh`, not once at the start of a session.

---

## 5. What to do next

1. **Keep building guides.** Nothing you are doing is blocked or wasted. It simply cannot
   ship yet, and every guide you add makes the ceiling more binding, not less. A guide is
   10 to 52 files.
2. **Do not run `./deploy.sh`,** and do not work around the ceiling by deleting from the
   staging tree. See §2.
3. **The deploy needs Cat,** and now it needs a billing decision from her first. It has
   needed Cat since 2026-08-19 and that has not changed.
4. When the ceiling lifts, the first deploy will be large: sixty guides, 3,920 compare
   pages and the launch copy all at once. Read
   `HANDOVER-2026-08-24-trips-deploy-state.md` §1 before it goes out. The all-or-nothing
   argument there still holds.

Related memory: `project_beakbrain_file_budget` (corrected today; it previously claimed the
100,000 ceiling was already in effect), `project_beakbrain_multisession_deploy`,
`project_beakbrain_launch_state`.
