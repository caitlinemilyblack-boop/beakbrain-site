# Handover, 2026-09-04 (evening): three of the four gaps closed, heroes mid-flight

Supersedes `HANDOVER-2026-09-04-atlas-live.md`. Everything its section 2 listed as open is
either done or has a decision recorded against it below.

---

## 1. What the 63 owed this morning, and what they owe now

| | at the morning handover | now |
|---|---:|---:|
| no parks | 63 | **0** |
| no community section | 63 | **0** |
| nowhere to stay | 62 | **18** |
| no hero clip | 63 | 62 |
| GBIF species list | 59 | 59, settled by Cat: keep it and keep saying so |

63 of 63 selfcheck clean, `cross-names` clean across 137 guides, 138 of 138 render clean,
`verify_before_deploy.py` 14 of 14. **Committed and pushed on both repos. Nothing deployed
— Cat asked for one deploy once the hero work lands.**

Sentry: one unresolved issue, `REACT-NATIVE-S`, the xeno-canto one already fixed. The event
that reopened it came from a device still on the EMBEDDED bundle, and the fix is live on the
right runtime this time — group `da774921`, Runtime Version 1.0.2, `app.json` reads 1.0.2.

---

## 2. Parks: 1,374 across 324 regions, names only

`fetch-protected.js --atlas --regions` boxes each region's own areas, pads 40 km with a
cosine floor, and unions every box into ONE Overpass request per guide across three mirrors.
Alaska went from timing out all afternoon to 232 s. **Maine's five boxes cost 342 s as five
requests and 149 s as one**: Overpass charges for the round trip, not only for the ground.

Five faults in `propose-parks.js`, every one of which looked like success, and one in
`apply-parks.js` that would have destroyed the only good park data on the atlas. All of them
are written up in `project_beakbrain_parks_backfill` — read that before touching either
script. The short version: **a bbox centre is not a place** (it hid Acadia from Maine), a
two-part park must not claim the gap between its parts (the Emmett Till monument reached all
six Illinois regions), a name match 500 km away is not a match, a pin must be near the
region it is filed under, and the pin decides last.

`apply-parks.js` merges and converges now. **A hand-placed entry is marked by `query` or
`geo_display`** — the record of a gazetteer lookup a person ran — and is never moved or
dropped. Colorado's 15, Texas's 25 and Vermont's 5 survived with all 35 of their links.

**No park carries a URL.** That is the next piece of work if anyone wants it: open each
official page, confirm it names its park, and feed a verdict file to `apply-parks.js`.

---

## 3. Lodges: the gap was the source, not the import

Measured before writing anything:

    Green Key (FEE), greenkey-global.json   0 rows in the United States, 0 in Canada
    W&W supplier archive                    1 row, Fairmont Banff Springs, birdy false
    operator itineraries, tours.json        0 tours filed to either country

**FEE's Green Key does not operate in North America. A different organisation of the same
name does**, run since April 2024 by AHLA and Hotels Canada, publishing 1,120 certified
properties on a map. `harvest-greenkey-na.js` pulls it, filed by state and province because
that is what a state guide calls its `country_name`. **517 rows on 45 guides.** Snapshot
before and after: 0 rows lost.

Cat approved shipping all 517 knowing the trade: they are largely chain hotels, and the
coverage is backwards from the birding — Ontario gets 77 while Alaska, Maine, Vermont,
Wyoming, New Mexico, Montana and Idaho get zero. See
`project_beakbrain_greenkey_north_america` for the harvest's traps, including that the
rating is only published as the map pin's icon.

---

## 4. Community: 497 cards, and not a word of it written here

`build/data/20-north-america.json` already held 73 groups across 52 American regions and 43
across 14 Canadian ones, each researched and URL-checked for /community.
`community-from-directory.js` copies them across, so a guide and the directory cannot
disagree about a club.

The membership bodies are carried and the recurring counts are not: **all thirteen
Countrywide entries on every state page would have made the section read the same from Maine
to Arizona.** Nunavut is the one guide with no club of its own and says why, from the
directory's own `gaps` field.

**`generate.js` ranked `national` above `local`**, which is right for a country guide and
backwards for a state — it put the American Birding Association above Maine Audubon on all
63. Each of the 63 now carries `parent_country_name` as a fact and the rank inverts where it
is set.

---

## 5. Heroes: MID-FLIGHT, and the rules changed twice today

**Read `project_beakbrain_hero_quality` before touching any of this.** Cat's rules, both new:

> "mostly high quality and no camera movement" · "the same video in up to 10 pages as long as
> the species is found in that country or region (no vagrants)"

Nothing in the picker measured either. The width floor was 1280, now 1920, and
`hero-motion.py` measures global frame displacement, drift and cuts.

**46 of the 81 heroes already live fail the bar.** Minnesota drifts 152% of frame width,
Mississippi 130%. Cat's call: replace what the steady pool can cover, leave the rest, never
pull a page back to the generic reel to make a point.

### WHERE IT IS RIGHT NOW

`hero-motion.py --candidates` is **still running**: about 190 of 215 clips measured, roughly
9% steady. Let it finish, then:

    python3 build/travel/pick-highlight-heroes.py --write
    python3 build/travel/hero-vet.py --write        # GBIF, proves no vagrant
    python3 build/travel/build-heroes.py            # only vetted picks
    python3 build/travel/check-hero-captive.py

**`build-heroes.py` does NOT yet refuse an unvetted pick.** `pick-highlight-heroes.py`
writes `vetted: false` on every row and `hero-vet.py` stamps it true; wiring the refusal into
the builder is the one piece of this not yet done.

**A build against the old criteria was stopped at 23 of 62 and reverted.** 21 of those 22
guides failed the new bar, so their `hero_videos` entries were checked out and their mp4s
deleted. **New Brunswick's Great Blue Heron is the one that survived** and is the only
uncommitted hero asset on disk.

---

## 6. Pre-flight, unchanged

```bash
cd ~/Developer/Birding-Quiz-App && python3 pipeline/verify_before_deploy.py   # expect 14/14
cd ~/Developer/beakbrain-site  && ./deploy-worker.sh --dry-run
cd ~/Developer/beakbrain-site  && ./deploy-worker.sh
```

`git status` immediately before, every time. **The deploy rsyncs the working tree rather than
HEAD**, so what is live and what is on the remote agree only while the tree is clean, and
right now it is not: New Brunswick's hero files are untracked.

The condor is untouched and still needs the deliberate `world.json` rebuild.

## 7. New tools

| file | what it does |
|---|---|
| `build/trips/harvest-greenkey-na.js` | the North American Green Key register, filed by state |
| `build/travel/community-from-directory.js` | community sections from the worldwide directory |
| `build/travel/hero-motion.py` | how much the camera moves, and whether the clip has a cut |
| `build/travel/hero-vet.py` | GBIF proof that a hero's bird is no vagrant there |

Related: `project_beakbrain_parks_backfill`, `project_beakbrain_greenkey_north_america`,
`project_beakbrain_hero_quality`, `project_beakbrain_protected_polygons`.
