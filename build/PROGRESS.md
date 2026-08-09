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

## Done: Africa (2026-08-09), after a Sonnet deepening pass

**29 countries, 104 groups.** Wave 1 (Haiku) returned 26 groups across 17 countries; a deepening pass
on **Sonnet** took that to 104 across 29, and the difference is entirely judgment rather than budget:
Kenya 3 to 10, Uganda 2 to 6, Nigeria 3 to 7, Ghana 1 to 4, Tanzania 1 to 4, and **eleven countries
Haiku had returned empty turned out to have real communities** (the Gambia, Senegal, Cameroon, Côte
d'Ivoire, Benin, Sierra Leone, Liberia, Cape Verde, São Tomé, Rwanda, Mozambique). Gabon and DR Congo
were confirmed genuinely empty, with the reasoning recorded.

The Sonnet run also did the thing the cheap runs never do: it reported its own rejections and one
deliberate deviation. It rejected Zanzibar Birdwatching Society (domain now parked), Nature Palace
Foundation and Kalahari Conservation Society (general environmental NGOs, not birding communities) and
Namibia's REST (rebranded away from birds), and it flagged that it had added SABAP2 to four countries
on purpose. That last one still broke the one-URL-per-card rule, so SABAP2 now appears once, under
South Africa, with a `gaps` note in the other four. **This is the argument for Sonnet on any continent
where the cheap pass returns about one group per country.**

`tanzaniabirdatlas.net` joins the `HTTP_ONLY_OK` allowlist: https times out on every variant, http
serves the real Tanzania Bird Atlas.

**Five Facebook GROUP links in this batch are merged but not browser confirmed.** Facebook switched to
a logged-out login wall partway through the check. Two things worth knowing for next time: **a login
wall is NOT a dead tell** (the dead tells are the literal "This content isn't available" / "Profile
isn't available" strings), and **a numeric `/groups/<id>/` URL cannot be fabricated the way a vanity
handle can** — an invented number does not resolve at all, so a numeric id that Facebook answers for
is decent evidence on its own. Recheck when Facebook is cooperative:
`groups/241108492733888`, `groups/959678370808457`, `groups/653034744862182`,
`groups/489513973165744`, `groups/aacem`.

### Superseded: Africa wave 1 (Haiku) notes

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

## The WebSearch budget: what is actually known (corrected 2026-08-09)

Three Asia agents stopped reporting `WebSearch budget exhausted (200/200 calls)`. **An earlier version
of this section said that budget is account wide and that a session therefore gets only 5 to 6
research batches. That was wrong, and it was wrong in a way that would have stopped work
unnecessarily.** Immediately after all three agents reported exhaustion, a WebSearch from the MAIN
session succeeded on the first try. So it is not one global pool covering the session.

What the evidence actually supports:

- **The cap is per agent, not shared with the main session.** The main thread kept searching fine.
- **The India agent probably did hit it honestly.** It ran 62 tool calls against a country needing
  40 to 70 groups across 25 states; 200 searches is a plausible spend there.
- **The East Asia agent almost certainly did NOT.** It reported the budget was "exhausted before
  starting this batch" after **9 tool calls and 32k tokens**, then stopped and asked questions
  instead of writing a file. That reads as an agent bailing out and misattributing why. This project
  already has a documented history of agents reporting things they did not do (the USA batch claimed
  "all URLs verified, HTTP 200" for 13 dead links), so **treat an agent's account of why it stopped
  with the same suspicion as its account of what it verified.**
- **Unknown:** whether concurrently running agents share a pool, and the reset semantics. Not
  established either way, so do not plan around a guess.

**What to do when an agent reports this:** relaunch the batch rather than concluding the session is
over. Add to the prompt: "if you hit a hard search limit, write whatever you have verified to the
output file before stopping, and say how many searches you got through" — an agent that stops without
writing a file wastes the entire batch, which is what happened to East Asia the first time.

## Done: Asia, wave 1 (2026-08-09) — PARTIAL, national bodies only

Merged because every entry is a real, verified national organisation and they are better on the page
than absent, but **Asia is nowhere near done**: 12 groups across 9 countries.

India 4 (Bombay Natural History Society, Wildlife Trust of India, SACON, Bird Atlas India),
Sri Lanka 1 (Ceylon Bird Club), Nepal 1 (Himalayan Nature), Bhutan 1 (RSPN), Thailand 1 (BCST),
Singapore 1 (Nature Society Singapore), Philippines 1 (Haribon), Indonesia 1 (Burung Indonesia),
Vietnam 1 (Viet Nature). All 12 URLs re-checked, all 200 with matching titles.

**East Asia (Japan, Taiwan, China, South Korea, Hong Kong, Mongolia) returned nothing at all** on its
first attempt, from an agent that stopped after 9 tool calls claiming an exhausted budget (see the
section above for why that claim does not hold up). Relaunched on Sonnet. Japan and Taiwan in particular have very deep club
networks (prefectural branches of the Wild Bird Society of Japan, city societies under the Taiwan
Wild Bird Federation) and are worth a full batch each on a fresh budget.

Recorded gaps say the same thing India's agent found: most Indian state and city bird clubs run on
Facebook and WhatsApp rather than their own sites. That is a real finding, not an excuse, and it
means India's remaining coverage needs the browser-verified social route rather than curl.

## Done: Oceania, East Asia, Antarctica, Middle East and Central Asia (2026-08-09)

All four came back from **Sonnet** agents and **none of them hit a search limit**, which is what
settled the budget question above.

- **Oceania** (12 countries, 70 groups): Australia 47 across all 8 states and territories, New Zealand
  13 across 12 regions, then one group each for Fiji, New Caledonia, French Polynesia, Vanuatu, Samoa,
  Micronesia, Marshall Islands, Palau, Guam and the Cook Islands. Papua New Guinea, Solomon Islands,
  Tonga, Kiribati, Nauru and Tuvalu are honest zeros. This batch passed `ingest.js --dry` clean on the
  first run, the only one in the whole project to do so.
- **East Asia** (42 groups): Japan 20 (Wild Bird Society of Japan branches across all 7 regional
  blocks; WBSJ actually has about 85, so this is a representative sample and there is room to go
  deeper), Taiwan 10 city and county societies, South Korea 5, China 4, Hong Kong 2, Mongolia 1.
  Macau and North Korea are honest zeros. China is the weak spot: real groups exist for Beijing,
  Shanghai, Guangzhou, Chengdu and a dozen more, but their domains were unreachable or serving
  placeholders from here, all logged individually in `gaps`.
- **Antarctica** (5 groups): a new continent bucket, `70-antarctica.json`. There are no clubs on a
  continent with no residents, so this is the bodies that actually organise people around Antarctic
  birds: SCAR's Expert Group on Birds and Marine Mammals, Oceanites / the Antarctic Site Inventory,
  the Antarctic and Southern Ocean Coalition, the World Seabird Union and Albatrosses from Space.
  Penguin Watch was removed at Cat's request.
- **Middle East and Central Asia** (36 groups): Israel 8, UAE 6, Jordan 4, Kuwait and Lebanon 2 each,
  then Oman, Qatar, Iraq, Iran, Kazakhstan, Uzbekistan, Kyrgyzstan and Tajikistan. Saudi Arabia,
  Bahrain, Yemen, Syria, Turkmenistan and Afghanistan are honest zeros with the reasoning recorded.

**Adding a continent takes two edits**, both done: `CONTINENT_ORDER` in `generate.js` and `FILE_FOR`
in `ingest.js`. Miss either and the batch fails validation with `bad continent`.

Twelve more hosts joined `HTTP_ONLY_OK` after checking every https variant by hand. Older Japanese,
Taiwanese, Korean and Central Asian society sites frequently never got a certificate, and dropping
them would leave Korea, Shenzhen, Chiayi, Okhotsk, Iriomote, Iraq and Uzbekistan with nothing. Note
that **5 of the 10 http URLs in the East Asia batch DID have working https** and the agent simply used
http, so always test the variants rather than allowlisting on the agent's word.

Every social link in these batches was browser confirmed by `og:title`: all three in Oceania, all four
in East Asia and the Middle East. Nothing fabricated in any of the four.

## Region coverage audit (2026-08-09) — `node build/regioncheck.js`

"The country is done" and "every region of that country is covered" are different claims, and only
the first shows up in a group count. Brazil sat 8th on total groups while missing 12 of its 27 states.
`build/regioncheck.js` audits the countries where a regional split is expected; `--thin` lists every
country carrying only one region.

**Complete:** United States 51/51, United Kingdom 72, Australia 8/8, Germany 16/16, Netherlands 12/12,
South Africa 9/9, Spain 17/17, New Zealand 16/16.
**Near complete:** Canada 12/13 (Nunavut confirmed genuinely empty), Italy 17/20.
**Still open:** India 18/34, Brazil 15/27.

Two traps this audit surfaced, both now fixed:
- **Naming, not gaps.** The first run reported Germany 8/16 and Spain 16/17 purely because batches
  used English exonyms (Bavaria for Bayern) and local forms (Islas Baleares). Both were already
  complete. The script is alias aware; add to `ALIAS` rather than "fixing" the data.
- **A country listed by its own convention is not a gap.** Japan is split by the Wild Bird Society's
  seven regional blocks rather than 47 prefectures. That is reasonable, so Japan is not audited
  against a prefecture list.

**112 of 160 countries carry a single `Countrywide` region.** For Andorra, Malta, Iceland and the
Pacific islands that is simply correct. But the same list catches countries that are under covered
rather than small, and at the time of the audit the best remaining targets were **Chile (2 groups),
Romania (3), Tanzania (4), Ghana (4), Peru (4), Greece (5), South Korea (5), Uganda (6)**.

**All eight have since been worked** (see the thin countries wave below). Romania, Greece, Peru,
Tanzania and Thailand gained real regions; Chile, South Korea, Ghana and Uganda stayed single region
because the research says they genuinely are, which is the useful outcome of running the audit rather
than assuming. Re run `node build/regioncheck.js --thin` before picking the next batch.

## What Brazil and India taught about the honest zero

Both gap filling batches ran on Sonnet and both produced results worth more than their group counts.

**Brazil gained no cards at all, and that was correct.** Real club level organising exists in three of
the twelve missing states and none of it is linkable: COAPA in Pará (founded 2024, about 280 members,
covered by Diário do Pará), COA/RR in Roraima (2019, about 41 members, two independent papers), and
Vem Passarinhar Manaus in Amazonas (a UEA university extension project). Two Instagram handles for
these surfaced and were deliberately left out because neither would return real bio or follower
content. **This also corrected an earlier claim in this file** that Amazonas and Pará are "tourism and
guide based, not club based": the clubs exist, they have no findable page yet.

**India went 4 to 34 groups across 19 states** by working the social route, which its own earlier run
had correctly identified as the only route that works there. Two near misses were caught by the agent:
`bsap.in`, the old Birdwatchers Society of Andhra Pradesh domain, **has been hijacked and now redirects
to a Vietnamese gambling site** (replaced with the org's real current site, `deccanbirders.org`), and
`jorbeer.com`, offered as "Bikaner Bird Club", is a commercial safari operator.

Two more were caught by the mandatory browser pass, which is the argument for keeping it: **Odisha
Nature and Wildlife was dead** (Facebook serving "content isn't available") and **UP Birds could not be
corroborated** by any search result quoting its real content. Both dropped.

**A refinement to the social verification rule.** A numeric `/groups/<id>/` URL cannot be fabricated
plausibly, so Facebook answering for one is decent evidence by itself. A VANITY URL
(`/groups/UPBirds/`) can be fabricated exactly like a page handle, so it needs the same corroboration
as any other: a search result quoting a member count, a post, or independent press. Judge the two
differently.

## Done: thin countries and Southeast Asia (2026-08-09, commit 8ea2682)

**1,045 to 1,070 groups.** Cleared queued items 3 and 4. Done in the MAIN session rather than by
subagents, so the per agent search cap never came into it.

| Country | Groups | Regions | What it gained |
|---|---|---|---|
| Romania | 3 to 8 | 1 to 6 | SOR's own branch pages for Bucharest, Cluj, Iasi, Brasov, Maramures |
| Malaysia | 0 to 6 | 0 to 5 | MNS national, Selangor branch + its PiedFantail bird group, Perak, Sabah, Sarawak |
| Indonesia | 1 to 5 | 1 to 3 | Jakarta Birdwatcher's Society, and PPBJ, Kutilang and BIONIC UNY in Yogyakarta |
| South Korea | 5 to 7 | 1 | Ornithological Society of Korea, Saerang community platform |
| Greece | 5 to 7 | 1 to 2 | Hellenic Bird Ringing Centre, Kalloni centre on Lesvos |
| Peru | 4 to 5 | 1 to 2 | PAU Arequipa |
| Tanzania | 4 to 5 | 1 to 2 | Kilombero Valley Ornithological Centre |
| Chile | 2 to 4 | 1 | breeding bird atlas, neotropical waterbird census |
| Philippines | 1 to 2 | 1 | Wild Bird Club of the Philippines |
| Thailand | 1 to 2 | 1 to 2 | EcoThailand Birdwatching Club |

Ghana and Uganda were re researched and gained nothing. Both are honestly covered already: Ghana's
regional structure is school wildlife clubs under GWS rather than independent bird clubs, and
NatureUganda's university branches have named coordinators but no pages of their own.

**`ingest --dry` passed clean on the first run**, the second batch ever to do so after Oceania.

### The parked domain that a browser caught and curl could not

**REDAVES**, the Coquimbo region bird network, is real: it runs the neotropical waterbird census on
three Coquimbo Bay wetlands and monitors American Oystercatcher nesting, all covered in the Chilean
press. Its domain behaves like this:

- `https://redaves.cl/` serves **BirdVancouver.com**, an unrelated site on a shared certificate.
- `http://redaves.cl/` returns **200 with the title `redaves.cl`** and a JavaScript loading spinner.
- Rendered in a browser, that spinner resolves to **"This domain is registered at Dynadot.com.
  Website coming soon."**

The `<title>` check in BRIEF.md rule 3 does not catch this, because the title is the bare domain
rather than a recognisable parking brand. **A JavaScript shell that renders to a parking page is the
same class of problem as an invented Instagram handle: only a browser can see it.** Add a bare domain
name as the whole title to the list of things worth opening.

**COAP Cusco** was dropped on the vanity URL rule: `facebook.com/groups/coapcusco/` answers behind a
login wall with no `og:title`, no member count and no press or search result quoting its content.
That is exactly the case the Africa and India waves said needs corroboration and does not have it.

### Two link repairs found while gap filling, worth looking for elsewhere

- **Romania's SOR entry pointed at `birdlife.org/partners/romania-...`**, the partner directory page,
  rather than at `sor.ro`. A national society linked via its umbrella's directory rather than its own
  site passes every automated check and is still the wrong link.
- **Ornitodata pointed at `sor.ro/ornitodata-e-online/`**, the "Ornitodata is online" announcement
  post, rather than at `pasaridinromania.sor.ro`, the platform itself. This is rule 4's news article
  ban, shipped before the guard existed. **Grep the older Europe batches for other announcement URLs.**

`sor.ro`, `mns.my` and `mnsselangorbranch.org` all serve 403 to non browser clients. Every one of
their pages here was confirmed by opening it: the five SOR branch pages each carry a named branch
contact and address, so they are real pages and not a soft 404 behind the block.

## Queued (not started)

1. **India**, 16 states still empty. Several are genuine (Bird Count India itself reports zero walks in
   Haryana), but Assam, Punjab, Odisha and the Northeast are worth another pass.
2. **Brazil**, 12 states, blocked on those clubs having no web presence rather than on research.
3. **Japan deeper**: WBSJ has about 85 branches against the 20 listed.
4. **China**: retry the city societies, whose domains were unreachable from this network.
5. **The nine thin Balkan/Turkey countries**; Kosovo has zero groups and does not render at all.
6. **Indonesia and Malaysia deeper.** Both now have a spine but not a network. Indonesia is reported
   to have around fifty local birding communities across Sumatra, Java and Kalimantan, most of them on
   WhatsApp and closed groups; Malaysia has MNS branches in every state and only five are listed.
   Note `burung-nusantara.org`, which used to carry a directory of Indonesian groups, no longer
   resolves, so that roster shortcut is gone.
7. **Pre existing breakages unrelated to this wave**, from `verify.js`: Hong Kong Bird Watching
   Society (`hkbws.org.hk`) and HawkCount (`hawkcount.org`) both return 000, and Xiamen Bird Watching
   Society returns 502.

## Wave discipline

3 to 4 research agents per wave, not more. 6 to 8 at once burned through a full session's quota
within an hour on 2026-08-05/06 even when every agent behaved correctly, because WebSearch/WebFetch
calls are expensive per agent. See `~/.claude/commands/birding-community.md`'s "Delegating research
to subagents" section and `build/BRIEF.md` for the full mechanics (both tightened 2026-08-06 to cut
searches/curls per agent and to ban the eBird-alert and unverifiable-entity patterns above).

**Model: use Sonnet.** This line used to say Haiku for cost, and the evidence since then has gone the
other way hard enough to reverse it. Haiku failed in **two opposite directions**: South America
*fabricated* (7 of 11 Instagram handles did not exist, 14 Brazilian "clubs" all pointing at one
directory URL), and Africa then *under reported* (Kenya 3 groups, 21 West and Central African
countries returned empty, eleven of which a Sonnet pass then filled). Every Sonnet batch since has
been clean or near clean, and Oceania passed `ingest --dry` first time. The token saving does not
survive the repair time, and the repairs are the kind the automated checks cannot make for you.

The Haiku vs Sonnet note in the Europe section is kept as the record of how this was learned, not as
current advice.
