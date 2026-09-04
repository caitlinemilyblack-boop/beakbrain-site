# Handover, 2026-09-03: what rides out with your next deploy

**Read this before running `./deploy-worker.sh`.** Scope is deployment only. Nothing here
asks you to change the state guides you are working on.

A separate session did SEO work on `/birds/` today. It is **committed at `4a2f4b2`** on
`country-guides-2026-08-20` (your `37afa82` sits on top of it) and **generated into the
working tree**, but deliberately **not deployed**. `deploy-worker.sh` rsyncs the working
tree rather than HEAD, so the moment you deploy, all of it goes live with your work.

That is intended. It needs no action from you beyond knowing what it is, and reading the
one thing in section 4 that should have been raised louder than it was.

---

## 1. What ships when you deploy

| | live now | in the tree |
|---|---:|---:|
| compare pages | 9,920 | **9,928** |
| species + hub + compare pages | 21,397 | **21,405** |
| compare titles reading "Size and Calls and Range" | 258 | **0** |

- **8 new compare pages.** African Fish Eagle vs Bald Eagle, Chimney vs Common Swift,
  Glaucous vs Glaucous-winged Gull, House vs Spanish Sparrow, Goliath vs Great Blue Heron,
  Bonaparte's vs Laughing Gull, Alder vs Least Flycatcher, Common vs Roseate Tern. All
  eight were measured in Search Console and had no page, because a compare page used to
  require one species to name the other in its `confusion` array. `build-query-pairs.js`
  now reads a Queries.csv export and admits pairs on measured demand, with the photo +
  ID-tip gate unchanged.
- **258 compare titles corrected.** The title ladder's second tier was
  `bits.join(' and ')`, which produced "Size and Calls and Range": longer than the comma
  form it was meant to shorten, and worse to read. Now "Size, Calls and Range".
  0 titles exceed 63 characters.
- **`sitemap-wave2.xml` contents shift slightly.** Still 2,001 URLs. The 8 new pairs pin
  near the top on measured demand, so 8 others fall out of the top 2,000. **No page 404s
  as a result**: the pair set gained 8 and dropped 0, those 8 simply stop being announced.
  Google read the current file successfully today and will re-read.

`_redirects` is unchanged: 0 pairs dropped this run, so no new redirect rules.

**Budget.** Last dry run staged **45,622 assets against the 100,000 ceiling**. Eight pages
is roughly 16 more assets (remember the count is files *plus* directories). Not a factor.

---

## 2. Already live, do not be confused by it

Earlier today's deploy (worker `ee3bbd6c`) shipped, and is **not** part of what is
described above:

- `sitemap-wave2.xml` announced in `sitemap.xml`. **Submitted and accepted**: Google
  Search Console reports Success, Bing has both it and the index.
- `/birds/` links the compare hub, 62 links, where it previously had zero.
- Three CTA blocks stopped saying "Coming soon to iPhone and Android" across every
  species and compare page. The app has been live since 2026-08-31.
- Your Texas guide went out in that same deploy.

---

## 3. The one judgement call left to you

**`trips/colorado/` is built locally, linked from the local `/trips/` hub, and 404 live.**

The other session stopped rather than publish it, because it is your in-flight work and
the WIP files for 46 states appeared in `build/travel/pending/` while it was running.

Deciding is yours, and there are only two coherent options, because the local hub already
links Colorado:

- **Deploy normally.** Colorado goes live along with everything else. Correct if it is
  finished.
- **Hold it back.** Stage with `./deploy-worker.sh --dry-run`, `rm -rf` **only**
  `trips/colorado` from `~/Developer/.beakbrain-web-deploy`, then run `npx wrangler deploy`
  from the repo root by hand. **You must also hold the hub back or edit it**, or you ship a
  live link to a 404.

There is no third option where the hub links a page that is not there.

---

## 4. This should have been flagged louder, and it is the important part of this file

**`node build/species/verify.js` fails on every single run, and has for some time.**

```
FAIL: mean species page 55.7 KB over 51 KB budget
```

It is **not a regression from today's work**. It was A/B tested against the previous
generator: **55.8 KB before, 55.7 KB after**, so today's changes made pages marginally
smaller. The budget was re-baselined on 2026-08-25 and the data has grown past it again.

**Why it matters more than a stale number.** A check that is red every time stops being a
check. The next real failure arrives looking exactly like the noise everyone has learned to
scroll past, and page weight is precisely the kind of thing that degrades a page at a time
rather than all at once. It was mentioned in passing today when it should have been raised
as its own item, which is why it is here in its own section.

**What needs doing, and it is one of these two, not both:**

1. **Re-baseline**, if 55.7 KB is acceptable. Change the budget in `build/species/verify.js`
   and **write the date and the reason into the message the way the 2026-08-25 one did**, so
   the next person can see it has now moved twice and ask why.
2. **Trim**, if it is not. The message already names the first thing to check: whether a new
   inline asset has appeared, since the stylesheet is still external. The largest page is
   `peregrine-falcon` at 147.2 KB against a 55.7 KB mean, so the tail is where to look first.

Doing neither leaves a permanently red gate, which is the worst of the three outcomes.

**Not to be confused with `pipeline/verify_before_deploy.py`**, which is a different and
healthy gate: **14 passed, 0 failed, 0 inconclusive** as of this afternoon. Run that one
before deploying regardless.

---

## 5. Pre-flight, in order

```bash
cd ~/Developer/Birding-Quiz-App && python3 pipeline/verify_before_deploy.py   # expect 14/14
cd ~/Developer/beakbrain-site  && ./deploy-worker.sh --dry-run                # read the tree report
cd ~/Developer/beakbrain-site  && ./deploy-worker.sh
```

`git status` immediately before, every time, not once per session. On 19 August a
concurrent session's in-flight change rode out inside an unrelated deploy and put 26 URLs
on live 404s. A tree that was clean ten minutes ago proves nothing.

## 6. After it lands

Wait a full minute first. **A fresh deployment answers 404 for about 60 seconds** with a
Cloudflare edge 404 (`no-store`, no CSP), which is not a routing bug and should not be
debugged as one.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://beakbrain.com/birds/compare/african-fish-eagle-vs-bald-eagle/
curl -s https://beakbrain.com/birds/compare/alder-flycatcher-vs-least-flycatcher/ | grep -o '<title>[^<]*'
curl -s https://beakbrain.com/sitemap-wave2.xml | grep -c '<loc>'
curl -s -o /dev/null -w "%{http_code}\n" https://beakbrain.com/trips/colorado/
```

Expect `200`; a title reading `Alder Flycatcher or Least Flycatcher? Size, Calls and
Range`; `2001`; and either `200` or `404` on Colorado depending on which option you took
in section 3.

---

Related: `project_beakbrain_workers_migration`, `project_beakbrain_multisession_deploy`,
`project_beakbrain_search_demand`, `project_beakbrain_check_calibration`.
