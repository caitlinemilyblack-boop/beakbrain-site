# /trips/ — Eco-Certified Birding Travel Directory

Database + map of eco-certified birding travel in the cams mould: tour operators,
local guide programmes, lodges and screened booking platforms. Full strategy and
source research: `~/Developer/Birding-Quiz-App/PLAN-2026-08-12-trips-directory.md`.
Build state and next steps: `~/Developer/Birding-Quiz-App/HANDOVER-2026-08-12-trips-build.md`.

## Files

- `data/*.json` — the roster. One object per entry. Generator merges every `data/*.json`
  (except geo.json), dedupes by id, keeps first occurrence.
- `template.html` — page shell in site design (placeholders: HEROLINE, FINDER, SECTIONS, SCRIPT).
- `generate.js` — builds `/trips/index.html`. Run: `node build/trips/generate.js`
- `verify.js` — schema + honesty checks. Run before every generate. Hard-fails on
  missing evidence URLs, dashes in blurbs, bad regions/types, guide entries without
  vetting evidence.
- `geocode.js` — Nominatim geocoding of each entry's `location` string into `data/geo.json`.
  Idempotent. NEVER use upstream coordinates (Destinet's lat/long repeat cluster values).
- `staging/` — gitignored scratch: certifier registry scrapes, prefiltered candidates,
  agent batch outputs, rescued homepage HTML (`staging/fetched/opb1..4/`).

## Schema (one entry)

```json
{
  "id": "kebab-unique",
  "type": "operator | guide | lodge | aggregator",
  "name": "", "hq_country": "",
  "location": "City, Country (drives geocoding + card meta)",
  "region": "North America | Central & South America | Europe | Africa | Asia & Middle East | Australia & New Zealand",
  "operates_in": ["Country", "or Worldwide"],
  "url": "https://... (the company's own site)",
  "certifications": [{ "scheme": "Travelife Certified", "tier": "", "evidence_url": "https://registry...", "checked": "2026-08-12", "expires": "optional" }],
  "conservation": { "kind": "percent-profit | percent-revenue | fixed-per-booking | fund | carbon-programme | carbon-neutral | community | screening | none-documented", "detail": "", "evidence_url": "" },
  "guide_vetting": { "body": "", "detail": "", "evidence_url": "" },
  "birdy": true,
  "blurb": "One or two sentences. No dashes. Positive-forward. Grounded in evidence only.",
  "source": "travelife-registry | cst-registry | destinet-operators | destinet-activities | ww-archive | operator-site | ...",
  "last_verified": "2026-08-12"
}
```

`guide_vetting` is required for type guide. `birdy: true` only when the company
explicitly offers birdwatching (drives the Birding chip; guides always get it).

## The badge honesty rule (load-bearing)

- **Certified chip**: only when the entry appears on the certifier's OWN public
  registry; `evidence_url` points at that registry, never at the company's claim.
- **Conservation giving chip**: only for a concrete published policy (fixed
  donation, % of profit/revenue, named fund, audited carbon programme) with the
  documenting page as `evidence_url`.
- **Stated ethos gets NO badge.** Badgeless entries are allowed but each is a
  deliberate call (verify.js warns on them).
- Money must never touch badge logic: any future paid placement or affiliate link
  stays visually and logically separate from certifications.

## Verification rules (same cautions as community + cams builds)

- Primary sources only: certifier registries for certifications, the operator's own
  site for giving policies. Never blogs, never search snippets, never an agent's
  unverified claim.
- Manual read of every agent batch's URL list before merging into `data/`.
  Never merge on a batch's own "all verified" claim.
- Batched curl for URL liveness; social links need a real browser (puppeteer MCP)
  because Instagram/Facebook 200 on invented handles.
- Certifications expire (CST + Destinet rows carry expiry dates): quarterly,
  re-check evidence URLs alongside the cams/community link check and refresh
  `last_verified`.

## Sections, map, design

- Sections by type in TYPES order (generate.js); badged entries sort first.
- Map: shared `/assets/worldmap.js` (BBMap) + one dot per entry, coloured by type
  (operator green, guide sage, lodge gold, aggregator grey), filters subset dots live.
- Deep links: `/trips/#trip-<id>`.
- No emojis anywhere; lucide icons extracted from the app package at build time
  (binoculars, users, bed-double, globe, badge-check, heart-handshake, bird).
- Hero reuses `/assets/video/hero.mp4` for now; a dedicated trips hero video is a
  nice future swap.
