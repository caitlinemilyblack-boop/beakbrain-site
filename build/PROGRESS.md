# Community directory build progress

Live tracker for the worldwide community.html build. This file is the source of truth for what's
actually done — treat any handover document as a snapshot at the time it was written, this file as
current. Update it immediately after every wave, before starting the next one, so a session that
dies mid-run never loses more than one wave's worth of state.

**Rule:** a country only moves to "Done" after `ingest.js` (non-dry) + `verify.js` + `generate.js` +
commit/push have ALL completed for it. A file merely landing in `data/incoming/` is not done.

## Done: Europe is complete (2026-08-06)

**51 countries and territories + International, 539 groups, all curl-verified.**

- International (29 groups) — commit 7d240a4
- Netherlands (35), South Africa (41), Germany/Austria/Switzerland/Liechtenstein/Luxembourg/Belgium
  (80) — commit 7d240a4
- United Kingdom (88, 72 regions incl. Channel Islands and Isle of Man as GB regions) — commit 27d2758
- France (32), Spain (29), Portugal (7), Andorra (2), Gibraltar (1) — Monaco dropped, no findable
  community of its own — commit edf6c49
- Nordics: Denmark (9), Norway (20), Sweden (27), Finland (32), Iceland (2), Faroe Islands (1) —
  Greenland dropped, no findable community, served by Denmark's DOF — commit fb3767c
- Central Europe/Baltics: Poland (11), Czechia (8), Slovakia (1), Hungary (1), Estonia (3), Latvia
  (1), Lithuania (2) — commit fb3767c
- Balkans/Greece/Turkey: Greece (5), Cyprus (2), Turkey (3), Bulgaria (5), Romania (3), Serbia (3),
  Croatia (2), Slovenia (3), Bosnia (2), Albania (3), North Macedonia (2), Montenegro (2), Kosovo (1)
  — commit fb3767c
- Ireland (8), Italy (16), Malta (2), San Marino (1) — commit fb3767c
- Russia (4), Ukraine (3), Belarus (2), Moldova (1), Georgia (2), Armenia (1), Azerbaijan (1) — commit
  (this session, follows fb3767c)

Also this session: **community.html header, hero and footer now match beakbrain.com's main page**
(commit edf6c49) — fixed transparent-over-video header that solidifies on scroll, same nav-right/btn
styling, and a footer video band (the community footer previously had no video at all).

## Site and deploy work, 2026-08-06 night

**GitHub Pages was silently failing to publish for ~12 hours.** beakbrain.com served a build from
07:52 UTC (commit 27d2758, the UK batch) while every Europe commit sat correctly on `main`, unpublished.
Worth knowing the diagnosis path, because the symptom looks exactly like "my commits didn't push":

- `git log origin/main..HEAD` was empty and `git ls-remote` confirmed GitHub had every commit, so the
  push side was never the problem.
- The repo is public, so the `pages build and deployment` runs are readable without auth:
  `curl -s "https://api.github.com/repos/caitlinemilyblack-boop/beakbrain-site/actions/runs?per_page=10"`.
  That showed the **"Build with Jekyll" step succeeding every time** and the separate **"Deploy to
  GitHub Pages" step failing**: two runs sat `in_progress` for exactly 10 minutes and timed out, and
  the last one never left `queued`.
- Cause was a **GitHub-wide major outage of Actions and Pages**, declared 15:22 UTC 2026-08-06
  (`curl -s https://www.githubstatus.com/api/v2/summary.json`). Nothing in this repo caused it.
  It recovered and published at 20:19 UTC.

**Check that Actions-runs endpoint before debugging repo content next time the site looks stale.**
A `.nojekyll` file was added mid-diagnosis on a wrong guess that Jekyll was breaking; it stays because
this is hand written HTML plus a node generator and the Jekyll pass earns nothing, but it was never
the fix. Commit ae8ba4b corrects that record.

Page changes shipped the same night:

- **Hero copy now aligns to the page grid on both `index.html` and `community.html`** (commit cad67b5).
  `.hero-inner` carries `.wrap` (max-width 1080, `margin: 0 auto`) but sits inside a flex container, so
  it shrank to its longest line of text and the auto margins centred that shrunken box. Hero copy sat
  at x=336 on home and x=300 on community while the wordmark, section headings and footer all sit at
  x=128. `width: 100%` on `.hero-inner` restores the grid; the 28px inline padding matches `.wrap`.
  **If you add another flex hero, it needs `width: 100%` or it will drift the same way.**
- Community hero picked up the home treatment: vertically centred rather than bottom cramped, 52vh,
  larger clamped h1 with matching letter spacing, 46ch measure on the lede in place of a flat 680px.
- **The `Home` nav link is gone from the community header** (commit d775d60); the BeakBrain wordmark
  already links to `/`. The footer keeps its `Home` link, mirroring index.html's footer nav.
- Home page gained two lazy loaded video bands replacing photo breaks (commit a6e6900), poster first
  and the mp4 only fetched once the band is within 200px of the viewport.

### What went wrong and got fixed along the way (read before the next continent)

Countries that turn out to have zero findable community of their own (Monaco, Greenland) get an empty
`groups` array and a `gaps` note rather than being forced to have an entry; `generate.js` now drops
any country left with zero groups after de-dup, so this never produces a broken empty button/section.

Two things kept recurring across batches and are now fixed **permanently in `build/BRIEF.md`** so
future agents don't repeat them:
- **eBird "rare bird alert" links** (`ebird.org/alert/summary?sid=...`) redirect into an
  unauthenticated login loop and never show public content. Hit in 3 separate batches before being
  banned in the brief. Use `ebird.org/region/XX` instead if an eBird link is warranted.
- **Unverifiable / miscited links.** One Haiku batch (Balkans/Turkey) cited a LinkedIn *personal
  profile* as "Kosovo Ornithological Society" for an entity that couldn't be independently
  corroborated as real, and miscited a birdtours.co.uk trip report as Serbia's own org site. The
  Russia/Caucasus batch separately invented two duplicate entries ("Birdwatching Moscow", "Birding
  Armenia") that just re-pointed to Facebook pages already listed under other groups' own names, and
  included one commercial tour agency ("Birding Caucasus") disguised as a community. BRIEF.md now has
  an explicit rule against citing personal profiles or unverifiable entities, and every batch's launch
  prompt should ask the agent to independently corroborate anything that isn't an obvious national
  body. **Manually spot check the actual URL list of any Haiku batch before merging** — none of these
  four issues were catchable by the automated schema/duplicate-URL checks, since the display names or
  URLs differed just enough to slip through.

**Haiku vs Sonnet:** token cost is noticeably lower on Haiku (70 to 83k tokens per agent vs UK's 203k
on Sonnet). 3 of 5 Haiku batches (Nordics, Central Europe/Baltics, Ireland/Italy) needed only routine
link fixes. 2 of 5 (Balkans/Turkey, Russia/Caucasus) produced fabricated or miscited entries as above.
Conclusion: keep using Haiku for cost, but always do the manual URL spot check above before merging,
regardless of how clean the automated verify pass looks.

## In progress: North America, wave 1 (launched 2026-08-06 night)

Four Haiku research agents, one per batch. **Nothing below is done until it has been through the full
ingest/verify/manual-spot-check/generate/commit sequence.** Status is updated in place as each lands.

| Batch | Countries | Output file | Status |
|---|---|---|---|
| na-usa | USA, all 50 states + DC | `data/incoming/na-usa.json` | launched |
| na-canada | Canada, all provinces + territories | `data/incoming/na-canada.json` | launched |
| na-mexico-central | MX, GT, BZ, HN, SV, NI, CR, PA | `data/incoming/na-mexico-central.json` | launched |
| na-caribbean | CU, JM, DO, HT, PR, TT, BS, BB, + smaller islands | `data/incoming/na-caribbean.json` | launched |

**One agent must own the whole USA.** `ingest.js` merges by country code and *replaces* any existing
entry with the same code (see its "merge (replace any existing country with the same code)" step), so
two incoming files that both contain a `US` object silently clobber each other rather than combining.
Same applies to Canada. Split big countries across agents only if you also merge the regions by hand
before ingest.

`20-north-america.json` already holds a Greenland entry with zero groups, from the Nordics batch that
correctly found no community of its own. `generate.js` drops zero group countries, so it is harmless;
leave it as the honest record.

## Queued (not started)

- South America: Brazil, Argentina, Colombia, Peru, Ecuador, Chile, Venezuela, Bolivia, Paraguay,
  Uruguay, Guyana, Suriname, French Guiana (check for duplicates against France's overseas territories
  first, in case the France batch already picked one up)
- Africa: South Africa done; Kenya, Tanzania, Uganda, Ethiopia, Ghana, Nigeria, Namibia, Botswana,
  Zambia, Zimbabwe, Morocco, Egypt, and the rest
- Asia: India, Japan, Sri Lanka, Thailand, Philippines, Indonesia, Malaysia, Singapore, China, Taiwan,
  South Korea, Israel, Middle East states
- Oceania: Australia (by state), New Zealand, Papua New Guinea, Fiji, smaller Pacific nations

## Wave discipline

3 to 4 research agents per wave, not more. 6 to 8 at once burned through a full session's quota
within an hour on 2026-08-05/06 even when every agent behaved correctly, because WebSearch/WebFetch
calls are expensive per agent. See `~/.claude/commands/birding-community.md`'s "Delegating research
to subagents" section and `build/BRIEF.md` for the full mechanics (both tightened 2026-08-06 to cut
searches/curls per agent and to ban the eBird-alert and unverifiable-entity patterns above).

**Model:** use `model: "haiku"` for research agents (see the Haiku vs Sonnet note above for why, and
for the mandatory manual spot check that goes with it). Fall back to Sonnet for a batch if Haiku's
output shows weak judgment beyond what the spot check and normal ingest/verify pass catch.
