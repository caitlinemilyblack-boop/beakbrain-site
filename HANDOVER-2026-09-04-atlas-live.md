# Handover, 2026-09-04: the atlas is live, and what it still owes

Supersedes `HANDOVER-2026-09-03-deploy-open-loops.md`. Everything in section 1 of that
file shipped; its section 4, the permanently red `verify.js` gate, was re-baselined to
58 KB on 2026-09-03 with the reason in the message, and it now runs green.

---

## 1. What is live

**All 63 sub-national guides. Fifty states, ten provinces, three territories.** Deployed
2026-09-04 (worker version `d1bc5c7a`), 1,878 files uploaded, 46,562 assets against the
100,000 ceiling. Every one of the 63 was checked by hand afterwards and answers 200.

Each carries five or more regions, its areas geocoded and checked against the real
border, a species list scoped to its own boundary, a photo review recorded by name, and
zero blocking findings. `cross-names` is clean across the fleet and 138 of 138 render
clean.

Also live from the same deploy: the shared-coastline change below, the Nearctic card
chips, and the SEO work the previous handover described.

**Page weight moved a long way.** The land outline used to be written into the page once
per map; it is defined once and referenced now, and rings too small to draw are dropped.

| | before | after |
|---|---:|---:|
| Nunavut | 2,832 KB | **652 KB** |
| Newfoundland and Labrador | 1,701 KB | **552 KB** |
| British Columbia | 996 KB | **481 KB** |
| Quebec | 1,031 KB | **469 KB** |
| Ontario | 903 KB | **438 KB** |

The fleet averages 572 KB a page. England at 4,353 KB and France at 3,554 KB are the
outliers and their weight is lodges, not maps.

---

## 2. Cat's eleven answers and where each stands

| | answer | state |
|---|---|---|
| deploy-63 | Deploy all 63 | **done**, live and verified |
| months-numbers | Strip pac/car/mig too | **done**, 118 guides, prose kept in `review/` |
| photo-url | Add `photo_url`, migrate all 284 | **done**, 285 migrated, 953 picks verified unchanged |
| landpath | Restructure the maps | **done**, see above |
| dedupe | Do not run it | **respected**; the six guides already deduped keep their overrides, each with a recorded reason |
| species-lists | Keep GBIF and keep saying so | **nothing to do** |
| condor | Find out why, then add | **cause found and fixed at source**, needs a pipeline rebuild to appear |
| books | Get all seven | **list delivered**, and it is 34 units, not seven |
| parks | Add them, backfill all 63 | **in progress**, 6 of 63 fetched, see section 3 |
| lodges | Run them on all 63 | **not started** |
| heroes | Source a clip per guide | **candidates ranked**, none chosen |

---

## 3. Parks: in progress, and the approach needs a decision

`propose-parks.js` is written and works. It reads the protected-area cache that
`fetch-protected.js` already keeps for the lodge import and proposes what each region
should name. Tested on Quebec: 12 parks across 4 regions, including Forillon,
Fjord-du-Saguenay, Jacques-Cartier, Mont-Tremblant and the Cap Tourmente reserve.

**The blocker is the fetch, not the proposal.** 6 of the 63 have a cache after several
hours. The loop is running one guide at a time against Overpass and queries each guide's
whole bounding box; Alaska's is enormous and took most of that time on its own.

Two ways forward, and the second is better:

1. Let it run. Hours, and the biggest states may time out repeatedly.
2. **Query per REGION bounding box rather than per guide.** A region is a few hundred
   kilometres across, the query returns in seconds, and the proposal only ever uses areas
   near a region's own coordinates anyway, so the wide query is fetching thousands of
   protected areas that are discarded on the next line. Quebec cached 1,490 of them and
   the proposal used 12. At 6 guides in several hours the current loop finishes some time
   tomorrow; per region it is minutes.

Nothing has been written to any guide yet. `apply-parks.js` takes a proposal and a
verdict file and is unchanged.

**Links.** No URL is proposed. `apply-parks.js` writes a link only where a verdict file
says it was opened and found to name its park, and a park without one renders as plain
text. 34 dead links reached the guides once by assuming a plausible URL was a good one.
Backfilling names first and proving links second is the safe order.

---

## 4. The condor, and why it is not on the site yet

`pipeline/step1_avilist.py` excluded 204 of AviList's 11,131 species as extinct or
possibly extinct. That is right about 202 of them. It is wrong about the two AviList
files under "Previously Extinct in the Wild, but reintroduced": **California Condor** and
**Guam Rail**. About 350 condors fly free over California, Arizona, Utah and Baja.

Fixed at source, committed in the pipeline submodule as `1ce0403`. Step 1 now yields
10,929.

**It will not appear until `world.json` is rebuilt**, which is the full pipeline chain and
`step2_gbif_region.py` alone is one to two hours. That is a deliberate run, not something
to start unattended. Until then the California guide still cannot name the bird.

Worth a second look at the next AviList release: five species are Extinct in the Wild with
captive populations, and three have active release programmes — Hawaiian Crow, Spix's
Macaw and Guam Kingfisher. AviList v2025b has not moved them, and that file follows
AviList rather than the news.

---

## 5. The app: shipped, and the OTA nearly went nowhere

Sentry `REACT-NATIVE-S`, a real user on 1.0.2+28, opened Credits & licences and tapped
Xeno-canto:

```
Error: Unable to open URL: https://xeno-canto.org
mechanism: onunhandledrejection
```

`Linking.openURL` rejects when iOS declines the URL, which for an https address is almost
always Screen Time or a content filter. **Thirteen `openURL` calls across five screens had
no catch on them**, so every one was an unhandled rejection waiting for the right user.
`src/openLink.ts` catches, says what happened, names Screen Time, and prints the address.
Committed as `a023706`, published to `production` as update group **`da774921`**.

**READ THIS BEFORE THE NEXT OTA.** The first publish went to runtime **1.0.1** and reached
nobody, and it looked entirely successful doing it: `✔ Published!`, an update group ID and
a dashboard link. Every live user is on **1.0.2**.

`runtimeVersion.policy` is `appVersion`, and for an UPDATE that resolves from `app.json`.
`eas.json` carries `"appVersionSource": "remote"`, which reads like "EAS knows the
version" — it governs **builds** and the auto-incremented build number, and does nothing
for `eas update`. `app.json` had been left at 1.0.1 when the 1.0.2 build shipped, so the
file and the binary disagreed and the update targeted a runtime with no users on it.

The only tell is the `Runtime version` line in the result block. **Read it back, every
time.** `app.json` is corrected to 1.0.2 in `b3fab90`, and a real submission must bump it
there as well as remotely or the next fix goes into the same hole.

`dist/` was cleared afterwards: `eas update` overwrites it with 56 MB of native bundles,
and the next `wrangler pages deploy dist` then dies on Cloudflare's 25 MiB per-file limit
with an error that names the file and not the cause.

Users get an update on the SECOND launch. Close the app fully, open, close, open.

## 6. What is still owed on every one of the 63

Unchanged by the deploy, and each is a decision Cat has already made:

- **No hero clip** (63 of 63). Every page opens on the site reel, which is a
  Blue-and-yellow Tanager, a European Goldfinch and a Eurasian Hoopoe. Candidates are
  ranked in `data/_hero-candidates.json`; the ranking was wrong until today, because the
  occurrence test used the guide's `iso2` and a state carries its parent's, so Fish Crow
  topped both the Yukon and Nunavut. It reads `card_species` now.
- **Nowhere to stay** (62 of 63).
- **No community section** (63 of 63).
- **GBIF species list** (59 of 63), which Cat has settled: keep it and keep saying so.

---

## 7. Pre-flight, unchanged

```bash
cd ~/Developer/Birding-Quiz-App && python3 pipeline/verify_before_deploy.py   # expect 14/14
cd ~/Developer/beakbrain-site  && ./deploy-worker.sh --dry-run
cd ~/Developer/beakbrain-site  && ./deploy-worker.sh
```

`git status` immediately before, every time. A fresh deployment answers 404 for about 60
seconds; that is the Cloudflare edge, not a routing bug.

**Everything is pushed as of 2026-09-04.** All four repositories: `beakbrain-site` (17
commits), `beakbrain-site-build` (95), `beakbrain-app`, and the `beakbrain-pipeline`
submodule carrying the condor fix. Both trees are clean.

Worth remembering anyway: the deploy rsyncs the working tree rather than HEAD, so what is
live and what is on the remote are only the same thing while the tree is clean.

---

## 8. New tools, and what each is for

| file | what it does |
|---|---|
| `build/travel/source-shelf.py` | every book a guide cites must be a book we hold. Found two that were not |
| `build/travel/photo-dedupe.py` | finds region photos used on more than one guide; takes the largest free alternate |
| `build/travel/propose-parks.js` | proposes the protected areas each region should name |
| `src/openLink.ts` (app) | opening a link never crash-reports |

Related: `project_beakbrain_multisession_deploy`, `project_beakbrain_state_guides`,
`project_beakbrain_link_evidence`, `project_beakbrain_check_calibration`.
