# /cams/ — Live Bird Cam Directory

The comprehensive year-round bird cam database: cams streaming right now AND seasonal cams
that return on a known schedule, both clearly labelled and filterable. Built 2026-08-09.

## Files

- `data/cams.json` — the roster. One object per cam. Generator merges every `data/*.json`.
- `template.html` — page shell in the site design (placeholders: FINDER, SECTIONS, SCRIPT).
- `generate.js` — builds `/cams/index.html`. Run: `node build/cams/generate.js`
- `verify.js` — schema check + species-slug cross-check against `build/species/slugs.json`.
  Run before every generate. Hard-fails on bad slugs, categories, regions, ids, watch entries.
- `checklive.js` — fetches every YouTube cam's watch page and confirms YouTube reports it
  live NOW. Run before every deploy and at the quarterly link check (alongside
  `build/checkurls.sh` for the community page). Exit 1 on any mismatch.
- `capture-thumbs.js` — real footage stills for every LINK-type cam (Cat's rule: cards
  always show cam footage, never icons). YouTube channel links get the latest stream's
  i.ytimg.com thumbnail; explore.org and other players get a headless Chrome screenshot
  of the player element. Output `assets/cams/<id>.jpg` (480 wide via sips); generate.js
  picks the still up automatically and falls back to a lucide icon only when the file is
  missing. Needs `puppeteer-core` + system Chrome. Rerun at the quarterly check, then
  eyeball the stills: a black or consent-wall frame means recapture that id with
  `--only=<id>` or hand-replace the JPEG.

## Schema (one cam)

```json
{
  "id": "kebab-unique",
  "name": "", "host": "", "location": "", "flag": "🇺🇸",
  "region": "North America | Central & South America | Europe | Africa | Asia & Middle East | Australia & New Zealand",
  "category": "eagles | ospreys | falcons | owls | feeders | tropical | seabirds | wetlands",
  "status": "live | seasonal",
  "returns": "March (required when seasonal — shown on the badge)",
  "species": [{ "name": "Bald Eagle", "slug": "bald-eagle" }],
  "seasonText": "Best months to watch, one sentence.",
  "watch": { "type": "youtube", "videoId": "11chars", "channelUrl": "https://www.youtube.com/@..." },
  "blurb": "One or two sentences. No dashes. Positive-forward."
}
```

`flag` is data only, never rendered: BeakBrain UI uses no emojis (Cat's rule). Link-out
thumbnails get a lucide icon per category, extracted at build time from the app's
lucide-react-native package (see the `lucide()` helper in generate.js). The species pages
render a "Watch the X on live cams" section from this same data file
(`build/species/generate.js` reads `data/cams.json`), deep-linking to `/cams/#cam-<id>`,
so regenerate species pages after big cams changes.

Link cams use `"watch": { "type": "link", "url": "https://..." }` — explore.org and
self-hosted players are ALWAYS link-outs (respect their players); only YouTube-hosted
streams are embedded, via a click-to-play lightbox (no iframes load until clicked).
Species with no page in `/birds/` get a chip with no slug (renders unlinked, never broken).

## Verification rules (same fabrication cautions as the community build)

- A cam enters the data ONLY after its stream was seen live: YouTube cams via the
  channel `/streams` tab + `checklive.js` watch-page check; explore.org cams via their
  own LIVE / OFF SEASON labels scraped in a real browser.
- Never trust a channel handle guess: resolve via YouTube search first
  (`scratchpad probe-channels.js --resolve` pattern; script also lives in session notes).
- Live stream videoIds CHANGE when a host restarts the stream. `checklive.js` finding
  ENDED/NOT LIVE means: re-probe the channel's `/streams` tab for the new id, or flip the
  cam to `status: "seasonal"` with a `returns` month.
- `status: "live"` means verified streaming at last check (the page prints the check date).
  `seasonal` means the cam is real, the host is active, and it returns on the stated month.

## Maintenance cadence

- Quarterly (with the community link check): `node build/cams/verify.js && node build/cams/checklive.js`,
  fix mismatches, regenerate, deploy. Seasonal flips to check by month:
  - Sep/Oct: UK + Baltic ospreys and storks depart (flip to seasonal, returns March/April);
    SWFL, Berry, Window to Wildlife, KNF go live; Port Lincoln eggs; 367 Collins falcons.
  - Feb/Mar: US eagle/owl/crane cams live; Beleef de Lente, Rowe cranes return.
  - May/Jun: snowy owl, puffins, tropicbird return; Sydney sea-eagle eggs.
- Known gaps queued for a future pass: MME Hungary kestrel/saker cams, 367 Collins Street
  falcons Melbourne (verify channel in September), Achieva Osprey St Petersburg FL, NCTC
  eagle West Virginia, Xcel Energy Fort St. Vrain, German Recke feeder, Japan and wider
  Asia beyond Israel and the Philippines, NZ kākā/kākāpō if any stream exists.
- Species pages missing from the dataset that cams reference unlinked (flag for data fix):
  California Condor, Sandhill Crane, Eurasian Goshawk, White-bellied Sea-Eagle,
  Lesser Spotted Eagle, African Fish Eagle, Grey Go-away-bird.
