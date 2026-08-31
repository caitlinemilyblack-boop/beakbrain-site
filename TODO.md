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
      bird of the country being read about.
      → `build/travel/HERO-CLIP-AUDIT.md`, `project_beakbrain_hero_provenance_gate`
- [ ] **TEN of them can be filled from clips already reviewed and now verified**, and the
      work was written up and started before the session limit stopped it: brazil-amazon,
      brazil-atlantic-forest, the four India guides, the three Indonesia guides, panama.
      That takes 49 down to 39.
- [ ] **EIGHTEEN clips marked "use" in `_hero-verdicts.json` are filmed in the wrong country
      and must never ship.** One Panama clip is approved as the hero for six separate South
      and Central American guides, a Slovakian bird-feeder clip for both France and Norway,
      plus three Thailand, two Poland, and one each of Brazil, Japan and Hungary. The gate
      now catches them (2026-09-01); it previously knew only 28 countries and never read the
      filename, so it caught almost none. **A "use" verdict is not authority to ship.**
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
