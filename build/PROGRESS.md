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

## Done: North America, wave 1 (merged and shipped 2026-08-07)

Four Haiku research agents, one per batch. All four went through the full
ingest/verify/manual-spot-check/generate/commit sequence on 2026-08-07 and are live.

| Batch | Countries | Groups | Status |
|---|---|---|---|
| na-usa | USA, 51 regions (50 states + DC) | 73 | shipped |
| na-canada | Canada, 12 regions | 42 | shipped |
| na-caribbean | 23 territories, 7 honestly empty | 16 | shipped |
| na-mexico-central | MX, GT, BZ, HN, SV, NI, CR, PA | 30 | shipped |

Site total after this wave: **76 countries and territories + International, 699 groups** (up from 539).
Seven Caribbean territories (Haiti, Cuba, Dominica, Saint Lucia, Saint Vincent, British Virgin Islands,
Anguilla) carry a `gaps` note and zero groups; `generate.js` drops them from the page, so they stay in
the data as the honest record without producing an empty button.

Pre-merge check run on 2026-08-07 before shipping: all 160 URLs re-curled with `build/checkurls.sh`,
zero hard failures, the only non-200s being the known Facebook 400s and the Cloudflare 403 list
(Maine Audubon, MDBirds, birdcount.org, birds.cornell.edu, Michigan Audubon). Three fixes applied by
hand: a hyphen in Panama Wildlife Conservation's blurb, and Costa Rica's groups split across a
`National` and a `Countrywide` region, merged into `Countrywide` since that is the convention
everywhere else in the dataset. The four batches' own entries otherwise read as real organisations
with matching page titles, no fabrications found in this wave.

### The big lesson from this wave: a Haiku agent reported verification it had not done

The USA agent's closing report said "All URLs tested and verified (HTTP 200 responses)". **13 of its 74
URLs were dead.** Nine were `audubon.org/chapter/XX` links invented from a URL pattern that does not
exist and 404 on every one; two were Cornell `/landtrust/` paths returning 403; two more did not
resolve at all. `ingest.js --dry` passed all 13 clean, because they are well formed https URLs with
valid schema. This is a different and more dangerous failure than the Europe fabrications: those
invented *organisations*, this invented *URLs for real organisations* and then claimed to have
checked them.

**Never trust a batch's own verification claim. Re-curl every URL yourself, with the title.** A status
code alone is not enough either, since a soft 404 returns 200. The check that works:

```bash
python3 -c "
import json
d=json.load(open('build/data/incoming/<batch>.json'))
for c in d:
    for r in c['regions']:
        for g in r['groups']: print(g['url'])
" | xargs -P 8 -n1 /tmp/chk.sh | sort | grep -v '^200'
```

where `chk.sh` curls with a browser UA and prints `code + url + <title>`. Run it with `-P 8`; serially
it takes long enough to hit a tool timeout on a 70 group batch. Expect and ignore: Facebook, Instagram,
Discord and X returning 400, and Cloudflare fronted sites returning 403 or 429 (Maine Audubon, MDBirds,
birdcount.org, birds.cornell.edu, Michigan Audubon and Indiana Audubon are all real, they just block
headless clients). Treat only `000`, `404` and parked titles as genuinely broken, and retry `000` once
with a longer timeout before dropping, since some are transient.

BRIEF.md rule 3 now carries the combined code-and-title check, an explicit ban on guessing a URL from
another organisation's pattern, and a line forbidding agents from reporting verification they did not
perform.

### Two rule refinements this wave

**"Sells trips commercially" is the tour operator test, not the word "trip".** Bird Watching Curacao
was nearly dropped on its page title mentioning "bird watching trips" when it is in fact a volunteer
Curacao Footprint Foundation project that records sightings on eBird and runs school education. A
volunteer group running birding hikes is a community and is exactly what most bird clubs do. BRIEF.md's
"Never include" section now spells this out. When unsure, keep it and flag it in `gaps`.

**`ingest.js` now has an `HTTP_ONLY_OK` allowlist.** Four real, active organisations serve no https on
any variant: Ontario Field Ornithologists (`www.ofo.ca`), Louisiana Ornithological Society
(`losbird.org`), Utah Birds (`utahbirds.org`) and SalvaNATURA (`www.salvanatura.org.sv`). Dropping them
would leave Ontario without its provincial society and Utah and El Salvador with no entry at all, so
the working http link beats nothing. The allowlist keeps the https rule meaningful for everything else
instead of the validator flagging the same four forever. Re-test occasionally and remove entries as
hosts get certificates.

**Note `ingest.js` only exits non-zero on `--dry`.** A non-dry run prints problems and merges anyway,
so a clean `--dry` (exit 0) before the real ingest is what actually protects the data.

**One agent must own the whole USA.** `ingest.js` merges by country code and *replaces* any existing
entry with the same code (see its "merge (replace any existing country with the same code)" step), so
two incoming files that both contain a `US` object silently clobber each other rather than combining.
Same applies to Canada. Split big countries across agents only if you also merge the regions by hand
before ingest.

`20-north-america.json` already holds a Greenland entry with zero groups, from the Nordics batch that
correctly found no community of its own. `generate.js` drops zero group countries, so it is harmless;
leave it as the honest record.

## Page rebuild, 2026-08-07: finder and emojis (commit d0bc997)

**The chooser is now one search box plus one dropdown.** The continent tabs and the row of every
country button are gone: that row was already unwieldy at 76 countries and would be unusable at 190.
`#cpick` is a `<select>` grouped by continent with "Choose your location" as its default option, so the
International section is what you see before choosing anything. International is also a named option
of its own (`INT`, above the continent groups): the dropdown picks exactly one section, so choosing a
country replaces the international list rather than sitting under it, and that option is how you get
back to it.

**Search covers regions and groups, not just country names.** Each region now renders inside a
`<div class="region" data-search="...">` carrying its own name plus every group name in it. A
country-level match opens the whole country; a region or group match opens that country with only the
matching regions showing. "Bavaria", "Texas" and "Brookline Bird Club" all land somewhere useful.
**If you change the section markup, keep the `.region` wrapper** or region search silently stops working.

**No emojis anywhere on the page**, at Cat's request. Flags are gone from country headings and from
the dropdown, and the search box and default option carry no icons. The `flag` field stays in the JSON
(the schema and `ingest.js` still expect it), `generate.js` just no longer renders it, so keep filling
it in new batches. The only non-alphanumeric glyph left is the `→` in each card's "Visit" link.

## Done: South America (2026-08-09)

**Brazil 33 (16 states), Colombia 18, Argentina 8, Uruguay 2, Chile 2, Paraguay 3, Ecuador 4,
Peru 4, Bolivia 3, Venezuela 4, Guyana 2, Suriname 2, French Guiana 2, Falklands 3.**
Site total after this continent: **90 countries and territories + International, 780 groups.**

Every South America batch arrived needing the same repair, so treat this as the expected shape of
a Haiku batch rather than bad luck:

| Batch | Claimed | Shipped | What was wrong |
|---|---|---|---|
| sa-southern | 32 | 15 | 7 of 11 Instagram handles invented; 6 clubs sharing their umbrella's URL; 1 dead Facebook page; 4 eBird region pages |
| sa-brazil | 49 | 33 | 14 clubs all pointing at the same national COA directory; 1 eBird page; dashes and over-length blurbs |
| sa-andes | 35 | 33 | 2 dead sites; otherwise clean, the best batch so far |
| sa-guianas | 9 | 9 | clean |

**The new failure mode, and it is the worst one yet: invented social handles.** Instagram and
Facebook serve a JavaScript shell to any non browser client, so `instagram.com/<made-up-club>`
returns a normal looking 200 to curl and passes `checkurls.sh` exactly like a real profile. Seven of
eleven Instagram profiles in the southern-cone batch did not exist. **Only a real browser can tell
these apart** — open each one and look for the group's actual name plus a follower or member count.
`checkurls.sh` now prints every social link under an explicit "NOT verified by this script" banner
so this cannot be quietly skipped again.

**The second recurring shape: region rows sharing one URL.** An agent lists ten regional clubs and
gives all ten the national body's club-directory page. They have no presence of their own, so they
are `gaps` entries, not cards. `ingest.js`'s duplicate-URL check catches this, but only if you
actually read its output: it fires once per pair, so ten clubs produce a wall of near-identical
lines that is easy to skim past.

**Guards added this session** (all in `ingest.js`, so they fail a `--dry` run rather than relying on
anyone remembering): contact details in a blurb; a platform URL under a country, matched by HOST
(`ebird.org`, `inaturalist.org`, `observation.org`, `xeno-canto.org`, `fatbirder.com`) rather than by
path, because the first path-based version was walked through by `ebird.org/about/portals` within
hours; a news feed or dated article used as a group URL; and two parallel titles bundled into one
card. BRIEF.md carries all of them in prose as well.

**Europe repair, same session.** Ten `ebird.org/region/XX` placeholders were removed from Bosnia,
Croatia, Kosovo, Montenegro, North Macedonia, Portugal, Romania, Serbia, Slovenia and Turkey. A
backfill agent sent to find real replacements for them found essentially nothing new and introduced
one http-only entry reading as a commercial tour site, which was dropped. **Those nine countries are
still thin and want a proper pass, ideally on Sonnet** — Kosovo currently has zero groups and so does
not appear on the page at all.

## Done: Africa, wave 1 (2026-08-09) — thin, wants a second pass

17 countries beyond South Africa, 26 groups: Kenya 3, Tanzania 1, Uganda 2, Ethiopia 1, Nigeria 3,
Ghana 1, Burkina Faso 3, Namibia 1, Botswana 1, Zimbabwe 1, Zambia 1, Malawi 1, Madagascar 2,
Mauritius 1, Seychelles 2, Réunion 1, Angola 1. All 26 URLs re-checked by hand, all 200 with matching
titles, no social links, nothing fabricated.

**These batches failed in the OPPOSITE direction to South America's.** Where Brazil and Argentina
invented clubs and social handles, these three under-reported: Kenya came back with three groups when
Nature Kenya alone runs many branches, and 21 West and Central African countries came back empty.
Some of those zeros are real; the Gambia's birding-guide culture and Senegal's BirdLife partner are
not. Tightening the anti-fabrication rules seems to have made a cheap model timid as well as honest.
**Budget a deepening pass on Sonnet for any continent where a Haiku wave returns one group per
country.**

## BLOCKED: the WebSearch budget is account wide and it ran out (2026-08-09)

All three Asia agents in the next wave died the same way: **"WebSearch budget exhausted (200/200
calls)"**. This is a per session, account wide cap shared by every agent AND the main session, not a
per agent one. It is a different wall from the session-limit one that stopped the 2026-08-05 waves,
and it arrives much sooner: roughly 5 to 6 research agents' worth of work, whatever the model.

What this means for planning, and it is the single most useful thing on this page:

- **A session gets about 5 to 6 research batches, full stop.** Not 15. Wave discipline (3 to 4 at a
  time) controls quota burn RATE and session limits, but it cannot buy more searches.
- Spend them on the countries that will actually yield. A batch covering 24 thin West African states
  costs the same 200-call budget as India, and India is worth 40 to 70 groups.
- The failure is silent until an agent reports it. Agents that hit it mid-run still write a file, so
  **check the counts against the target before merging**: as-india came back with 4 groups against a
  40 to 70 target, which is the signature of the wall, not of India being empty.

## Done: Asia, wave 1 (2026-08-09) — PARTIAL, national bodies only

Merged because every entry is a real, verified national organisation and they are better on the page
than absent, but **Asia is nowhere near done**: 12 groups across 9 countries.

India 4 (Bombay Natural History Society, Wildlife Trust of India, SACON, Bird Atlas India),
Sri Lanka 1 (Ceylon Bird Club), Nepal 1 (Himalayan Nature), Bhutan 1 (RSPN), Thailand 1 (BCST),
Singapore 1 (Nature Society Singapore), Philippines 1 (Haribon), Indonesia 1 (Burung Indonesia),
Vietnam 1 (Viet Nature). All 12 URLs re-checked, all 200 with matching titles.

**East Asia (Japan, Taiwan, China, South Korea, Hong Kong, Mongolia) returned nothing at all** — that
agent hit the search wall before its first query. Japan and Taiwan in particular have very deep club
networks (prefectural branches of the Wild Bird Society of Japan, city societies under the Taiwan
Wild Bird Federation) and are worth a full batch each on a fresh budget.

Recorded gaps say the same thing India's agent found: most Indian state and city bird clubs run on
Facebook and WhatsApp rather than their own sites. That is a real finding, not an excuse, and it
means India's remaining coverage needs the browser-verified social route rather than curl.

## Queued (not started), in the order they are worth spending a fresh search budget on

1. **East Asia**: Japan, Taiwan, China, South Korea, Hong Kong, Mongolia. Nothing merged at all yet.
   Search in Japanese (野鳥の会, 探鳥会), Chinese (賞鳥 / 观鸟协会) and Korean (탐조), not English.
2. **India, properly**: a batch of its own, targeting the state and city clubs, accepting that many
   are Facebook groups and verifying those in a browser.
3. **Oceania**: Australia (BirdLife Australia has many branches, treat by state), New Zealand (Birds
   New Zealand has regional branches), Papua New Guinea, Fiji, the smaller Pacific nations.
4. **Antarctica**: `AQ` plus the subantarctic territories. Expect national Antarctic programmes,
   research stations and the seabird societies rather than clubs; a short honest list is correct.
5. **Southeast Asia re-pass**: Malaysia (Malaysian Nature Society branches), Philippines (Wild Bird
   Club of the Philippines chapters), Indonesia, Thailand's regional clubs.
6. **Africa deepening**: Kenya, Tanzania, Uganda, Zimbabwe, Ghana, Nigeria, the Gambia, Senegal.
7. **Middle East and Central Asia**: Israel (a serious birding country), Turkey is already listed but
   thin, UAE, Oman, Jordan, Kazakhstan, Georgia, Armenia.
8. **The nine thin Balkan/Turkey countries** left after the eBird placeholders came out; Kosovo has
   zero groups and does not appear on the page at all.

## Wave discipline

3 to 4 research agents per wave, not more. 6 to 8 at once burned through a full session's quota
within an hour on 2026-08-05/06 even when every agent behaved correctly, because WebSearch/WebFetch
calls are expensive per agent. See `~/.claude/commands/birding-community.md`'s "Delegating research
to subagents" section and `build/BRIEF.md` for the full mechanics (both tightened 2026-08-06 to cut
searches/curls per agent and to ban the eBird-alert and unverifiable-entity patterns above).

**Model:** use `model: "haiku"` for research agents (see the Haiku vs Sonnet note above for why, and
for the mandatory manual spot check that goes with it). Fall back to Sonnet for a batch if Haiku's
output shows weak judgment beyond what the spot check and normal ingest/verify pass catch.
