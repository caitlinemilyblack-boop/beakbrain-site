# Community directory build progress

Live tracker for the worldwide community.html build. This file is the source of truth for what's
actually done, superseding the stale snapshot in `HANDOVER-2026-08-06-community-pipeline-worldwide-build.md`
(in the app repo) as of the timestamps below. Update it immediately after every wave, before starting
the next one, so a session that dies mid-run never loses more than one wave's worth of state.

**Rule:** a country only moves to "Done" after `ingest.js` (non-dry) + `verify.js` + `generate.js` +
commit/push have ALL completed for it. A file merely landing in `data/incoming/` is not done, it's
"ingested pending" until pushed.

## Done (merged, verified, generated, committed and pushed)
- International (29 groups) — commit 7d240a4
- Netherlands (35 groups, all 12 provinces) — commit 7d240a4
- South Africa (41 groups, all 9 provinces) — commit 7d240a4
- Germany, Austria, Switzerland, Liechtenstein, Luxembourg, Belgium (80 groups) — commit 7d240a4
- United Kingdom (88 groups, 72 regions incl. Channel Islands and Isle of Man as GB regions) —
  research by Sonnet agent, 2 URL fixes during ingest (http to https, and a meta-refresh landing page
  swapped for its real target), BirdGuides/BBRC kept despite curl 403 (Cloudflare "Just a moment"
  bot challenge on two unambiguous, well known live UK institutions, same class of false positive as
  the Facebook family) — commit 27d2758.
- France (32), Spain (29), Portugal (7), Andorra (2), Gibraltar (1) — research by Sonnet agent (this
  one survived the 2026-08-06 session-limit wall that killed the other 3 wave 1 agents, since it had
  already written its file before the wall hit). Monaco was researched but found to have zero
  findable birding community of its own (only France's cross-border LPO PACA/Faune PACA serve it);
  dropped from output rather than publish an empty country page, gap note preserved in git history.
  5 URL fixes during ingest (4 http to https, one Facebook swap for a group whose https connection
  hung on TLS). `generate.js` now drops any country left with zero groups after de-dup, so this can't
  silently produce a broken empty section again. Commit pending, see below.

Also this session: **community.html header, hero and footer now match beakbrain.com's main page** —
fixed transparent-over-video header that solidifies on scroll, same nav-right/btn styling, footer
video band replacing the old solid-color footer (it had no video at all before). Changes in
`build/template.html` and `build/generate.js`; regenerated `community.html` reflects both this and
the France/Iberia merge. Commit pending, see below.

Total live after UK + France/Iberia merge: 344 groups across 14 countries + International.

## In progress

### Europe wave 1 — launched 2026-08-06, 4 agents in background
| Batch | Countries | Output file | Status |
|---|---|---|---|
| UK | United Kingdom (GB) | `data/incoming/eu-uk.json` | done — commit 27d2758 |
| France/Iberia | France, Spain, Portugal, Andorra, Gibraltar, Monaco (FR, ES, PT, AD, GI, MC) | `data/incoming/eu-france-iberia.json` | done, merged and generated, commit pending |
| Nordics | Denmark, Norway, Sweden, Finland, Iceland, Faroe Islands (DK, NO, SE, FI, IS, FO) + Greenland (GL, continent North America) | `data/incoming/eu-nordics.json` | relaunched on Haiku after session-limit failure |
| Ireland/Italy | Ireland, Italy, Malta, San Marino (IE, IT, MT, SM) | `data/incoming/eu-ireland-italy.json` | relaunched on Haiku after session-limit failure |

### Europe wave 2 (partial, started same session once quota reset) — launched 2026-08-06, Haiku
| Batch | Countries | Output file | Status |
|---|---|---|---|
| Central Europe/Baltics | Poland, Czechia, Slovakia, Hungary, Estonia, Latvia, Lithuania (PL, CZ, SK, HU, EE, LV, LT) | `data/incoming/eu-central-baltics.json` | launched |
| Balkans/Greece/Turkey | Greece, Cyprus, Turkey, Bulgaria, Romania, Serbia, Croatia, Slovenia, Bosnia, Albania, North Macedonia, Montenegro, Kosovo (GR, CY, TR, BG, RO, RS, HR, SI, BA, AL, MK, ME, XK) | `data/incoming/eu-balkans-turkey.json` | launched |

Still queued from the original wave 2 plan: Russia, Ukraine, Belarus, Moldova, Georgia, Armenia,
Azerbaijan — launch once one of the four above lands, to keep the in-flight count at 3 to 4.

**If this session dies before this table is updated to "ingested":** check
`build/data/incoming/*.json` for anything actually written before assuming any of these four batches
made progress. An agent that dies mid-run leaves nothing (no partial JSON was ever observed in the
prior session's failures). Anything not present in `incoming/` must be relaunched from scratch,
regardless of what this table says was "launched".

## Queued (not started)

### Europe wave 2
- Central Europe/Baltics: Poland, Czechia, Slovakia, Hungary, Estonia, Latvia, Lithuania
- Balkans/Greece/Turkey: Greece, Cyprus, Turkey, Bulgaria, Romania, Serbia, Croatia, Slovenia, Bosnia,
  Albania, North Macedonia, Montenegro, Kosovo
- Russia, Ukraine, Belarus, Moldova, Georgia, Armenia, Azerbaijan (continent Europe by this project's
  convention; expect thin/honest coverage, some Russian NGO sites may be geoblocked since 2022)

### Rest of world (unstarted)
- North America + Central America + Caribbean: USA (by state), Canada (by province), Mexico, Central
  America (Guatemala, Belize, Honduras, El Salvador, Nicaragua, Costa Rica, Panama), Caribbean islands
- South America: Brazil, Argentina, Colombia, Peru, Ecuador, Chile, Venezuela, Bolivia, Paraguay,
  Uruguay, Guyana, Suriname, French Guiana (check for duplicates if France's overseas territories got
  picked up under the France batch)
- Africa: South Africa done; Kenya, Tanzania, Uganda, Ethiopia, Ghana, Nigeria, Namibia, Botswana,
  Zambia, Zimbabwe, Morocco, Egypt, and the rest
- Asia: India, Japan, Sri Lanka, Thailand, Philippines, Indonesia, Malaysia, Singapore, China, Taiwan,
  South Korea, Israel, Middle East states
- Oceania: Australia (by state), New Zealand, Papua New Guinea, Fiji, smaller Pacific nations

## Wave discipline (why waves are sized the way they are)

3 to 4 research agents per wave, not more. 6 to 8 at once burned through a full session's quota
within an hour on 2026-08-05/06 even when every agent behaved correctly, because WebSearch/WebFetch
calls are expensive per agent. See `~/.claude/commands/birding-community.md`'s "Delegating research
to subagents" section and `build/BRIEF.md` (tightened 2026-08-06 to cut searches/curls per agent) for
the full mechanics.

**Model:** wave 1 (UK, France/Iberia, Nordics, Ireland/Italy) was launched on `model: "sonnet"`.
From wave 2 onward, use `model: "haiku"` — with BRIEF.md now this procedural, it's a follow-the-recipe
task Haiku should handle fine, and it eases quota pressure further. Fall back to Sonnet for a batch if
Haiku's output shows weak judgment (sloppy blurbs, missed parked domains, wrong region grouping).
