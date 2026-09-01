# Handover, 2026-09-01: operators, certifications, and a usage post-mortem

Everything below is committed on `country-guides-2026-08-20` (build) and
`trips/nation-guides-heroes-and-fixes` (site). **Nothing is pushed or deployed.**

---

## 1. Read this first: why this session was expensive

Roughly a million tokens went on the local-operator research, and it produced **13 usable
entries**. That is a bad ratio and I should have said so after the first batch instead of
launching four more.

**What I should have done:** Africa A came back with 3 of 13 operators clearing the bar. That
was the moment to stop, show Cat the ratio, and ask whether the remaining 54 countries were
worth ~800k tokens. I didn't. I treated "continue until all pages complete" as authority to
spend without checking back, and it was not.

**The other avoidable costs, in order of size:**

| Cost | What it was | Cheaper next time |
|---|---|---|
| Web-research agents | 5 × ~200–300k tokens | Pilot ONE country, show the yield, then decide |
| Re-verifying agent work | I re-ran checks agents had already run and reported | Only re-verify where the agent's own evidence is thin, or where it contradicts a note |
| Fleet-wide checks | `render-check` over 69 guides, ~15 times | Check only the guides touched; run the fleet once before committing |
| Photo sheets | ~40 images at 3–5k each | Batch more regions per sheet; only open alternates for a confirmed failure |
| The hourly Downloads cron | 13 firings, each a full turn | Make it every 3–4 hours, or fold it into whatever turn is already running |

**What was worth it:** the faults found in our own data (below). Those came from cheap
checks, not from the expensive research.

---

## 2. State of the guides

**68 country guides live**, 620 regions, all gates green: 0 blocking selfcheck findings on
every guide, `render-check` 69/69, `cross-names` clean, `stale-access` 0, no duplicate
region photographs, no captive birds, hub reconciles 68/68.

New today: **Ghana**, **Mongolia**. Completed today: Malawi, Zimbabwe, Mozambique, the
Azores, Madeira, the Canaries.

`./deploy.sh --dry-run` stages ~24,000 files against a **20,000 free-tier ceiling**, so
nothing can deploy. That is unchanged and blocks everything. See
`HANDOVER-2026-08-31-deploy-ceiling.md`.

---

## 3. What was found in our own data

These are the session's real product. Each was a check, not a research project.

- **`fairtrade.travel` is not Fair Trade Tourism.** It is a travel blog, and it was live on
  our certifications page as the place to read the standard. `fairtradetourism.org.za`
  redirects to a casino. Corrected; an exclusion that rested on the mistake is flagged for
  re-deciding.
- **Travelife has three stages and only Certified is an audit.** Four operator rows were
  already resting on Partner. Biosphere has the same shape: a self-declared Commitment
  alongside audited Certified.
- **Rainforest Alliance no longer certifies tourism**, per their own for-business page. One
  Galapagos row resting on it alone is flagged in place, not dropped.
- **A scheme could pass the certification test and be dropped by the next line.** 125
  certified Chilean properties were counted as booking-club listings. A guard now warns.
- **15 dead chip slugs across 8 guides** — real birds under names the taxonomy does not use.
  `selfcheck` now fails on them.
- **Five domains now serve something else**: four gambling redirects and one escort service,
  all of them a birding organisation's or a national park's former address.

---

## 4. Open decisions for Cat

1. **Is the operator research worth continuing?** 13 of 162 cleared. The 149 near-misses are
   recorded with reasons. My honest view: the marginal value is low until a certification
   register becomes queryable, and most are not.
2. **Website translations** — parked, surveyed, three questions unanswered.
   → `HANDOVER-2026-08-31-website-translations.md`
3. **49 of 68 guides still open on the generic site reel.** Commons has a usable video for
   385 of 9,516 species; it is a source ceiling. The cheap answer is a **still hero** from
   the region photographs every guide already has. Needs a template change and Cat's call.
4. **Mongolia has no Mongol-Altai region.** Seven parks are claimed by nothing. Neither book
   has a site account, so it would come from operator itineraries.
5. **Bolivia's region is titled "The Beni llanos and the Blue-throated Macaw"** and shows a
   Jabiru, because every photo of that macaw is captive. Cat said leave it.

---

## 5. Queued, not started

- **255 species carry an empty range** and are invisible to every guide. The 55 aliases are
  inert because `world.json` was never regenerated. Cross-repo, fleet-wide blast radius,
  needs someone who knows the pipeline.
- **Barnes 2024 (Greater Southern Africa)** is a modern cross-check for the eight guides
  still resting on the 2006 Birdfinder, whose OCR is poor.
- **30 of 68 guides carry no openable stop link.**
- **`section-audit.py`** has other stale patterns beyond the one fixed today.

---

## 6. Reference shelf

**Thirteen books filed in two days.** The rule that matters: **site accounts predict
usefulness, recency does not.** Mongolia's 2019 guide could drive a whole page; Porter's 2024
Middle East third edition cannot, because it names no site at all.

Registered with what each can answer: `ghana-helm`, `borneo-helm2`, `brazil-vanperlo`,
`mongolia-helm`, `atlantic-isles`, `india-sub`, `kenya-ntz`, `middle-east`, `se-asia`,
`west-africa`, `central-asia`, `gt-southern-africa`, `bhutan-ehim`, `melanesia`, `east-asia`.

An hourly Downloads cron is running in the old session and dies with it.
