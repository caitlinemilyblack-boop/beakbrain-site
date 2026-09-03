# Handover, 2026-09-03: the atlas programme, and what fifty states still owe

**Everything below is committed. NOTHING IS DEPLOYED.** Read
`HANDOVER-2026-09-03-deploy-open-loops.md` before you run `deploy-worker.sh`: another
session's SEO work sits committed in the tree and rides out with anything you push.

Continues `HANDOVER-2026-09-03-six-guides-and-the-page-queue.md`, whose largest open item
(the geocoder audit) is closed here.

---

## 1. What changed

| | start | now |
|---|---|---|
| guides live on the hub | 74 | **76** (Texas, Colorado) |
| US states and provinces started | 0 of 63 | **49 of 63** |
| species write-ups reaching a reader | 0 of 544 | **all of them** |
| guides whose card wall claims the right region | 76 | **123** |
| permanently red gates | 1 | **0** |

Texas is guide 75 and Colorado 76. Vermont is written and staged. 47 more states are
scaffolded and species-scoped, staged in `pending/`.

## 2. The geocoder audit is closed, and it needed no rerun

`geo-audit.py` finds the HOLD bug by its fingerprint in GIT HISTORY rather than in the
cache. The buggy line was the only path that writes a CHANGED `q` while leaving `lat`,
`lon` and `display` alone, because a normal re-resolution rewrites the row and drops `q`.

**0 rows carry it across the 24 geo caches with more than one committed version.** The
other 52 were committed once and cannot be tested this way, and the script says so.
Sibley Peninsula stays the only known case. **Do not spend a session rerunning 26 sub-REV
caches for this.**

## 3. What a state guide needs that a country guide did not

- **`countrycodes=us` bounds nothing inside the United States.** Nominatim answered
  "Caddo Lake, Harrison County, Texas" with the lake's centroid at Oil City in **Caddo
  Parish, Louisiana**, 83 km out and inside any Texas bounding box, because a state's own
  box contains its neighbours' edges. Run `state-bounds.py <slug>` on every state guide.
  It measures to the nearest EDGE, not the nearest vertex: measuring to a vertex called
  Herrick's Cove a fault at 3.6 km when it was a few hundred metres outside a simplified
  river border.
- **Every state file takes a `us-` prefix.** Nine state codes collide with live guides:
  AR Argentina, **CA CANADA**, CO Colombia, DE Germany, ID Indonesia, IN India,
  MA Morocco, MN Mongolia, PA Panama.
- **The card wall claims the whole country until it is scoped.** Texas showed 1,331
  species under "Every bird of Texas".

## 4. GBIF solved the thing that could not be automated

Cat asked whether GBIF could scope a state the way it scopes a country. It can.
**Every US state and Canadian province is a GADM level-1 unit**, exactly as England,
Scotland, the Azores and Madeira are, so `gbif-region-species.js` asks for a real border.
All 63 ids are read from `api.gbif.org/v1/geocode/gadm/<ISO3>/subdivisions` rather than
typed, because GADM numbers alphabetically and a typo is a silent wrong state.

**47 states scoped, no failures**, California 827 down to West Virginia 366.

**Checked against the two committee lists we hold before trusting it**: GBIF says 733 for
Texas against the committee's 673, and 534 for Colorado against 520. Three to nine per
cent wider, because it counts records no committee has vetted. So GBIF is an UPPER BOUND,
every scoped page carries a `card_species_source` stamp saying so, and a committee list
still wins where one exists. The script already refuses to overwrite one.

**The alternatives are dead ends.** Wikipedia's Texas article carries 117 species the
committee has never accepted, including Barnacle Goose and Whooper Swan. Avibase would
have covered all fifty uniformly and is Cloudflare-blocked in a real browser as well as a
checker.

## 5. The write-ups reach a reader now

`species_tourism.heading` and `.blurb` were written on all 76 guides and rendered on
**none**: 544 finished write-ups that `dead-copy.js` had been reporting as UNDECIDED for
weeks. Cat's answer on the decisions artifact: render it, eight birds a guide.

They render as **"Birds that decide the trip"** above each card wall, heading linked to
the bird's page, with when and where. Measured after: `species_tourism.blurb` reads 71
live and 5 absent, where it read 76 written and 0 rendered. Undecided fields fell 10 to 8.

## 6. Three cross-names faults fixed in the check, not by exemption

A new guide takes names from its neighbours, and the state programme makes that constant.
**Run `cross-names.js` with NO ARGUMENT after every build.**

1. **Falcon.** SUFFIX strips "state park" off Falcon State Park, handing Texas the bare
   word and breaking thirteen guides that name a Saker, Eleonora's or Orange-breasted
   Falcon. A one-word short form that is a bird GROUP word, read out of `browse.json`, is
   now owned by nobody.
2. **Boulder.** Broke Botswana and Zimbabwe, which write "Boulder Chat" as prose as well
   as `[markup]` and only the markup was blanked. A bird a guide has bracketed anywhere is
   now blanked everywhere on that guide. The group-word rule cannot reach it: Boulder is
   the modifier, not the last word.
3. **State Forest.** `state` joins GENERIC beside `forest`, so the bare phrase is not
   ownable and Texas's W.G. Jones State Forest stopped failing.

**A new guide also makes its neighbour's copy leak.** Texas's hill country began reading
as Colorado's the moment Colorado existed, because the Colorado River and Colorado Bend
State Park are in Texas.

## 7. The species page gate is a check again

`build/species/verify.js` had been red on EVERY run: 55.7 KB mean against a 51 KB budget.
A check that always fails is not a check.

Re-baselined to 58, and unlike the 2026-08-25 move the growth is **attributed**. Over a
600-page sample, **99% of species pages carry an inline card SVG and it is 49% of the
average page**: a page with one is 56.0 KB, a page without one is 31.4 KB. The card costs
about 25 KB and IS the budget. It cannot simply be externalised, because inline SVG obeys
the host page's @font-face and a linked one does not. **The line has now moved three times
while one known component pushes it. The next move should be the SVG.**

## 8. WHAT IS LEFT, counted

Run `python3 build/travel/state-gaps.py --todo` for the live version; this is tonight's.

**63 units: 2 live, 47 scaffolded, 14 not started.**

The 14 not started are **all 13 Canadian provinces** and **New Hampshire**, which has no
fielded IBA account at all and is web research only.

Per-guide work outstanding, and the count of guides needing each:

| what | guides |
|---|---:|
| regions to name, tag, blurb and give species to | **138 regions across 47 states** |
| region photos to review by eye (about a third fail) | 47 |
| itineraries to write, without which every region is an orphan | 47 |
| nowhere to stay | 48 |
| no hero clip | 49 |
| no community section | 49 |
| book sites the gazetteer would not place, so they are off their pages | **166** |

Worst unplaced: California 24, Alaska 13, Illinois 11, Florida 10, Louisiana 8.

**Canada splits unevenly and three provinces have nothing.** The national page's 21
regions already sit inside provinces: British Columbia 6, Ontario 4, Alberta 3,
Saskatchewan 2, Manitoba 2 are all viable now; Quebec, Newfoundland and Yukon have one
each; New Brunswick and Nova Scotia share one and need splitting. **Prince Edward Island,
the Northwest Territories and Nunavut inherit nothing and have no book.**

## 9. The machinery, so none of this is retyped

| script | does |
|---|---|
| `state-gaps.py` | the register. `--todo` lists what each guide owes, separating publication blockers from thinness |
| `state-report.py` | writes `STATE-PROGRAMME.html` from the register. Re-running it IS the update |
| `state-scaffold.py` | outline, areas with the book's own county, geocode, distance-cluster into regions carrying habitat/when/access |
| `state-requery.py` | second pass at what the gazetteer refused, which is names the book writes as a pair or with a parenthetical |
| `state-bounds.py` | every coordinate against the state outline |
| `iba-accounts.py` | the ABC directory into 492 fielded records, the book read twice and checked against itself |
| `geo-audit.py` | the HOLD bug by its fingerprint in history |

**A scaffold stages in `pending/` and must not sit in `data/`.** cross-names reads every
`data/*.json` with sites in it, so 47 half-built states there would claim their site names
against the 76 that are finished. Promote with `state-scaffold.py <slug> --promote`, which
refuses while any region is still called TODO. **Vermont was left in `data/` by mistake
tonight and the fleet rebuild built an unlinked page for it**; staged back and the page
removed, because an unlinked built page rsyncs out with the next deploy anyway.

## 10. Decisions still open

1. **Colorado is built, linked from the local hub, and 404 live.** Deploy it or hold back
   both it and the hub link. Section 3 of the deploy handover has the mechanics.
2. **Were the "three fields left over from the retired months chart" the numeric
   `pac`/`car`/`mig`?** `months.note` is retired with the decision recorded. The three
   numbers are untouched, because that is a bulk write across 76 guides and it should not
   ride on a reading of a one-line answer.
3. **Books.** The want list is in `STATE-PROGRAMME.html`, drawn from the IBA directory's
   OWN bibliography so every title is known to exist. They are 1990s books, which matters
   in one direction only: buy them for SITE SELECTION, which is the real gap at seven
   sites a state, never for access, which `stale-access.js` exists to catch and which
   already comes from official park pages with every link verified. Seven of the states
   have a verified free birding trail that beats the book; those rows say so.

## 11. Traps this session paid for

- **A register that flatters itself is worse than none.** `state-gaps.py` counted only the
  areas a page KNOWS about, and the scaffold drops a site the gazetteer refused, so it
  reported 393 of 397 placed while 166 book sites were missing from their pages entirely.
- **`fs.usda.gov` blocks a real browser**, not just a checker: "The request is blocked".
  Eight Forest Service links were dropped rather than shipped unverified.
- **`vtecostudies.org` soft-404s**, answering 200 with a Page Not Found title.
- **A county in the query sometimes makes it worse.** Gunnison National Forest returns
  nothing with its county and the right polygon with the bare state.
- **OSM tagging defeats the area picker regularly.** Bentsen is `historic/memorial`,
  Loveland Pass is `tourism/viewpoint` rather than `mountain_pass`. Both were pinned.
- **Region photos fail at about a third, and there is a new shape.** Alongside the museum
  taxidermy mount, the shed feathers and the 337px "original", Sage Grouse failed on its
  first THREE picks because a lek is watched down a telescope: **a circle of image in a
  black surround**. Every lek species will keep producing it.

Related: `project_beakbrain_state_guides`, `project_beakbrain_geocode_hold_bug`,
`project_beakbrain_guide_neighbour_effect`, `project_beakbrain_check_calibration`.
