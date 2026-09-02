# BeakBrain site — open work

Started 2026-08-31. Numbers here were measured, not estimated; each says how. Update it as
things move rather than writing a fresh handover for each one.

---

## Blocking everything

**NOTHING IS BLOCKING. This whole section closed on 2026-09-01 and the entries below are
kept only so the numbers are not re-measured.** Re-verified 2026-09-02.

- [x] **The 20,000-file deploy ceiling is gone.** The site left Pages for Workers static
      assets, where the 100,000 ceiling comes with Workers Paid and carries no zone
      condition. Deploy with `./deploy-worker.sh`; `./deploy.sh` is retired.
      → `project_beakbrain_workers_migration`, `project_beakbrain_file_budget`
      Kept from the diagnosis: measure with the dry run, never a raw `find` over the working
      tree, and the real asset count is files PLUS directories, roughly double every figure
      the old notes report.
- [x] **The home-patch Worker is deleted.** `beakbrain-home-patch` went on 2026-09-01 when a
      real deploy went out. The whole domain is the Worker `beakbrain-web` now.
      `~/Developer/beakbrain-home-patch/` still holds source that serves nothing.
- [x] **Every page carries the App Store link.** Verified 2026-09-02: **77 pages** hold the
      direct `apps.apple.com` link and **0** still use the `/#get` anchor.

## The lodge rule changed on 2026-09-02, and it changed everywhere

Cat: **"all accomodation needs a certification or be birding focused"**, and asked
explicitly for it to hold outside Europe too: *"make sure that's the rule for europe too
(worldwide)"*. Her reason is the whole product argument for the section: **"its easy for
people to find accomodtion nearby but hard for them to know whats certified and whats
birding focused/relevant"**. That reverses the 2026-09-01 loosening.

Also hers, on how wide "relevant" is allowed to be: *"if it's mentioned thats already a
good relevance but not all relevant accomodation on w&w list will mention birds but still
have birding relevance or focus in that particular country or with a closer look."*

**Shipped.** 9,085 rows to **6,732**. Regions with nowhere to stay 152 to **172**. Gone:
Park Hyatt Mendoza and nine more Mendoza wine hotels, Shangri-La Changchun, Conrad Urumqi,
Waldorf Astoria and JW Marriott Panama, Barcelo San Salvador, Longitude 131, Hyatt Canberra.
**0 hand-researched rows lost**, proved by the snapshot.

The five doors a row can come through, each recorded BY NAME on the row in
`birding_relevance` so the data says which:

| door | rows | what it means |
|---|---:|---|
| certified | 6,039 | a scheme's own register names it |
| wildlife | 533 | its Activity Type or prose is about animals and land |
| bird | 241 | its prose says bird, birding, ornithology or avian |
| stay-type | 127 | the archive's own Property Type is a safari lodge, tented camp, eco lodge, bush camp |
| named-for-a-park | 77 | its NAME contains a park this guide lists |
| inside | 36 | its coordinate falls inside an OSM protected-area polygon |

`WILD` deliberately excludes "eco", "green" and "sustainable": those describe how a place is
run, which is the certification question, and letting them in opens the second door onto the
first one's ground.

- [ ] **9 guides lost region coverage** and it is all city, wine and beach hotels:
      el-salvador 1→5, bolivia 4→7, china 3→6, ecuador 1→3, morocco 3→5, argentina 2→4,
      australia 1→3, madagascar 3→4, india-himalaya 1→2. Each needs hand research now, and
      that research has to clear the same two doors.
- [x] **`build/travel/fetch-protected.js` is new.** It caches the OSM protected-area rings
      of each guide's bbox to `data/_protected-<slug>.json`, **gitignored** because Australia
      alone is 20 MB and the fleet is over 100. The import writes the verdict onto the row,
      and the lodge files ARE tracked, so the answer is preserved and only the input is
      refetchable. Three bugs worth remembering, all of which made the cache look like it
      was working: `.map(simplify)` passes the ARRAY INDEX as the tolerance; Douglas-Peucker
      on a CLOSED ring measures against a zero-length segment and keeps everything; and the
      archive writes **"-" for no certification**, which is truthy, so those rows skipped the
      relevance test, were rejected as booking-club-only, and were then silently PRESERVED by
      the keep-what-cannot-be-rebuilt rule. Galapagos looked untouched while six lodges were
      being refused and resurrected on the same run.
- [x] **Green Key's global register reaches ZERO of the empty regions.** Measured 2026-09-02
      against all 153 then-empty regions at 45 km: no awarded row is near any of them. The
      "97 of 620 regions" in memory is true and counts regions that already have listings, so
      wiring the register in adds no coverage. → `project_beakbrain_accommodation_wall`

## Dead data the dead-copy check cannot see

- [x] **`dead-copy.js` now reads lists, and the report went from 24 dead fields to 30.**
      It tested strings only, and every list field was NAMED IN ITS SKIP LIST to keep the
      noise out, so the exclusion was invisible: it reported `bird_calendar_note`, the
      subtitle, among the retired fields while the calendar it introduces was skipped by
      name two screens above. Three things it taught, each bought once:

      - **A list is live only when MOST of its entries are on the page.** Probing the single
        longest string reported `bird_calendar` live because 18 guides of 62 carry one of
        their labels elsewhere in their own copy. Kenya's "Short rains" is a season name too.
      - **Report a list PER KEY.** `species_tourism` drives the target timing bars and the
        card wall from its slug, window, where and when, and its heading and blurb reach
        nobody. As one field it reads "delete this", which would be wrong and expensive.
      - `heading` and `title` had to join the prose keys before `prep` and `species_tourism`
        could be read at all.

- [ ] **WRITING THAT REACHES NO READER, measured 2026-09-02.** Decide render or retire:

      | field | guides | what it is |
      |---|---:|---|
      | `species_tourism.heading` + `.blurb` | 68 | eight species write-ups a guide, ~544 in all |
      | `bird_calendar.label` | 62 | the per-species timing bands; `generate.js` never mentions the field |
      | `months.note` | 57 | month-by-month prose, from the chart replaced by the season blocks |
      | `prep.note` | 55 | the app card's note renders, the field guide, driver and altitude notes do not |
      | `community_note`, `lodge_intro`, `lodge_rate_note` | 62/61/53 | already known |

      `species_tourism` is the big one and the best writing of the four. `bird_calendar` and
      `months.note` both belong to the retired months chart and are the obvious retirements.

## Parked, with the ground surveyed

- [ ] **Website translations** (fr, es, pt, de, nl, it, and possibly the Nordics).
      Parked 2026-08-31 and **re-confirmed parked by Cat on 2026-09-02: "ok no translations
      yet"**. The survey is done and three questions need her answer before Phase 1.
      → `HANDOVER-2026-08-31-website-translations.md`

      **Phase 0 is no longer a blocker.** The survey said nothing could ship until the
      20,000-file Pages ceiling was lifted; the Workers migration on 2026-09-01 removed it,
      and the site now stages 45,597 assets against 100,000. Phase 1 is ~470 files at six
      languages and fits with room to spare. The three questions are all that is in the way.

## Country guides — 68 live, all checks green

Measured 2026-09-01, re-measured 2026-09-02: **68 guides, 0 blocking selfcheck findings on
every one**, render-check **69 of 69** clean. Note that `trips/certifications/` is not a
guide, so a sweep over `trips/*/` yields 69 directories and 68 slugs.

- [x] **The hero rule changed on 2026-09-01 and this section is rewritten around it.**
      Cat's rule: the hero shows a **highlight species of that country**, it may be **filmed
      anywhere**, and it may **never** show a captive bird. That retired the
      country-of-filming gate. → `project_beakbrain_hero_rule`
- [x] **Heroes went 18 to 59.** Re-measured 2026-09-02: **59 of 68 guides carry their own
      hero**, drawn from **54 live clips** (some shared), and **9 open on the generic reel**.
      The old figures here, 49 of 67 on the reel and 26 owing a candidate search, are dead.
- [x] **The live gate passes.** `check-hero-captive.py`: 54 clips, 53 Commons-clean, **0
      flagged captive**, 1 from Pexels (Kenya, verified by hand), 0 unchecked.
- [x] **BOTH CHECKS RECALIBRATED 2026-09-02.** `check-hero-provenance.py` records where a
      clip was filmed and blocks only on captive footage or missing attribution;
      `selfcheck.js` dropped the filmed-in rules entirely rather than softening them, since
      a rule kept as a warning is still a rule a reader has to learn to ignore. `hero-clip`
      findings went **60 to 16, and all 16 are real**.

      **It found five heroes with no attribution at all.** Three (wales, ireland,
      northern-ireland) had their Pexels licence and source URL sitting in CREDITS.csv and
      never carried into the guide file; written in. **costa-rica and netherlands have no
      record anywhere**: nothing in CREDITS.csv, no download provenance on the files, no
      credit in the guide. Those two need Cat or replacing.
- [ ] **Two hero clips cannot be attributed.** `costa-rica-hero.mp4` (2026-08-19) and
      `netherlands-hero.mp4` (2026-08-20). A clip we cannot show the source of is one we
      cannot show the terms of.
- [ ] **Nine guides keep the generic reel and it is a genuine source ceiling**: angola,
      el-salvador, ethiopia, india-south, indonesia-sulawesi-moluccas, madagascar, mexico,
      zambia, zimbabwe. No highlight species of theirs has any Commons video. The three
      options below (accept it, source outside Commons, or allow a STILL hero) still stand,
      and the choice is still Cat's. A still of a bird that lives there beats a video of
      three that do not, and it needs a template change rather than new sourcing.
- [ ] **A split page needs a clip from its own REGION, not its own country.** Nine of the
      ten "easy wins" failed on this: one Brown Boobook file from coastal Odisha was proposed
      for all four India guides, and the brazil-amazon candidate was shot in Minas Gerais
      about 2,000 km from Amazonia. `_hero-region-scope.json` exists for exactly this and
      should gate the picker. Portugal currently holds 4 candidates back for want of a
      region verdict; `hero-region-scope.py --write` is the unblock.
- [ ] Two heroes show a bird their guide never names: australia's Common Bronzewing and
      china's Spotted Elachura. Both clips are confirmed in-country and both birds genuinely
      belong, so this is a copy gap rather than a data fault. China's is the more interesting
      one: the clip is from Shangrao in Jiangxi, and the guide has **no southeast China
      region at all**.
- [ ] One candidate is a **Sora AI-generated video** ("AI-generated videos of animals"),
      proposed for indonesia-greater-sundas. It is not a bird and not a place.
- [ ] **26 of 68 guides have no stop carrying an openable link** (re-measured 2026-09-02,
      after Australia went 0 to 8 of 93). Worst: australia 93 stops, morocco 65, ethiopia 60,
      peru 55, galapagos 45, portugal 45, mozambique 43. A dead link is worse than no link.
      → `project_beakbrain_link_evidence`

      **`build/travel/stop-links.py` is the tool for this**, written 2026-09-02. It proposes
      an official park-agency URL for any stop whose name says National Park, Nature Reserve,
      Conservation Park, State Forest or Regional Park, and then has to PROVE it three ways:
      the host must 404 a decoy path, the page must return 200, and the page TITLE must carry
      the stop's own distinctive words. Anything else is refused and the report says why.

      **The decoy test is what makes it safe, and it disqualified more hosts than it passed.**
      Northern Territory and Queensland parks answer 403 to a probe; ICNF (Portugal) and NWR
      (Namibia) answer **200 to a nonsense path**, so a 200 from them proves nothing and they
      are excluded rather than trusted. SERNANP (Peru), Galapagos National Park and
      Umhverfisstofnun (Iceland) all 404 a decoy and are usable, but their park URLs are not
      guessable from the park name, so a pattern has to be found before they can be used.
      Adding an agency is a two-line entry in the AGENCIES table.
- [ ] **Fleet warning census, re-measured after the 2026-09-02 recalibration.** Nothing
      here is blocking. The four checks that were guessing now say what they know:
      `area-scatter` 289 to **54**, `country-leak` 179 to **123**, `region-coherence` 111 to
      **24**, `hero-clip` 60 to **16**, and the prose five to **0**. The table below is the
      OLD reading, kept because the numbers were measured; the live ones are above.

      Where the work is now: `country-leak` 123 (mostly honest neighbour geography, which
      the check warns on by design), `stop-contact` 55, `area-scatter` 54, `stop-coords` 43,
      `tag-echo` 31.


      | count | check | what it means |
      |---:|---|---|
      | 289 | `area-scatter` | a region spread wide reads like a bad geocode |
      | 179 | `country-leak` | text reaching outside the guide's own country |
      | 24 | `region-coherence` | was 111; see below |
      | 60 | `hero-clip` | 44 of these are the retired provenance rule, see above |
      | 55 | `stop-contact` | stops with no link a reader can open |
      | 43 | `stop-coords` | stops that will not be pinned on the map |
      | 31 | `tag-echo` | a tag repeating what the prose already said |
      | 29 | `voice-copy` | Cat's voice rules |
      | 15 | `sentences` | participles tacked on a comma, the standing prose fault |
      | 15 | `outline-outlier` | |
      | 12 | `region-wildlife-empty` | no "Also watch for" line |
      | 11 | `jargon` | |
      | 10 | `species-range` | |

      **The 67 prose findings are CLEARED, 2026-09-02.** `voice-copy`, `voice`,
      `voice-caps`, `jargon` and `sentences` all read 0. Three of them were the CHECK being
      wrong rather than the copy: "GPS 41.72 -72.63" is a coordinate and not shouting,
      Barranco is a Belize village the guide lists as one of its own areas and not the
      Canarian word for a ravine, and a habitat word that is also a place on the guide now
      excuses itself from needing a gloss.

      **The jargon check turned up a real content fault.** All four nation guides shipped a
      byte-identical `bird_calendar`, and England's copy had been "fixed" by GLOSSING
      "Corncrakes calling on the machair" rather than by noticing that England has no
      machair and no wild corncrake. A gloss makes a false sentence clearer, never truer.
      Corncrake last bred in Wales in 1992; in Northern Ireland it breeds only on Rathlin,
      six calling males in 2025. Now: Scotland and Ireland keep the line with the gloss,
      Northern Ireland says Rathlin, Wales gets Manx Shearwaters on Skomer and Skokholm,
      England gets nightjars on the lowland heaths.
- [x] **`region-coherence` went 111 warnings to 24.** Every one of the 111 ended "so this is
      a big region or a big protected area", which is a check publishing its own guess 111
      times. It now tests the stop's coordinate against the OSM protected-area rings and
      says which park and how wide: "Pacaya-Samiria sits 178 km from anything in Iquitos and
      the Upper Amazon because it is inside Reserva Nacional Pacaya Samiria, which spans
      306 km." 86 became NOTEs. **The 24 left are stops no protected area contains**, and
      those are the coordinates worth reading: La Macarena town at 217 km, Magdalena Bay at
      166, Golmud at 127.
- [ ] **255 species carry an empty range** and are invisible to every guide: on no card wall,
      and refused by the check that stops a region naming a species. Angola Lark is one
      example, kept off its own country's page.
      → `build/travel/range-aliases.js`, `project_beakbrain_species_ranges`

      **Measured 2026-09-01, and the aliases are inert.** `synonym_map.json` holds 823
      aliases, 55 of which target one of the 255. But `world.json`, which is where
      browse.json's ranges actually come from, carries **zero regions for all 55**, so it has
      not been regenerated since the aliases were added. The aliases do nothing until it is.

      The chain is `pipeline -> world.json -> birds/browse.json -> rebuild all 68 guides`,
      and it is cross-repo, into `~/Developer/Birding-Quiz-App/pipeline`. Several scripts
      write world.json and the run order is not obvious from the outside, so **this needs
      somebody who knows the pipeline, not a guess**. Blast radius is every guide: a range
      change adds or removes card species fleet-wide, and a guide whose prose names a species
      that loses its range fails selfcheck as blocking. Worth doing, worth doing awake.
- [ ] `area-scatter` warnings on Malawi, Zambia and Zimbabwe are unresolved judgement calls,
      not faults: a region genuinely spread over 145 km reads the same as a bad geocode.
      Malawi's Liwonde sits 94 km from its region's median, Zambia's worst is 181 km.

## New pages the shelf can now support

- [x] **Ghana** — DONE 2026-09-01, guide 67, live on the hub. Eleven regions driven by the
      book's IBA table. **Its `access` is empty on all eleven regions and cannot be filled
      from the shelf**: the Ghana book is a field guide with no site accounts and Wheatley's
      Ghana chapter is a country essay. Ghana is the only guide of 67 with no Getting there
      line. A Ghanaian site guide is the thing that would fix it.
- [x] **Borneo** — DONE 2026-09-01. Six empty practical fields filled on `malaysia-borneo`
      and `indonesia-greater-sundas` from the new Helm edition, plus one species correction.
- [x] **Atlantic Islands** — DONE 2026-09-01. Corrected three birds the Azores named that
      have never occurred there, two wrong habitat descriptions, a muddled storm-petrel
      season, and a Canaries region carrying Madeira's text.
- [ ] **Brazil** — van Perlo filed 2026-08-31 (`brazil-vanperlo`). Species-level habitat only,
      no site accounts, so lower value; but the four Brazil guides have run on the
      continental Wheatley volume alone until now.
- [x] **Mongolia** — DONE 2026-09-01, guide 68, live on the hub. 13 regions, and the book
      delivered: 13 habitat, 12 when, 10 access. A **fourteenth region for the Mongol-Altai
      is a real gap**, deliberately unwritten because neither book has a site account for it
      and it would have to come from operator itineraries. Seven parks in `mn.json` are
      claimed by nothing as a result.
- [ ] **`mos.mn` is now an online casino.** The Mongolian Ornithological Society's address,
      printed three times in the 2019 Helm book. It is on no page and must never be added.
      Same family as the expired `wildandworthyco.com`.
- [ ] **Atlantic Islands** — Clarke, Orgill & Disley, Helm 2020, filed 2026-09-01
      (`atlantic-isles`). Covers the Canaries, Madeira, the Azores and Cape Verde in one
      volume. Those three guides have had **no book of their own at all** until now, and it
      carries per-island geography, climate and habitat including the laurisilva. Highest
      value of the recent arrivals for existing pages.

## Books Cat has queued to download

Each unlocks either a new page or practicals for guides sitting empty. Arrived so far:
Ghana, Borneo, Brazil.

Arrived 2026-09-01: Mongolia, Atlantic Islands, Indian Subcontinent, Kenya and Northern
Tanzania, Middle East, South East Asia.

**Probe every new book before planning work on it**, because whether it carries site
accounts decides whether it can drive a new page at all:
- `mongolia-helm` HAS site accounts, which is why Mongolia could be written.
- `india-sub`, `kenya-ntz`, `middle-east` and `se-asia` do NOT. They are species sources.
  Porter's Middle East names no site at all (Azraq, Eilat and Al Ain are all absent), and
  Robson names localities only inside distribution strings, as `NE Thailand (Khao Yai NP)`.
- So a **Middle East or Thailand page still needs a site guide** for habitat and access.
  Robson would give it a species list and its named parks; Porter would give species only.

Still wanted: Helm Argentina, East Africa, Northern/Southern India, Ecuador, Bangladesh,
Western Africa, Senegal and the Gambia, Japan, Greater Southern Africa, Middle East, East
Asia. Prefer editions within the last 10 years, most within 5.

## Waiting on Cat

- [ ] Five hero clips awaiting her verdict. The `hero-verdicts.json` in Downloads was
      checked 2026-09-01 and is a strict SUBSET of the repo's own copy, with no new entries
      and no changed verdicts, so there is nothing in it to incorporate.
- [ ] 14 People-Also-Ask searches for the FAQ blocks.
- [ ] The Falklands national-list figure is currently derived from our own `browse.json`
      rather than a published national list.
- [ ] The three translation questions in the handover.

## App, deliberately out of scope

Cat scoped this work to the trips build on 2026-08-31. Not being worked:

- [x] **Password reset no longer returns a 500.** Probed 2026-09-02 with a deliberately
      bad token: GoTrue answers **303** and redirects to
      `app.beakbrain.com/reset-password#error=access_denied&error_code=otp_expired`, which is
      a clean error fragment rather than raw JSON. The `/reset-password` route it lands on
      went live on the web the same day.
- [ ] **An expired reset link now says nothing, which is the small fault left behind.**
      `app/reset-password.tsx` carries no error handling on purpose (the deep-link handler
      owns the session), so a link that fails shows a spinner for 8 seconds and then bounces
      home. Reading `error_description` out of the fragment and saying it would close this.
      Worth a device test rather than a blind fix, because it touches password recovery.
      Note the redirect echo proves nothing about the allow-list: GoTrue echoes whatever
      `redirect_to` you hand it and substitutes the Site URL only at the callback.
- [ ] "Netherlands" wraps mid-word in the app UI.
