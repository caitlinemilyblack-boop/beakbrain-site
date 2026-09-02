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

## Parked, with the ground surveyed

- [ ] **Website translations** (fr, es, pt, de, nl, it, and possibly the Nordics).
      Parked 2026-08-31 at Cat's request. The survey is done and three questions need her
      answer before Phase 1. → `HANDOVER-2026-08-31-website-translations.md`

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
- [ ] **TWO CHECKS STILL ENFORCE THE RETIRED RULE and their output is noise.** Found
      2026-09-02, and worth fixing because it will scare the next reader exactly as it
      scared this one:
      - `check-hero-provenance.py` ends with **"21 clip(s) must not ship"**, calling Italy's
        clip contradicted for being filmed in South Africa, Mongolia's in Japan, Spain's in
        France. Under the current rule every one of those is fine.
      - `selfcheck.js` emits **44 `hero-clip` warnings** reading "does not record where it
        was filmed", which is now a thing nobody gates on.

      Recalibrate both to the captive rule, or retire the provenance gate and keep it only
      as a record. → `project_beakbrain_check_calibration`
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
- [ ] **29 of 68 guides have no stop carrying an openable link** (re-measured 2026-09-02). Several are honest (almost
      no Mozambican site has a web page; `dnpw.gov.mw` does not resolve), but 30 is too many
      to be all honest. A dead link is worse than no link, so anything added must be checked.
      → `project_beakbrain_link_evidence`
- [ ] **Fleet warning census, 2026-09-02.** Nothing here is blocking; this is where the
      remaining guide work actually is, largest first:

      | count | check | what it means |
      |---:|---|---|
      | 289 | `area-scatter` | a region spread wide reads like a bad geocode |
      | 179 | `country-leak` | text reaching outside the guide's own country |
      | 111 | `region-coherence` | fields in a region disagreeing with each other |
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

      `voice-copy`, `voice`, `voice-caps`, `jargon` and `sentences` total **67** and are the
      cheapest to clear, because they are prose rather than data and the rules are written
      down in `ai-writing-signs`.
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
