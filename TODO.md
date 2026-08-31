# BeakBrain site — open work

Started 2026-08-31. Numbers here were measured, not estimated; each says how. Update it as
things move rather than writing a fresh handover for each one.

---

## Blocking everything

- [ ] **Lift the 20,000-file deploy ceiling.** The tree is **29,069 files**, 9,069 over,
      and `birds/` alone is 21,672. Nothing on the site can deploy at all today, which is
      why `beakbrain.com/` is served by the `beakbrain-home-patch` Worker. Zone plan
      (~$20/mo) or migrate Pages to Workers static assets. Workers Paid does NOT lift it.
      → `HANDOVER-2026-08-31-deploy-ceiling.md`, `project_beakbrain_file_budget`
- [ ] **Delete the home-patch Worker** the day a real deploy goes out, then confirm the
      homepage's App Store link is coming from Pages. → `~/Developer/beakbrain-home-patch/REMOVING.md`
- [ ] The homepage is the only page carrying the App Store link change. Every other page
      keeps the `/#get` anchor until the ceiling is lifted. The anchor still works.

## Parked, with the ground surveyed

- [ ] **Website translations** (fr, es, pt, de, nl, it, and possibly the Nordics).
      Parked 2026-08-31 at Cat's request. The survey is done and three questions need her
      answer before Phase 1. → `HANDOVER-2026-08-31-website-translations.md`

## Country guides — 66 live, all checks green

Measured 2026-08-31: 0 blocking selfcheck findings on every guide, render-check clean,
cross-names clean, stale-access 0, region-photo-dupes 0 across 596 photos, hub reconciles.

- [ ] **49 of 66 guides have NO hero clip** and open on the generic site reel, which shows
      a Blue-and-yellow Tanager, a European Goldfinch and a Eurasian Hoopoe: none of them a
      bird of the country being read about. Every candidate for the recent batch failed the
      provenance gate as `no_evidence` or `other_country`. This needs a new clip source
      rather than more searching of the existing library.
      → `build/travel/HERO-CLIP-AUDIT.md`, `project_beakbrain_hero_provenance_gate`
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

- [ ] **Ghana** — book filed and registered 2026-08-31 (`ghana-helm`, Borrow/Demey/Owusu,
      Helm 2nd ed). No "Where to see" lines, but a full IBA list with GH0xx codes and a
      habitat introduction, which is enough to drive the regions. *In progress.*
- [ ] **Borneo** — a later Helm edition (`borneo-helm2`) filed 2026-08-31, verified to carry
      "Where to see" lines, so it can fill practicals on `malaysia-borneo` and
      `indonesia-greater-sundas` through `book-species-sites.py`. *In progress.*
- [ ] **Brazil** — van Perlo filed 2026-08-31 (`brazil-vanperlo`). Species-level habitat only,
      no site accounts, so lower value; but the four Brazil guides have run on the
      continental Wheatley volume alone until now.

## Books Cat has queued to download

Each unlocks either a new page or practicals for guides sitting empty. Arrived so far:
Ghana, Borneo, Brazil.

Still wanted: Helm Argentina, East Africa, Northern/Southern India, Ecuador, Bangladesh,
Western Africa, Senegal and the Gambia, Japan, Greater Southern Africa, Middle East, East
Asia, Atlantic Islands. Prefer editions within the last 10 years, most within 5.

## Waiting on Cat

- [ ] Five hero clips awaiting her verdict, plus `hero-verdicts.json` sitting in Downloads
      from 2026-08-29 that may already answer some of them.
- [ ] 14 People-Also-Ask searches for the FAQ blocks.
- [ ] The Falklands national-list figure is currently derived from our own `browse.json`
      rather than a published national list.
- [ ] The three translation questions in the handover.

## App, deliberately out of scope

Cat scoped this work to the trips build on 2026-08-31. Not being worked:

- [ ] Password reset returns a 500 and shows the raw Supabase JSON to the user.
- [ ] "Netherlands" wraps mid-word in the app UI.
