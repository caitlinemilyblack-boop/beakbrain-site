# Research brief: BeakBrain birding community directory

You are researching **birding COMMUNITIES** (people to bird with) for the BeakBrain community
directory at beakbrain.com/community.html. Output is a JSON file. Read this whole brief first.

## What counts as a community (include)
- The national bird society / BirdLife International partner
- Regional and local bird clubs, ornithological societies, bird study groups, ringing groups.
  **These are the bulk of the list.** Aim for the full national roster of local clubs.
- Citizen science: breeding bird atlas, national bird monitoring scheme, garden bird count,
  migration counts, waterbird census, nest record scheme
- The sightings / logging platform birders in that country actually use (Trektellen, Waarneming,
  Ornitho.*, BirdLasser, eBird country portal, Observado, Artportalen, Tarsiger, etc.)
- Rare bird alert / news services and their mailing lists or Google Groups
- Young birders clubs, women's birding groups, and other inclusive birding communities
- **Public** Facebook groups, Discord servers, Meetup groups and WhatsApp communities for birding
  in that country or region (only if the URL loads publicly, see verification)

## Never include
- Any PLACE: reserves, sanctuaries, hides, hotspots, national parks, observatories that are only a site
  (a bird OBSERVATORY that has a membership / volunteer community IS fine)
- Tour operators, guides, lodges, hotels, travel companies
- Shops, optics retailers, book sellers
- Government agencies with no public membership or volunteer programme
- Dead, dormant (no activity in ~3 years) or pure-archive sites

## The rules (non-negotiable)

1. **Own link first, in one search.** For EVERY group, run ONE search for the group's exact name
   (add the country/region if the name is generic, e.g. "Utrecht bird club"). Its own website,
   Facebook page/group, Meetup or Discord will normally be in the first handful of results; prefer
   them in that order if more than one turns up. Only run a second, more targeted search if the first
   comes up empty or ambiguous, a second search per group is the exception, not routine. Only when a
   group has no findable presence of its own even after that, fall back to its entry on the national
   society's club directory. That fallback is also the exception, not the default.

2. **Cover every region.** List the country's first-level regions (provinces / states / counties /
   Länder / regions) and try to give each at least one group. Where a country genuinely has only
   national bodies, a single "Countrywide" region is correct and honest. Do not invent groups to fill
   regions. Note real gaps in the `gaps` array (see output format).

3. **Every link must return 200 AND be the real thing.** Verify with curl, but batch it: once you
   have the full candidate URL list for a country (or a region within it), verify them all in ONE
   Bash call, not one call per link, e.g.:
   ```bash
   for u in "https://url1" "https://url2" "..."; do
     echo "$u -> $(curl -s -m 20 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" -o /dev/null -w "%{http_code}" -L "$u")"
   done
   ```
   A 200 is necessary but NOT sufficient. Parked / for-sale domains (GoDaddy, Sedo, HugeDomains,
   Afternic, dan.com) also return 200. For any bare custom domain that returns 200, spot check the
   title in the same batched pass:
   `curl -s -m 20 -A "Mozilla/5.0 ..." -L "<url>" | grep -o '<title>[^<]*'`
   If the title is a parking page, a "domain for sale" page, or unrelated, drop the link and use the
   group's Facebook page instead. Redirects are fine as long as the FINAL page is the right group.
   **Do not put a URL in the output that you have not personally curl-verified in this session.**
   `build/verify.js` re-checks everything again after ingest, so your job here is to catch obvious
   dead or parked links before they're written, not to achieve perfect certainty.

4. **Prefer a stable canonical URL.** Homepage over a deep page. Avoid URLs with session ids or
   query strings. Avoid `http://`; use `https://` where it works.

5. **No dashes in any copy.** Brand rule. Blurbs and names must not contain "-", "–" or "—".
   Use commas, "and", or full stops instead. (Hyphenated proper names like "Wallonie-Bruxelles" in an
   official group NAME are acceptable; never in a blurb.)

6. **Blurbs: one concrete line.** Who they are and where they operate. Max about 120 characters.
   English, even when the group is not English speaking. Good: "The national bird society, with
   forty local branches running walks and counts." Bad: "A great club for bird lovers."

7. **De-duplicate.** One card per group. Never repeat a URL, in this file or across regions.

8. **Be current.** It is August 2026. Check that the group still exists and the site is live now.

## Output format

Write ONE file: `/Users/caitlinblack/Developer/beakbrain-site/build/data/incoming/<BATCHNAME>.json`

```json
[
  {
    "code": "FR",
    "name": "France",
    "flag": "🇫🇷",
    "continent": "Europe",
    "aka": ["france", "french"],
    "gaps": ["Corsica: no local club with its own site found, only the LPO delegation"],
    "regions": [
      { "name": "Countrywide", "groups": [
        { "name": "LPO", "url": "https://www.lpo.fr", "blurb": "The national bird protection league and BirdLife partner, with local delegations across the country." }
      ]},
      { "name": "Auvergne Rhone Alpes", "groups": [
        { "name": "LPO Auvergne Rhone Alpes", "url": "https://auvergne-rhone-alpes.lpo.fr", "blurb": "Regional branch running outings, counts and surveys across the region." }
      ]}
    ]
  }
]
```

- `code`: ISO 3166-1 alpha-2, uppercase. For territories use their own ISO code (GI, FO, IM, PR...).
- `flag`: the country's flag emoji.
- `continent`: exactly one of `Europe`, `North America`, `South America`, `Africa`, `Asia`, `Oceania`.
  (Central America and the Caribbean go under `North America`. Turkey, Cyprus, Russia, Georgia,
  Armenia and Azerbaijan go under `Europe`. The Middle East goes under `Asia`.)
- `aka`: lowercase alternative names and spellings people might search for (native name, former name).
- `gaps`: plain sentences about regions with no findable group, and about groups that look like they
  exist but need a logged in Facebook account to confirm. Never put an unverified link in `regions`.
- Region name "Countrywide" for national bodies. It is always listed first by the generator.
- Region names in English where an English form is normal (Bavaria, Andalusia, Tuscany), otherwise the
  local name. Keep them plain, no accents stripped, no dashes.

## Target depth
- Countries with a real club network (UK, Germany, France, Spain, Italy, Poland, Sweden, USA, India,
  Australia, Brazil, Japan): aim for 25 to 80 groups, covering every first level region.
- Mid sized birding cultures: 8 to 25 groups.
- Countries with little organised birding: 2 to 6 groups is fine and honest. Always include the
  BirdLife partner or nearest national society if one exists, the main public Facebook birding group
  if one is publicly viewable, and any bird atlas or count.
- **Never pad.** A short honest list beats invented or dead links.

## Do the work yourself
**You are the researcher. Never spawn or delegate to another agent.** Do not use the Agent or Task
tool at all. Run the searches, fetches and curl checks yourself and write the JSON file yourself.

## How to research
Start from primary sources: the national BirdLife partner's own "find a club" / "local groups" page,
the national ornithological union, the national ringing scheme, the national atlas project. Those give
you the complete roster of group NAMES in one or two searches. Then run one search per group (rule 1)
for its own link. Wikipedia's "List of ornithological societies" style pages and the BirdLife partner
directory (https://www.birdlife.org/partners/) are useful starting points. Do NOT rely on generic
"best birding sites in X" listicles, they are about places.

**Local-language search only earns its keep at the roster step above.** An English-only search for
the roster misses most local clubs, so search that step in the country's own language(s) too: the
native word for bird / birding / ornithological society / bird club / local group (vogel,
vogelwerkgroep, oiseaux, ornithologique, aves, ornitologica, ornitologisk, fugl, fågel, lintu, ptaki,
ornitologicka, madartani, ptitsy, pajaros, passaros, uccelli, Vogelkunde, ornitoloji, avistamiento de
aves), plus the native word for "local group", "branch", "association", "society" or "field club",
and for non Latin scripts, the native script (Greek, Cyrillic, Arabic, Hebrew, Devanagari, Thai,
Chinese, Japanese, Korean). Once you have a group's actual name, searching that name (rule 1) is
already a native-language search, a second native-language sweep per group is redundant. Write every
card in English regardless of the source language.

**Prefer WebSearch snippets over WebFetch.** A search result snippet is usually enough to confirm a
group's URL and that it's live. Only WebFetch a page when you must open it, e.g. to read a "find a
club" directory's list of links, or to resolve real ambiguity a snippet can't settle. Don't WebFetch
pages you're only using as a jumping off point, and don't re-fetch a page you've already read this
session.

**Keep narration to a minimum.** Work through the batch and write the JSON; don't narrate progress
between every search. Report once at the end, per "Finish" below.

## Finish
When done, report: countries covered, group count per country, anything you had to leave out and why.
