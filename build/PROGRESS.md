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

## Queued (not started)

- North America + Central America + Caribbean: USA (by state), Canada (by province), Mexico, Central
  America (Guatemala, Belize, Honduras, El Salvador, Nicaragua, Costa Rica, Panama), Caribbean islands
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
