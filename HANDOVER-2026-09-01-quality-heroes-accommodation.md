# Handover, 2026-09-01: heroes, access, quality machinery, and the accommodation wall

**Everything below is committed and pushed** on `country-guides-2026-08-20` (build),
`trips/nation-guides-heroes-and-fixes` (site) and the three app repos.
**Nothing is deployed.** The live site is the earlier deploy by the footers/Atlas session.

Full write-up with the numbers: https://claude.ai/code/artifact/e8eaea81-9f6e-4643-b865-90d0f98cd809

---

## 1. Loose ends from HANDOVER-2026-09-01-footers-atlas-specimens, closed

- **`build-data.mjs` has the museum accession rule.** Deliberately narrow, and measured
  against all 81,029 image URLs before choosing: `AM_LB` matches 7, the general
  "letters then digits in brackets" rule matches 18 and **17 of those are good
  photographs** whose brackets hold a camera filename. Their warning was exactly right.
- **The Dovekie's Belgian village photo is gone.** `Alle-sur-Semois…(DSCF4844).jpg`,
  flagged and removed; Dovekie keeps nine photographs.
- **Their uncommitted work is committed** (`6d607b9` build, `4af576b` site). It was live
  and unprotected.
- **Still open from that handover:** the app has not shipped the 389 specimen removals
  (needs a data rebuild and an app deploy), and the four held-back species still keep a
  specimen because it is their only photo.

## 2. "The Complete Birding Atlas"

Renamed in `build/trips/template.html` and `build/travel/generate.js`, hub rebuilt.

## 3. What the new quality machinery found

| Script | Finds |
|---|---|
| `build/travel/coherence.js` | 24 guides whose month strip scores are ALL ZERO; 22 targets no region names; Australia's 3 blank season cards |
| `build/travel/coherence-mutants.js` | proves each check still catches its own seeded fault; exits 1 if not |
| `build/travel/gbif-seasonality.js` | 64 of 68 guides agree with GBIF's busiest months; 4 to look at |
| `build/trips/harvest-greenkey-global.js` | 3,964 awarded sites, 61 countries, reaching 97 of our 620 regions |
| `build/travel/ingest-books.py` | classifies a new book before registering it |

**Three of seven coherence checks were wrong on the first run.** Two repaired, one
**retired rather than tuned**: comparing "Best months" prose to the month table fired on
33 of 44 eligible guides, because the prose names ranges with reasons. Tuning a check
until it goes quiet is the wrong repair.

## 4. THE ACCOMMODATION WALL — read before promising anything

**341 of 627 regions have no place to stay. Only 10 guides are fully covered.**

The bar is right and must hold: a listing must be **birding-focused, certified, or inside
a protected area**. Padding regions with generic hotels would make the certification
badges on the page a lie.

What the four supply routes can actually reach:

1. **W&W archive** — 364 rows, Europe-weighted.
2. **Certification registers** — Green Key measured WHOLE on 2026-09-01 is better than the
   2026-08-26 reading of "Europe only": 61 countries, and it reaches **97 regions**,
   including Ethiopia, Zambia, Madagascar, Kenya, South Africa and Morocco. Harvested to
   `build/trips/greenkey-global.json`, **not yet wired into the lodge pipeline.**
   Travelife's hotel arm has **no public directory**; it is a B2B site.
3. **Operator itineraries** — 37 lodge names extractable from `tours.json`, 12 countries.
   Not yet verified or written up.
4. **Hand research** — the only route for the rest, and the expensive one.

**A BUG WORTH FIXING: `fetch-greenkey.js` asks ArcGIS for `country='France'`
case-sensitively, and the register holds both `France` and `FRANCE`. It has been silently
dropping 186 French rows.** The global harvester folds case and cannot have this bug.

## 5. Books

`build/travel/ingest-books.py` reads Downloads, parses the Anna's Archive filename, probes
the text and **classifies before registering**. Shelf is now 82 books.

**The five that arrived today are four field guides and one avifauna, so this batch closes
no access or accommodation gap.** Only a site guide fills access; a field guide names a
park, which says nothing about reaching it. The script prints that verdict rather than
filing them all as "new books". Library paths come from `_shelf.json`, never from memory,
because that folder has moved twice.

## 6. Still to do

1. **Wire `greenkey-global.json` into the lodge pipeline** — the fastest real gain,
   ~97 regions.
2. **Verify and write up the 37 operator-itinerary lodges.**
3. **24 month tables and Australia's season cards** need sourced editorial writing. GBIF
   gives a defensible signal for record volume; it cannot write the notes.
4. **22 targets that no region names.**
5. **Phase 3, the claim ledger** — per-claim provenance. Not started; do not start it until
   the cheap tiers stop finding faults.
6. **Deploy.** `./deploy-worker.sh --dry-run` first; 41 new hero clips and posters were
   added earlier today.

## 7. Gates

`render-check` 69/69. `selfcheck` 0 blocking. `coherence-mutants` all six catch their own
fault. Hero captive gate: 0 captive across 54 Commons clips.
