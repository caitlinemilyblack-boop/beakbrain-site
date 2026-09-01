# BeakBrain site — open work

Started 2026-08-31. Numbers here were measured, not estimated; each says how. Update it as
things move rather than writing a fresh handover for each one.

---

## Blocking everything

- [ ] **Lift the 20,000-file deploy ceiling.** `./deploy.sh --dry-run` stages **23,927
      files**, so the site is **3,927 over**, and `birds/` alone is 21,672. Nothing can
      deploy today, which is why `beakbrain.com/` is served by the `beakbrain-home-patch`
      Worker. Zone plan (~$20/mo) or migrate Pages to Workers static assets.
      **CORRECTED 2026-09-01: I twice reported 29,069 files and 9,069 over.** That was a raw
      `find` over the working tree, which counts source and build files deploy.sh never
      stages. Use the dry run, not a find. The script also reports the paid ceiling as
      **100,000 files**, not unlimited, which is the number any multi-language plan has to
      fit inside.
      → `HANDOVER-2026-08-31-deploy-ceiling.md`, `project_beakbrain_file_budget`
- [ ] **Delete the home-patch Worker** the day a real deploy goes out, then confirm the
      homepage's App Store link is coming from Pages. → `~/Developer/beakbrain-home-patch/REMOVING.md`
- [ ] The homepage is the only page carrying the App Store link change. Every other page
      keeps the `/#get` anchor until the ceiling is lifted. The anchor still works.

## Parked, with the ground surveyed

- [ ] **Website translations** (fr, es, pt, de, nl, it, and possibly the Nordics).
      Parked 2026-08-31 at Cat's request. The survey is done and three questions need her
      answer before Phase 1. → `HANDOVER-2026-08-31-website-translations.md`

## Country guides — 67 live, all checks green

Measured 2026-09-01: 0 blocking selfcheck findings on every guide, render-check 68/68,
cross-names clean across 67, stale-access 0, region-photo-dupes 0 across 607 photos, hub
reconciles 67 of 67. `./deploy.sh --dry-run` stages 23,945.

- [ ] **49 of 67 guides open on the generic site reel**, which shows a Blue-and-yellow
      Tanager, a European Goldfinch and a Eurasian Hoopoe: none of them a bird of the country
      being read about. **18 heroes are live** as of 2026-09-01, up from 14.
      → `build/travel/HERO-CLIP-AUDIT.md`, `project_beakbrain_hero_provenance_gate`
- [x] Panama wired, and the four guides that had chosen a clip and never produced the file
      (australia, brazil-cerrado-caatinga, brazil-pantanal, china) now have one.
- [x] The provenance cache is refreshed from the repaired gate, so the picker no longer
      proposes the 18 wrong-country clips. It now reports **26 guides as owing a fresh
      candidate search**, which is the honest state.
- [ ] **Those 26 need new candidates.** Nothing on the current sheet was accepted for them.
      This is a fresh Commons search, not more filtering of what is already there.
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
- [ ] **30 of 66 guides have no stop carrying an openable link.** Several are honest (almost
      no Mozambican site has a web page; `dnpw.gov.mw` does not resolve), but 30 is too many
      to be all honest. A dead link is worse than no link, so anything added must be checked.
      → `project_beakbrain_link_evidence`
- [ ] **255 species carry an empty range** and are invisible to every guide: on no card wall,
      and refused by the check that stops a region naming a species. 54 genus-rename aliases
      are committed to `pipeline/synonym_map.json` and **the species pipeline has never been
      re-run to activate them**. Angola Lark is one example, kept off its own country's page.
      → `build/travel/range-aliases.js`, `project_beakbrain_species_ranges`
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
- [ ] **Mongolia** — Sundev & Leahy, Helm 2019, filed 2026-09-01 (`mongolia-helm`). A new
      country page. This one has real SITE ACCOUNTS, not just species text: "Hustai National
      Park (50,600ha). Driving west on the main...", the Onon and Khurkh rivers. So it can
      support habitat AND access, which most field guides cannot.
- [ ] **Atlantic Islands** — Clarke, Orgill & Disley, Helm 2020, filed 2026-09-01
      (`atlantic-isles`). Covers the Canaries, Madeira, the Azores and Cape Verde in one
      volume. Those three guides have had **no book of their own at all** until now, and it
      carries per-island geography, climate and habitat including the laurisilva. Highest
      value of the recent arrivals for existing pages.

## Books Cat has queued to download

Each unlocks either a new page or practicals for guides sitting empty. Arrived so far:
Ghana, Borneo, Brazil.

Arrived 2026-09-01: Mongolia, Atlantic Islands.

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

- [ ] Password reset returns a 500 and shows the raw Supabase JSON to the user.
- [ ] "Netherlands" wraps mid-word in the app UI.
