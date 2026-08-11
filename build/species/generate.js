// Builds the /birds/ species directory: 9,5xx species pages, family/order/
// country/rarity hubs, the /birds/ index, sitemaps, robots.txt and llms.txt.
//
// Run: node build/species/generate.js
//
// Reads the app's data files straight from the Birding-Quiz-App repo so the
// site can never drift from the app. Output goes to <site>/birds/**, which is
// gitignored: generated HTML is deployed, never committed (git history bloat
// is the failure mode that forced the Cloudflare Pages move).
const fs = require('fs');
const path = require('path');
const os = require('os');

const SITE = path.join(__dirname, '..', '..');
const APP = path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'birding-app');
const REGIONS = path.join(APP, 'assets', 'regions');
const PIPELINE = path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'pipeline');
const OUTROOT = path.join(SITE, 'birds');
const ORIGIN = 'https://beakbrain.com';
const APP_URL = 'https://beakbrain-app.pages.dev';
// The one call-to-action, sitewide. At App Store launch, flip these two lines
// (e.g. label 'Get the app', href App Store URL) and regenerate.
const CTA_LABEL = 'Join the waitlist';
const CTA_HREF = '/#waitlist';

// ---------------------------------------------------------------- data
const world = JSON.parse(fs.readFileSync(path.join(REGIONS, 'world.json'), 'utf8'));
const detailRows = JSON.parse(fs.readFileSync(path.join(REGIONS, 'world.detail.json'), 'utf8')).detail;
const imageRows = JSON.parse(fs.readFileSync(path.join(REGIONS, 'world.images.json'), 'utf8')).images;
const species = world.species;
const detail = new Map(detailRows.map((r) => [r.id, r]));
// Best openly licensed Commons video per species, written by fetch-videos.js.
// Optional: pages render photo-led whenever the file or the entry is absent.
const VIDEOS_PATH = path.join(__dirname, 'videos.json');
const videos = fs.existsSync(VIDEOS_PATH)
  ? JSON.parse(fs.readFileSync(VIDEOS_PATH, 'utf8')).videos || {}
  : {};
const photos = new Map(imageRows.map((r) => [r.id, r.images || []]));
const buildDate = (world.generatedAt || new Date().toISOString()).slice(0, 10);

// Live cams that feature each species, from the /cams/ directory data.
// Optional: species pages simply skip the section when the file is absent.
const CAMS_PATH = path.join(__dirname, '..', 'cams', 'data', 'cams.json');
// Resolved YouTube channel ids for channel-hosted cams (same file /cams/ uses).
const CAMCH_PATH = path.join(__dirname, '..', 'cams', 'data', 'channels.json');
const camChannels = fs.existsSync(CAMCH_PATH) ? JSON.parse(fs.readFileSync(CAMCH_PATH, 'utf8')) : {};
const camsBySlug = new Map();
let camsTotal = 0;
if (fs.existsSync(CAMS_PATH)) {
  const camRows = JSON.parse(fs.readFileSync(CAMS_PATH, 'utf8'));
  camsTotal = camRows.length;
  for (const cam of camRows) {
    for (const sp of cam.species || []) {
      if (!sp.slug) continue;
      if (!camsBySlug.has(sp.slug)) camsBySlug.set(sp.slug, []);
      camsBySlug.get(sp.slug).push(cam);
    }
  }
}

// Country names, parsed from the app's own map so there is one source of truth.
const countriesTs = fs.readFileSync(path.join(APP, 'src', 'countries.ts'), 'utf8');
const COUNTRY = {};
for (const m of countriesTs.matchAll(/^\s{2}([A-Z]{2}):\s"(.+?)",?$/gm)) COUNTRY[m[1]] = m[2];

// Major bird groups, parsed from the app's data.ts so the web Browse buckets
// species exactly the way the app's Browse tab does.
const dataTs = fs.readFileSync(path.join(APP, 'src', 'data.ts'), 'utf8');
function parseStringMap(name) {
  const m = dataTs.match(new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!m) throw new Error(`cannot find ${name} in data.ts`);
  const map = {};
  for (const e of m[1].matchAll(/(?:'([^']+)'|"([^"]+)"|([A-Za-z]\w*))\s*:\s*'([^']+)'/g)) {
    map[e[1] || e[2] || e[3]] = e[4];
  }
  return map;
}
// Browse groups switched to Merlin's scheme (Cat, 2026-08-11): one group per
// FAMILY, labelled with its common name and listed in taxonomic sequence —
// exactly how Merlin's species list buckets birds. The family sequence comes
// from AviList row order in the pipeline's 01_base.csv (AviList is published
// in taxonomic order). The app's coarser super-groups are no longer used here;
// the app itself is a follow-up.
const FAMILY_SEQ = (() => {
  const seq = new Map();
  const csv = fs.readFileSync(path.join(PIPELINE, '01_base.csv'), 'utf8').split('\n');
  const head = csv[0].split(',');
  const iFam = head.indexOf('family_common');
  for (const line of csv.slice(1)) {
    const fam = line.split(',')[iFam];
    if (fam && !seq.has(fam)) seq.set(fam, seq.size);
  }
  return seq;
})();
function majorGroupOf(s) {
  return s.family;
}

// ---------------------------------------------------------------- cards
// The species card renderer, required straight from the app repo (same
// single-source rule as world.json). Card art is served by the separate
// beakbrain-cards Pages project: this site sits near the 20,000-file Pages
// cap, so plates never join this deploy. snapshot-plates.js refreshes that
// project from the pipeline manifest; cards-manifest.json is its ledger and
// the only plate index this generator reads.
const CARD = require(path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'build', 'species', 'card.js'));
const MAPDATA = require(path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'build', 'species', 'card.worldmap.json'));
const CARDS_HOST = 'https://beakbrain-cards.pages.dev';
const plateMeta = JSON.parse(fs.readFileSync(
  path.join(os.homedir(), 'Developer', 'beakbrain-cards', 'cards-manifest.json'), 'utf8')).plates;
const STATUS_COLORS = CARD.layout.status.colors;

// Every card embeds the same ~30 sprite data-URIs (silhouettes, art assets).
// Hoist each distinct one to a cached file, as render-browse.js does, so a
// 300-card group fragment stays a few hundred KB instead of tens of MB.
const crypto = require('crypto');
const SPRITEDIR = () => path.join(OUTROOT, 'assets', 'sprites');
const spriteSeen = new Map();
function hoistSprites(svg) {
  return svg.replace(/"data:image\/(webp|svg\+xml);base64,([A-Za-z0-9+\/=]+)"/g, (m, kind, b64) => {
    if (!spriteSeen.has(b64)) {
      const ext = kind === 'webp' ? 'webp' : 'svg';
      const name = crypto.createHash('md5').update(b64).digest('hex').slice(0, 12) + '.' + ext;
      fs.mkdirSync(SPRITEDIR(), { recursive: true });
      fs.writeFileSync(path.join(SPRITEDIR(), name), Buffer.from(b64, 'base64'));
      spriteSeen.set(b64, `/birds/assets/sprites/${name}`);
    }
    return '"' + spriteSeen.get(b64) + '"';
  });
}

function cardSvg(s, width) {
  const d = detail.get(s.id) || {};
  const m = plateMeta[s.id];
  const model = CARD.buildModel(s, d, {
    countryNames: COUNTRY,
    rung: m ? m.rung : undefined,
    plate: m ? {
      href: `${CARDS_HOST}/${m.file}`, w: m.w, h: m.h,
      artist: m.artist, title: m.title, year: m.year,
      license: m.licence, sourceUrl: m.source_url,
    } : undefined,
  });
  // Gradient defs (band/sheen/wash) vary by tier but share ids; suffix them
  // per species so hundreds of inline cards on one page keep their own frame.
  const svg = CARD.renderCard(model, { width, sharedMap: true })
    .replace(/id="(band|sheen|wash)"/g, `id="$1-${s.id}"`)
    .replace(/url\(#(band|sheen|wash)\)/g, `url(#$1-${s.id})`);
  return hoistSprites(svg);
}
const hasPlate = (id) => Boolean(plateMeta[id]);

// Shared world-map geometry every card <use>s, declared once per page.
const BASEMAP_DEF = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><path id="basemap" d="${MAPDATA.world}" fill="${CARD.layout.palette.mapBase}"/></defs></svg>`;

// The card's eBird-style presence calendar, redrawn for the light page
// background: one bar per month, peak = tallest AND widest, absent = faint
// dash, month letters beneath in the mark colour (card.layout.json bottom
// .calendar spec; ink marks are the card's own light-background branch).
function calendarSvg(s) {
  const C = CARD.layout.bottom.calendar;
  const ink = CARD.layout.palette.mapOn;
  const W = 12 * C.tickW + 11 * C.monthGap;
  const letterH = C.letterSize + C.letterBaselinePad + 3;
  const H = C.peakTickH + 6 + letterH;
  let out = '';
  for (let i = 1; i <= 12; i++) {
    const x = (i - 1) * (C.tickW + C.monthGap);
    const present = (s.months || []).includes(i);
    const peak = s.peakMonth === i;
    const w = peak ? C.tickW + 6 : C.tickW;
    const xx = peak ? x - 3 : x;
    const h = peak ? C.peakTickH : present ? C.tickH : C.offTickH;
    out += `<rect x="${xx}" y="${C.peakTickH - h}" width="${w}" height="${h}" rx="2" fill="${ink}"${present || peak ? '' : ' opacity=".45"'}/>`;
    out += `<text x="${x + C.tickW / 2}" y="${C.peakTickH + 6 + C.letterSize}" font-family="Nunito" font-weight="700" font-size="${C.letterSize}" fill="${ink}" text-anchor="middle">${'JFMAMJJASOND'[i - 1]}</text>`;
  }
  return `<svg viewBox="0 -4 ${W} ${H + 4}" xmlns="http://www.w3.org/2000/svg">${out}</svg>`;
}

// Darken a hex colour (for the hero gradient's deep end).
function shade(hex, f) {
  const v = hex.replace('#', '');
  const c = (i) => Math.max(0, Math.min(255, Math.round(parseInt(v.slice(i, i + 2), 16) * (1 + f))));
  return `#${[c(0), c(2), c(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

// National parks (GBIF occurrence packs from the app). Same agency filter the
// app applies: management bodies tagged as parks on Wikidata are dropped.
const parksRaw = JSON.parse(fs.readFileSync(path.join(APP, 'assets', 'parks.json'), 'utf8')).parks;
const AGENCY_RE = /national parks\s+(and|service|authority|board|commission|agency)\b|trust fund/i;
const isRealPark = (name) =>
  !AGENCY_RE.test(name) && name.trim().toLowerCase() !== 'south african national parks';

// ---------------------------------------------------------------- helpers
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function slugify(name) {
  return String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
// Country names that take a definite article in prose ("Birds of the Netherlands").
function theName(name) {
  return /^(?:United|Netherlands|Bahamas|Gambia|Philippines|Maldives|Seychelles|Comoros|Isle of|Czech Republic|Falkland)/.test(name)
    || /Islands$|Republic$/.test(name) ? `the ${name}` : name;
}
const IUCN = {
  LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered',
  CR: 'Critically Endangered', EW: 'Extinct in the Wild', EX: 'Extinct',
  DD: 'Data Deficient', NE: 'Not Evaluated',
};
function rarity(s) {
  if (s.commonness >= 220000) return 'common';
  if (s.commonness >= 25000) return 'uncommon';
  if (s.commonness >= 1000) return 'rare';
  return 'legendary';
}
const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };
function licenceLabel(url) {
  if (!url) return '';
  if (/publicdomain\/zero/.test(url)) return 'CC0';
  if (/publicdomain\/mark/.test(url)) return 'Public Domain';
  const m = url.match(/licenses\/(by[a-z-]*)\/(\d\.\d)/);
  if (m) return `CC ${m[1].toUpperCase().replace(/-/g, ' ')} ${m[2]}`.replace('BY SA', 'BY-SA').replace('BY NC', 'BY-NC').replace('BY ND', 'BY-ND');
  return url;
}
// Media licences arrive as labels from Commons ("CC BY 3.0") but as URLs from
// iNaturalist; show a label either way.
function licDisplay(v) {
  return /^https?:/.test(v || '') ? licenceLabel(v) : (v || '');
}
// Canonical licence URL for structured data: Search Console flags label
// strings ("CC BY 4.0") as "Invalid URL in field license".
function licUrl(v) {
  if (!v) return undefined;
  const str = String(v).trim();
  if (/^https?:/.test(str)) return str.replace(/^http:/, 'https:');
  const sl = str.toLowerCase();
  if (/cc0|zero/.test(sl)) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (/public domain|pdm/.test(sl)) return 'https://creativecommons.org/publicdomain/mark/1.0/';
  const m = sl.match(/by(-?sa|-?nc-?sa|-?nc-?nd|-?nc|-?nd)?[ /-]*(\d\.\d)?/);
  if (m) {
    const suffix = m[1] ? `by${m[1].startsWith('-') ? m[1] : `-${m[1]}`}` : 'by';
    return `https://creativecommons.org/licenses/${suffix.replace(/--/g, '-')}/${m[2] || '4.0'}/`;
  }
  return undefined;
}

function firstSentence(text) {
  // Sentence ends at . ! or ? followed by a capital, skipping abbreviation
  // stops such as "T. m. migratorius" and "subsp." that ended sentences early.
  const t = String(text || '').trim();
  const re = /[.!?](?=\s+[A-Z"“(])/g;
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(0, m.index);
    if (/(?:^|[\s(])[A-Z]$/.test(before)) continue;                 // "T." "m." initials
    if (/\b(?:subsp|var|sp|spp|ca|approx|St|Mt|Dr|cf|vs)$/i.test(before)) continue;
    return t.slice(0, m.index + 1);
  }
  return t;
}
function aAn(name) {
  // "an American Robin" but "a Eurasian Jackdaw" and "a Uniform Swiftlet":
  // names opening with a consonant sound keep "a" whatever the letter.
  if (/^(?:Eu|Uni|Ural|One)/.test(name)) return 'a';
  return /^[AEIOU]/i.test(name) ? 'an' : 'a';
}
function massLabel(g) {
  if (!g) return '';
  return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`;
}
function monthRange(months) {
  if (!months || months.length === 0) return '';
  if (months.length === 12) return 'all year round';
  return months.map((m) => MONTHS[m - 1]).join(', ');
}

// Small thumbnail for inline species mentions. iNat photos have a 75px square
// variant; Commons files go through the thumb endpoint at 120px. The handful of
// photos on other hosts keep their original URL.
function thumbUrl(url) {
  if (!url) return '';
  const inat = url.match(/^(https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/[^/]+)\/[a-z]+\.(\w+)$/);
  if (inat) return `${inat[1]}/square.${inat[2]}`;
  const wm = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([^/]+\/[^/]+)\/([^/]+)$/);
  if (wm) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${wm[1]}/${wm[2]}/120px-${wm[2]}`;
  return url;
}

// Card-size variant (~640px) for confusion cards.
function cardUrl(url) {
  if (!url) return '';
  const inat = url.match(/^(https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/[^/]+)\/[a-z]+\.(\w+)$/);
  if (inat) return `${inat[1]}/medium.${inat[2]}`;
  const wm = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([^/]+\/[^/]+)\/([^/]+)$/);
  if (wm) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${wm[1]}/${wm[2]}/500px-${wm[2]}`;
  return url;
}

// Larger variant for the lightbox. Commons thumbs error when the requested
// width exceeds the original, so the viewer falls back to data-orig on error.
function largeUrl(url) {
  if (!url) return '';
  const inat = url.match(/^(https:\/\/inaturalist-open-data\.s3\.amazonaws\.com\/photos\/[^/]+)\/[a-z]+\.(\w+)$/);
  if (inat) return `${inat[1]}/large.${inat[2]}`;
  const wm = url.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([^/]+\/[^/]+)\/([^/]+)$/);
  if (wm) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${wm[1]}/${wm[2]}/1280px-${wm[2]}`;
  return url;
}

// Lucide icons, extracted from the app's own package so web chips carry exactly
// the app's symbols (TraitBadges.tsx). No emojis anywhere, per Cat's rule.
const LUCIDE_DIR = path.join(APP, 'node_modules', 'lucide-react-native', 'dist', 'esm', 'icons');
function lucideSvg(name) {
  const src = fs.readFileSync(path.join(LUCIDE_DIR, `${name}.mjs`), 'utf8');
  const parts = [];
  for (const el of src.matchAll(/\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]/g)) {
    const attrs = [];
    for (const a of el[2].matchAll(/(\w+):\s*(?:"([^"]*)"|(-?[\d.]+))/g)) {
      if (a[1] === 'key') continue;
      attrs.push(`${a[1]}="${a[2] !== undefined ? a[2] : a[3]}"`);
    }
    parts.push(`<${el[1]} ${attrs.join(' ')}/>`);
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${parts.join('')}</svg>`;
}
const ICONS = {};
for (const n of ['bug', 'paw-print', 'fish', 'cherry', 'flower-2', 'wheat', 'leaf', 'bone',
  'utensils', 'trees', 'tree-pine', 'shrub', 'sprout', 'droplets', 'waves-horizontal', 'sun',
  'mountain', 'building-2', 'egg', 'ruler', 'shield', 'star', 'map-pin', 'shell', 'spline',
  'weight', 'zoom-in', 'x', 'chevron-left', 'chevron-right', 'chevron-up']) ICONS[n] = lucideSvg(n);

// The app's trait chip mapping (TraitBadges.tsx), icon name + label per value.
const DIET_TRAIT = {
  invertebrates: ['bug', 'Invertebrates'], vertebrates: ['paw-print', 'Vertebrates'],
  fish: ['fish', 'Fish'], fruit: ['cherry', 'Fruit'], nectar: ['flower-2', 'Nectar'],
  seeds: ['wheat', 'Seeds'], plants: ['leaf', 'Plants'], scavenger: ['bone', 'Scavenger'],
  omnivore: ['utensils', 'Omnivore'],
};
// Habitat icons mirror the CARD's traitMaps exactly (card.layout.json):
// coastal wears the shell and riverine the spline, the collision fix the
// cards made — the site follows the cards, per Cat's consistency rule.
const HABITAT_TRAIT = {
  forest: ['trees', 'Forest'], woodland: ['tree-pine', 'Woodland'], shrubland: ['shrub', 'Shrubland'],
  grassland: ['sprout', 'Grassland'], wetland: ['droplets', 'Wetland'], coastal: ['shell', 'Coastal'],
  marine: ['waves-horizontal', 'Marine'], desert: ['sun', 'Desert'], rock: ['mountain', 'Rocky'],
  riverine: ['spline', 'Riverine'], human: ['building-2', 'Urban'],
};
const NEST_TRAIT = {
  cavity: 'Cavity nest', dome: 'Domed nest', cup: 'Cup nest', platform: 'Platform nest',
  burrow: 'Burrow', scrape: 'Scrape', ground: 'Ground nest',
};
const SIZE_TRAIT = { tiny: 'Tiny', small: 'Small', medium: 'Medium', large: 'Large', huge: 'Huge' };

// ---------------------------------------------------------------- slugs
const slugs = {};
const idBySlug = {};
for (const s of species) {
  const slug = slugify(s.name);
  if (idBySlug[slug]) {
    throw new Error(`slug collision: "${slug}" for ${s.id} and ${idBySlug[slug]}`);
  }
  idBySlug[slug] = s.id;
  slugs[s.id] = slug;
}
const byName = new Map(species.map((s) => [s.name, s]));

const famSlug = {};
const families = new Map(); // family common name -> species[]
const orders = new Map();
for (const s of species) {
  if (!families.has(s.family)) families.set(s.family, []);
  families.get(s.family).push(s);
  if (!orders.has(s.order)) orders.set(s.order, []);
  orders.get(s.order).push(s);
}
for (const f of families.keys()) famSlug[f] = slugify(f);
const orderSlug = {};
for (const o of orders.keys()) orderSlug[o] = slugify(o);

const countrySpecies = new Map(); // code -> species[]
for (const s of species) for (const c of s.regions) {
  if (!countrySpecies.has(c)) countrySpecies.set(c, []);
  countrySpecies.get(c).push(s);
}

// Browse buckets + park lists, shared by the /birds/ index and the data files.
const GROUPS = [...new Set(species.map(majorGroupOf))]
  .sort((a, b) => (FAMILY_SEQ.get(a) ?? 999) - (FAMILY_SEQ.get(b) ?? 999) || a.localeCompare(b));
const groupIdx = new Map(GROUPS.map((g, i) => [g, i]));
const TIERS = ['common', 'uncommon', 'rare', 'legendary'];
const knownIds = new Set(species.map((s) => s.id));
const parksByCountry = new Map(); // CC -> [{name, species: [ids]}]
for (const p of parksRaw) {
  if (!isRealPark(p.name)) continue;
  const ids = p.species.filter((id) => knownIds.has(id));
  if (ids.length < 5) continue;
  if (!parksByCountry.has(p.country)) parksByCountry.set(p.country, []);
  parksByCountry.get(p.country).push({ name: p.name, species: ids });
}
for (const list of parksByCountry.values()) list.sort((a, b) => a.name.localeCompare(b.name));

// First-photo thumbnail per species, used wherever a species is mentioned.
const thumbOf = (id) => thumbUrl(((photos.get(id) || [])[0] || {}).url);

// Public Supabase credentials (the same publishable pair the app ships) so the
// lightbox "Report this photo" button files into the photo_flags queue the
// weekly review already reads. Feature quietly disappears if .env is absent.
let SB = null;
try {
  const env = fs.readFileSync(path.join(APP, '.env'), 'utf8');
  const u = env.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m);
  const k = env.match(/^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m);
  if (u && k) SB = { url: u[1].trim(), key: k[1].trim() };
} catch { /* no env, no report button */ }
if (!SB) console.warn('! Supabase env missing: photo report buttons skipped');

// Checklist-only species (in AviList, dropped by the observation threshold):
// listed on family hubs with no page of their own, per decision D3.
const checklistOnly = new Map(); // family common name -> [{sci, name}]
try {
  const csv = fs.readFileSync(path.join(PIPELINE, '01_base.csv'), 'utf8').split('\n');
  const head = csv[0].split(',');
  const iSci = head.indexOf('scientific_name');
  const iName = head.indexOf('common_name');
  const iFam = head.indexOf('family_common');
  const have = new Set(species.map((s) => s.sci));
  for (const line of csv.slice(1)) {
    // Simple split is safe here: the four columns used carry no embedded commas.
    const cols = line.split(',');
    if (cols.length < head.length - 4) continue;
    const sci = cols[iSci];
    if (!sci || have.has(sci)) continue;
    const fam = cols[iFam];
    if (!families.has(fam)) continue;
    if (!checklistOnly.has(fam)) checklistOnly.set(fam, []);
    checklistOnly.get(fam).push({ sci, name: cols[iName] });
  }
} catch (e) {
  console.warn('! checklist-only pass skipped:', e.message);
}

// Confusion pairs -> compare pages (strategy §6, P3). Quality gate: both
// species carry photos AND an ID tip, so every page has something real to
// contrast. Ranked by the RARER bird's commonness (a pair is only searched
// when both birds are ones people meet) and capped, because URL count is the
// risk this layer carries.
// 9,062 pairs pass the quality gate; the cap keeps the deploy under Cloudflare
// Pages' 20,000-file limit with headroom for country pages and cards
// (12,224 files at cap 1,500; ~16,700 at 6,000). Raise further only after
// checking the file count.
const COMPARE_CAP = 6000;
const comparePairs = (() => {
  const seen = new Map(); // key -> [a, b] ordered by slug
  const gate = (s) => s && (photos.get(s.id) || []).length && detail.get(s.id)?.idTip;
  for (const s of species) {
    if (!gate(s)) continue;
    for (const n of s.confusion || []) {
      const c = byName.get(n);
      if (!gate(c) || c.id === s.id) continue;
      const [a, b] = [s, c].sort((x, y) => slugs[x.id].localeCompare(slugs[y.id]));
      seen.set(`${slugs[a.id]}|${slugs[b.id]}`, [a, b]);
    }
  }
  return [...seen.values()]
    .sort((p, q) => Math.min(q[0].commonness, q[1].commonness) - Math.min(p[0].commonness, p[1].commonness))
    .slice(0, COMPARE_CAP);
})();
const compareUrl = ([a, b]) => `/birds/compare/${slugs[a.id]}-vs-${slugs[b.id]}/`;
const compareBySpecies = new Map(); // species id -> [pair, pair]
for (const pair of comparePairs) {
  for (const s of pair) {
    if (!compareBySpecies.has(s.id)) compareBySpecies.set(s.id, []);
    compareBySpecies.get(s.id).push(pair);
  }
}

// ---------------------------------------------------------------- chrome
const CSS = `
@font-face{font-family:'Fredoka';font-weight:700;font-display:swap;src:url('/fonts/Fredoka-700.woff') format('woff')}
@font-face{font-family:'Fredoka';font-weight:600;font-display:swap;src:url('/fonts/Fredoka-600.woff') format('woff')}
@font-face{font-family:'Nunito';font-weight:400;font-display:swap;src:url('/fonts/Nunito-400.woff') format('woff')}
@font-face{font-family:'Nunito';font-weight:700;font-display:swap;src:url('/fonts/Nunito-700.woff') format('woff')}
:root{--bg:#F2E8CF;--surface:#fff;--surface-alt:#E7D9B4;--ink:#2E2A25;--muted:#6B6155;--border:#DDCBA0;--green:#386641;--green-dark:#2C5134;--sage:#6A994E;--gold:#EBB93C;--gold-deep:#8C6410;--display:'Fredoka','Trebuchet MS',system-ui,sans-serif;--body:'Nunito',system-ui,-apple-system,sans-serif;--shadow:0 14px 34px rgba(46,42,37,.09)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:var(--body);color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased}
[id]{scroll-margin-top:76px}
h1,h2,h3{font-family:var(--display);font-weight:700;line-height:1.14;margin:0}p{margin:0}a{color:var(--green)}
.wrap{max-width:920px;margin:0 auto;padding:0 22px}
header{position:fixed;top:0;left:0;right:0;z-index:30;background:transparent;border-bottom:1px solid transparent;transition:background .28s ease,border-color .28s ease}
header.scrolled{background:rgba(242,232,207,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.nav{display:flex;align-items:center;justify-content:space-between;height:80px}
.wordmark{font-family:var(--display);font-weight:700;color:#fff;letter-spacing:-.3px;text-decoration:none;font-size:24px;transition:color .28s ease}
header.scrolled .wordmark{color:var(--green)}
.nav-link{color:#fff;text-decoration:none;font-family:var(--display);font-weight:600;font-size:15px;margin-left:18px;white-space:nowrap;transition:color .28s ease}
header.scrolled .nav-link{color:var(--green)}
.lbl-short{display:none}
.btn{display:inline-block;font-family:var(--body);font-weight:800;font-size:15px;background:#fff;color:var(--green);text-decoration:none;padding:11px 20px;border-radius:999px;white-space:nowrap;transition:background .28s ease,color .28s ease;margin-left:18px}
header.scrolled .nav .btn{background:var(--green);color:#fff}
@media(max-width:760px){.nav .btn{font-size:13.5px;padding:9px 15px;margin-left:12px}}
@media(max-width:540px){.nav .btn{display:none}}
@media(max-width:600px){.nav{height:64px}.wordmark{font-size:20px}.nav-link{font-size:13px;margin-left:12px}.lbl-full{display:none}.lbl-short{display:inline}}
@media(max-width:430px){.nav{height:auto;flex-wrap:wrap;padding-top:9px;padding-bottom:7px;row-gap:2px}.nav nav{display:flex;flex-wrap:wrap;gap:4px 12px}.nav-link{margin-left:0}}
.phero{position:relative;margin:0;min-height:250px;display:flex;align-items:flex-end;overflow:hidden;background:linear-gradient(150deg,#2C5134,#386641)}
.hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:0;transition:opacity .9s ease}
.hero-video.ready{opacity:1}
.phero::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(30,45,30,.22) 0%,rgba(30,45,30,.42) 55%,rgba(22,36,24,.78) 100%)}
.phero-inner{position:relative;z-index:2;width:100%;padding-top:92px;padding-bottom:20px}
@media (prefers-reduced-motion: reduce){.hero-video{transition:none}}
.crumbs{font-size:13px;color:var(--muted);margin:18px 0 6px}.crumbs a{color:var(--muted)}
.phero .crumbs{color:rgba(255,255,255,.78);margin:0 0 6px}.phero .crumbs a{color:rgba(255,255,255,.78)}
.backlink{display:inline-flex;align-items:center;gap:5px;color:rgba(255,255,255,.85);text-decoration:none;font-family:var(--display);font-weight:600;font-size:13.5px;margin-bottom:10px}
.backlink:hover{color:#fff}
.backlink svg{width:15px;height:15px}
.totop{position:fixed;right:18px;bottom:18px;z-index:40;width:44px;height:44px;border-radius:50%;border:none;background:var(--green);color:#fff;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .25s ease}
.totop.show{opacity:1;pointer-events:auto}
.totop:hover{background:var(--green-dark)}
.totop svg{width:20px;height:20px}
h1{font-size:clamp(28px,4.5vw,40px);color:var(--green-dark)}
.phero h1{color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.35)}
.sci{font-style:italic;color:var(--muted);font-size:18px;margin-top:2px}
.phero .sci{color:#EFE7D2;text-shadow:0 1px 6px rgba(0,0,0,.35)}
main.wrap{padding-top:10px}
.camgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.camcard{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow)}
.camcard figcaption{padding:10px 14px;display:flex;flex-direction:column;gap:2px}
.camcard figcaption span{color:var(--muted);font-size:13px}
.camthumb{position:relative;display:block;width:100%;aspect-ratio:16/9;border:0;padding:0;cursor:pointer;background:#1e1b17}
.camthumb img{width:100%;height:100%;object-fit:cover;display:block}
.camplay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.camplay svg{width:52px;height:52px;fill:#fff;background:rgba(0,0,0,.55);border-radius:50%;padding:12px;transition:transform .15s}
.camthumb:hover .camplay svg{transform:scale(1.08)}
.cambadge{position:absolute;top:10px;left:10px;font:700 11px/1 var(--display);letter-spacing:.4px;color:#fff;padding:5px 8px;border-radius:6px}
.cambadge.live{background:#C0392B}
.cambadge.seasonal{background:rgba(0,0,0,.6)}
.camframe{aspect-ratio:16/9}
.camframe iframe{width:100%;height:100%;border:0;display:block}
.mcal{max-width:430px;margin-bottom:8px}
.mcal svg{width:100%;height:auto;display:block}
/* Card-style chip furniture: the IUCN disc and the habitat diamond, exactly
   as the collector card draws them. */
.sdisc{width:23px;height:23px;border-radius:50%;color:#fff;font-family:var(--display);font-weight:600;font-size:10px;display:inline-flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.92);flex:none}
.hdia{width:21px;height:21px;border-radius:5px;transform:rotate(45deg);display:inline-flex;align-items:center;justify-content:center;flex:none;margin:0 2px}
.hdia svg{transform:rotate(-45deg);width:12px;height:12px;color:#fff}
.lead{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 20px;margin:18px 0;box-shadow:var(--shadow);font-size:16.5px}
section{margin:36px 0}
main>section+section{border-top:1px solid var(--border);padding-top:30px}
main>section.cta{border-top:none;padding-top:32px}
main>section.banner{border-top:none;padding-top:0}
h2{font-size:22px;color:var(--green-dark);margin:0 0 14px}
.gallery{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}
.gallery figure{flex:0 0 min(86%,520px);scroll-snap-align:start;margin:0;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden}
.gallery img{width:100%;height:340px;object-fit:cover;display:block;background:var(--surface-alt)}
.gallery figcaption{font-size:12px;color:var(--muted);padding:7px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.capreport{background:none;border:none;color:var(--muted);font-family:var(--body);font-weight:700;font-size:11.5px;text-decoration:underline;cursor:pointer;padding:0;flex:none}
.capreport:hover{color:var(--green)}
.capreport[disabled]{text-decoration:none;cursor:default}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{font-weight:700;font-size:12.5px;border-radius:999px;padding:5px 13px;color:var(--gold-deep);background:var(--surface-alt)}
.chip.iucn{color:#fff;background:var(--sage)}.chip.iucn.threat{background:#B4562E}
.chip.tier{color:#fff;background:var(--green)}.chip.tier.legendary{background:var(--gold-deep)}
.audio-row{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:10px}
.audio-row audio{width:100%}.audio-row .cr{font-size:12px;color:var(--muted)}
.cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px 16px;font-size:15px}
.cols a{text-decoration:none}
.faq dt{font-family:var(--display);font-weight:600;color:var(--green-dark);margin-top:14px}
.faq dd{margin:4px 0 0}
.src{font-size:12.5px;color:var(--muted);margin-top:8px}
.linklist{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
.linklist a{display:flex;flex-direction:column;justify-content:center;min-height:66px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;text-decoration:none;color:var(--green-dark);font-weight:700;box-shadow:var(--shadow)}
.linklist .sub{display:block;font-weight:400;font-size:12.5px;color:var(--muted);font-style:italic}
.cta{background:linear-gradient(150deg,#2C5134,#386641);color:#fff;border-radius:20px;padding:28px 24px;margin:44px 0 36px;text-align:center;box-shadow:var(--shadow)}
.cta p{margin:8px auto 16px}
.cta h2{color:#fff}.cta p{color:rgba(255,255,255,.9);margin:8px auto 16px;max-width:560px}
.cta a{display:inline-block;background:var(--gold);color:#2E2A25;font-family:var(--display);font-weight:700;text-decoration:none;border-radius:999px;padding:12px 24px}
.banner{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin:18px 0;box-shadow:var(--shadow)}
.banner video{width:100%;max-height:480px;display:block;background:#1F281F}
.banner .cr{font-size:12px;color:var(--muted);padding:7px 14px}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}
@media(max-width:640px){.vs{grid-template-columns:1fr}}
.vs .side{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}
.vs .side img{width:100%;height:260px;object-fit:cover;display:block;background:var(--surface-alt)}
.vs .side .inner{padding:14px 16px}
.vs .side h2{font-size:19px;margin:0}
.vs .side h2 a{text-decoration:none;color:var(--green-dark)}
.vs .side .sci{font-size:14px;margin:0 0 8px}
.vs .side .tip{font-size:14.5px;margin-top:10px}
.vs .side .cr{font-size:11.5px;color:var(--muted);padding:5px 16px 0;margin:0 -16px;border-top:1px dashed var(--border)}
footer{position:relative;overflow:hidden;background:#1F281F;color:#fff;padding:92px 0;margin-top:44px}
footer.plain{padding:40px 0}
footer.plain::after{content:none}
footer .bg-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
footer::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(15,20,15,.16) 0%,rgba(15,20,15,.55) 100%)}
.foot{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;text-shadow:0 1px 6px rgba(0,0,0,.45)}
.foot .wordmark{color:#fff}.foot nav a{color:#EAF1E4;text-decoration:none;margin-left:22px;font-weight:700}
.foot .copy{color:#E3ECDD;font-size:13px;width:100%}
.note{font-size:13.5px;color:var(--muted)}
.chip{display:inline-flex;align-items:center;gap:6px}
.chip svg{width:15px;height:15px;flex:none}
.linklist a.pic{flex-direction:row;align-items:center;justify-content:flex-start;gap:11px}
.linklist .th{width:46px;height:46px;border-radius:10px;object-fit:cover;background:var(--surface-alt);flex:none}
.linklist .txt{min-width:0}
.tipbox{background:#EEF3E8;border-left:3px solid var(--green);border-radius:12px;padding:14px 16px}
.jumpnav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}
.jumpnav a{font-family:var(--display);font-weight:600;font-size:12.5px;color:var(--green);background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:5px 12px;text-decoration:none}
.jumpnav a:hover{background:var(--surface-alt)}
.confgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.confcard{display:block;background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;text-decoration:none;box-shadow:var(--shadow);transition:transform .12s ease,box-shadow .12s ease}
.confcard:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(46,42,37,.14)}
.confcard img{width:100%;height:210px;object-fit:cover;display:block;background:var(--surface-alt)}
.confcard .inner{display:block;padding:12px 14px 14px}
.confcard b{display:block;font-family:var(--display);font-weight:600;font-size:17px;color:var(--green-dark)}
.confcard i{display:block;font-size:13.5px;color:var(--muted);margin-bottom:6px}
.confcard .tip{display:block;font-size:14px;color:var(--muted);line-height:1.5}
.rangemap{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:10px;box-shadow:var(--shadow)}
.rangemap svg{width:100%;height:auto;display:block}
/* Range map wears the card's own map palette: quiet stone continents with a
   near-black hairline, charcoal range fill — the same read as the card band. */
.mp{fill:${CARD.layout.palette.mapBase};stroke:${CARD.layout.palette.mapOnStroke};stroke-width:.3}
.mp.in{fill:${CARD.layout.palette.mapOn};stroke:${CARD.layout.palette.mapOnStroke};stroke-width:.6}
.mp.vg{fill:#8A8880}
.maplegend{font-size:12.5px;color:var(--muted);display:flex;gap:16px;padding:8px 4px 0;margin-bottom:12px}
.maplegend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.gallery figure{position:relative;cursor:zoom-in}
.zoomtag{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:50%;background:rgba(31,40,31,.55);color:#fff;display:flex;align-items:center;justify-content:center;pointer-events:none}
.zoomtag svg{width:17px;height:17px}
.lb{position:fixed;inset:0;z-index:60;background:rgba(20,26,20,.92);display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px}
.lb.open{display:flex}
.lb .iwrap{overflow:auto;max-width:94vw;max-height:76vh;border-radius:10px;-webkit-overflow-scrolling:touch}
.lb img{display:block;max-width:94vw;max-height:76vh;cursor:zoom-in}
.lb.zoomed img{max-width:none;max-height:none;cursor:zoom-out}
.lb .cap{color:#EAF1E4;font-size:13px;margin-top:12px;text-align:center;max-width:82ch}
.lbbtn{position:fixed;z-index:61;background:rgba(255,255,255,.14);border:none;color:#fff;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
.lbbtn svg{width:22px;height:22px}
.lbbtn:hover{background:rgba(255,255,255,.26)}
.lbreport{margin-top:10px;background:transparent;border:1px solid rgba(255,255,255,.4);color:#EAF1E4;border-radius:999px;padding:7px 16px;font-family:var(--body);font-weight:700;font-size:12.5px;cursor:pointer}
.lbreport:hover{background:rgba(255,255,255,.12)}
.lbreport[disabled]{opacity:.7;cursor:default}
.lb .x{top:16px;right:16px}
.lb .pv{left:12px;top:50%;transform:translateY(-50%)}
.lb .nx{right:12px;top:50%;transform:translateY(-50%)}
@media(max-width:600px){.lb .pv,.lb .nx{top:auto;bottom:14px;transform:none}.lb .pv{left:14px}.lb .nx{right:14px}}
@font-face{font-family:'Fredoka';font-weight:500;font-display:swap;src:url('/fonts/Fredoka-500.woff') format('woff')}
@font-face{font-family:'Nunito';font-weight:800;font-display:swap;src:url('/fonts/Nunito-800.woff') format('woff')}
@font-face{font-family:'Dancing Script';font-weight:500 700;font-display:swap;src:url('/fonts/DancingScript.ttf') format('truetype')}
/* Species cards: real-card presence — paper shadow at rest, lift on hover. */
.scard{display:block;line-height:0}
.scard svg{width:100%;height:auto;border-radius:12px;filter:drop-shadow(0 1px 2px rgba(46,42,37,.18)) drop-shadow(0 6px 14px rgba(46,42,37,.16))}
a.scard{text-decoration:none;transition:transform .18s ease}
@media(hover:hover){
a.scard:hover{transform:translateY(-6px) scale(1.045)}
a.scard:hover svg{filter:drop-shadow(0 2px 3px rgba(46,42,37,.2)) drop-shadow(0 16px 30px rgba(46,42,37,.28))}
}
a.scard:focus-visible{outline:3px solid var(--gold);outline-offset:4px;border-radius:12px;transform:translateY(-6px) scale(1.045)}
@media (prefers-reduced-motion: reduce){a.scard,a.scard:hover{transform:none;transition:none}}
/* The card tucked in the species-page hero, with its magnifier. */
.pherorow{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
.pherotext{min-width:0}
.herocard{position:relative;flex:0 0 clamp(132px,22vw,216px);margin-bottom:-2px;cursor:zoom-in;border:none;background:none;padding:0}
.herocard svg{width:100%;height:auto;border-radius:10px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.28)) drop-shadow(0 12px 26px rgba(0,0,0,.3))}
.cardmag{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:none;background:rgba(31,40,31,.55);color:#fff;display:flex;align-items:center;justify-content:center;cursor:zoom-in;pointer-events:none}
.cardmag svg{width:16px;height:16px}
.statusline{font-family:var(--display);font-weight:600;font-size:13.5px;color:rgba(255,255,255,.92);margin-top:8px;text-shadow:0 1px 6px rgba(0,0,0,.35)}
/* Status-coloured heroes keep the colour honest: a whisper of depth, not the
   video hero's heavy gradient. DD is the one light band and takes dark ink. */
.phero.flat::after{background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.16) 100%)}
.phero.dark-ink h1,.phero.dark-ink .statusline{color:#2E2A25;text-shadow:none}
.phero.dark-ink .sci{color:#4A463F;text-shadow:none}
.phero.dark-ink .backlink{color:rgba(46,42,37,.78)}
.phero.dark-ink .backlink:hover{color:#2E2A25}
/* Card lightbox: the same dialog pattern as the photo viewer. */
.cardlb{position:fixed;inset:0;z-index:70;background:rgba(20,26,20,.92);display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px;cursor:zoom-out}
.cardlb.open{display:flex}
.cardlb .cwrap{width:min(92vw,54vh);cursor:default}
.cardlb .cwrap svg{width:100%;height:auto;border-radius:14px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4)) drop-shadow(0 24px 60px rgba(0,0,0,.45))}
.cardlb .cap{color:#EAF1E4;font-size:13px;margin-top:14px;text-align:center;max-width:70ch}
.cardlb .x{top:16px;right:16px}
@media(max-width:640px){
.pherorow{align-items:flex-end}
.herocard{flex-basis:clamp(112px,30vw,150px)}
.cardlb .cwrap{width:min(92vw,60vh)}
}
`.trim();

function page({ title, desc, canonical, body, jsonld, noindex, ogImage, heroHtml, noChromeVideo, heroStyle, heroClass }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonical}" />
<link rel="icon" href="/assets/favicon.png" />
${noindex ? '<meta name="robots" content="noindex,follow" />\n' : ''}<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${canonical}" />
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}" />\n` : ''}<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ''}</head>
<body>
<header><div class="wrap nav">
  <a class="wordmark" href="/">BeakBrain</a>
  <nav><a class="nav-link" href="/birds/">Bird Guide</a><a class="nav-link" href="/daily/">Daily Bird</a><a class="nav-link" href="/cams/">Cams</a><a class="nav-link" href="/community.html">Community</a><a class="btn nav-cta" href="${CTA_HREF}">${CTA_LABEL}</a></nav>
</div></header>
<section class="phero${heroClass ? ` ${heroClass}` : ''}"${heroStyle ? ` style="${heroStyle}"` : ''}>
${noChromeVideo ? '' : `  <video class="hero-video" id="pheroVideo" autoplay muted loop playsinline preload="auto" poster="/assets/video/species-hero-poster.jpg" aria-label="White storks on their nest">
    <source src="/assets/video/species-hero.mp4" type="video/mp4" />
  </video>`}
  <div class="wrap phero-inner">
${heroHtml || ''}
  </div>
</section>
<main class="wrap">
${body}
</main>
<footer>
${noChromeVideo ? `  <video class="bg-video" muted loop playsinline preload="none" poster="/assets/video/hero-poster.jpg" aria-label="Wild birds in their habitat">
    <source data-src="/assets/video/hero.mp4" type="video/mp4" />
  </video>` : `  <video class="bg-video" muted loop playsinline preload="none" poster="/assets/video/site-footer-poster.jpg" aria-label="A weaver at its hanging nest">
    <source data-src="/assets/video/site-footer.mp4" type="video/mp4" />
  </video>`}
  <div class="wrap foot">
  <span class="wordmark">BeakBrain</span>
  <nav><a href="/">Home</a><a href="/birds/">Birds</a><a href="/contribute.html">Contribute</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></nav>
  <div class="copy">Greet every bird by name. &copy; 2026 BeakBrain. Species data updated ${buildDate}.</div>
</div></footer>
<button class="totop" id="totop" aria-label="Back to top">${ICONS['chevron-up']}</button>
<script>
(function(){
var v=document.getElementById('pheroVideo');
if(v){var mk=function(){v.classList.add('ready')};if(v.readyState>=2)mk();else v.addEventListener('loadeddata',mk)}
var bk=document.querySelector('.backlink');
if(bk)bk.addEventListener('click',function(e){
if(history.length>1&&document.referrer&&document.referrer.indexOf(location.origin)===0){e.preventDefault();history.back()}
});
var hdr=document.querySelector('header');
var tt=document.getElementById('totop');
var onS=function(){hdr.classList.toggle('scrolled',window.scrollY>40);if(tt)tt.classList.toggle('show',window.scrollY>900)};
window.addEventListener('scroll',onS,{passive:true});onS();
if(tt)tt.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});
var fv=document.querySelector('footer .bg-video');
if(fv&&'IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  var io=new IntersectionObserver(function(en){
    if(en[0].isIntersecting){
      var sc=fv.querySelector('source');fv.src=sc.getAttribute('data-src');fv.play().catch(function(){});
      io.disconnect();
    }
  },{rootMargin:'200px'});
  io.observe(fv);
}
})();
</script>
</body>
</html>`;
}

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((c, i) => (c.href && i < items.length - 1 ? `<a href="${c.href}">${esc(c.name)}</a>` : esc(c.name)))
    .join(' › ')}</nav>`;
}
function breadcrumbLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name,
      ...(c.href ? { item: ORIGIN + c.href } : {}),
    })),
  };
}

// ---------------------------------------------------------------- species page
function answerBlock(s, d) {
  const parts = [];
  const fam = s.family.replace(/e?s( and Allies)?$/i, '').toLowerCase();
  const where = s.regions.length === 1
    ? `found only in ${theName(COUNTRY[s.regions[0]] || s.regions[0])}`
    : `found in ${s.regions.length} countries`;
  const size = s.traits?.massG ? `, weighing about ${massLabel(s.traits.massG)}` : '';
  parts.push(`The ${s.name} (${s.sci}) is a ${fam} ${where}${size}.`);
  const first = firstSentence(d?.description);
  if (first) parts.push(first);
  return parts.join(' ');
}

function speciesPage(s) {
  const d = detail.get(s.id);
  const imgs = photos.get(s.id) || [];
  const slug = slugs[s.id];
  const url = `/birds/${slug}/`;
  const canonical = ORIGIN + url;
  const tier = rarity(s);
  const noindex = imgs.length === 0 && (!s.audio || s.audio.length === 0);
  const crumbItems = [
    { name: 'Home', href: '/' }, { name: 'Birds', href: '/birds/' },
    { name: s.order, href: `/birds/order/${orderSlug[s.order]}/` },
    { name: s.family, href: `/birds/family/${famSlug[s.family]}/` },
    { name: s.name },
  ];
  const answer = answerBlock(s, d);
  const residents = s.regions.filter((c) => !(s.vagrantRegions || []).includes(c));
  const vagrants = (s.vagrantRegions || []).filter((c) => s.regions.includes(c));

  const video = (videos[s.id] || [])[0];
  const banner = video ? `
<section class="banner" aria-label="Video">
<video controls muted autoplay loop playsinline preload="metadata"${video.poster ? ` poster="${esc(video.poster)}"` : ''} src="${esc(video.url)}"></video>
<div class="cr">Video: ${esc(video.credit)} · ${video.licenceUrl ? `<a href="${esc(video.licenceUrl)}" rel="license nofollow">${esc(video.licence)}</a>` : esc(video.licence)} · via <a href="${esc(video.source)}" rel="nofollow">Wikimedia Commons</a></div>
</section>` : '';

  const gallery = imgs.length ? `
<section id="photos" aria-label="Photos">
<div class="gallery">
${imgs.map((im, i) => `<figure data-full="${esc(largeUrl(im.url))}" data-orig="${esc(im.url)}" data-cap="Photo: ${esc(im.credit || 'unknown')} · ${esc(licDisplay(im.license))}"><img src="${esc(im.url)}" alt="${esc(s.name)} (${esc(s.sci)}), photo ${i + 1}" ${i ? 'loading="lazy" ' : ''}width="520" height="340" /><span class="zoomtag">${ICONS['zoom-in']}</span><figcaption>Photo: ${esc(im.credit || 'unknown')} · ${esc(licDisplay(im.license))}${SB ? `<button class="capreport" type="button" data-orig="${esc(im.url)}">Report</button>` : ''}</figcaption></figure>`).join('\n')}
</div>
</section>` : '';

  const audioSec = s.audio?.length ? `
<section id="sound">
<h2>What the ${esc(s.name)} sounds like</h2>
${s.audio.map((a) => `<div class="audio-row"><audio controls preload="none" src="${esc(a.url)}"></audio><div class="cr">Recording: ${esc(a.credit || 'unknown')} · <a href="${esc(a.license)}" rel="license nofollow">${esc(licenceLabel(a.license))}</a> · via <a href="${esc(a.url.replace('/download', ''))}" rel="nofollow">xeno-canto</a></div></div>`).join('\n')}
</section>` : '';

  const aboutSec = d?.description ? `
<section id="about">
<h2>About the ${esc(s.name)}</h2>
<p>${esc(d.description)}</p>
<p class="src">Text adapted from <a href="${esc(d.descriptionSource)}" rel="nofollow">Wikipedia</a>, licensed ${esc(d.descriptionLicense || 'CC BY-SA')}.</p>
</section>` : '';

  const tipSec = d?.idTip ? `
<section id="id">
<h2>ID tip</h2>
<div class="tipbox"><p>${esc(d.idTip)}</p></div>
${d.descriptionSource ? `<p class="src">Text from <a href="${esc(d.descriptionSource)}" rel="nofollow">Wikipedia</a>, licensed ${esc(d.descriptionLicense || 'CC BY-SA')}.</p>` : ''}
</section>` : '';

  const whereSec = residents.length ? `
<section id="where">
<h2>Where to see the ${esc(s.name)}</h2>
<div class="rangemap" data-cc="${residents.join(' ')}"${vagrants.length ? ` data-vg="${vagrants.join(' ')}"` : ''} aria-label="Range map of the ${esc(s.name)}"></div>
<div class="maplegend"><span><i style="background:${CARD.layout.palette.mapOn}"></i>Regular range</span>${vagrants.length ? '<span><i style="background:#8A8880"></i>Rare visitor</span>' : ''}</div>
<div class="cols">
${residents.map((c) => `<a href="/birds/country/${c.toLowerCase()}/">${esc(COUNTRY[c] || c)}</a>`).join('\n')}
</div>
${vagrants.length ? `<p class="note" style="margin-top:10px">Recorded as a rare visitor in ${vagrants.map((c) => `<a href="/birds/country/${c.toLowerCase()}/">${esc(COUNTRY[c] || c)}</a>`).join(', ')}.</p>` : ''}
</section>
<script src="/assets/worldmap.js?v=2" defer></script>` : '';

  const whenSec = s.months?.length ? `
<section id="when">
<h2>When to see the ${esc(s.name)}</h2>
<div class="mcal" role="img" aria-label="${s.months.length === 12 ? 'Present all year round' : `Present in ${esc(monthRange(s.months))}`}${s.peakMonth ? `, peak in ${MONTHS[s.peakMonth - 1]}` : ''}">
${calendarSvg(s)}
</div>
<p class="note">${[s.peakMonth ? `Peak activity in ${MONTHS[s.peakMonth - 1]}` : '', s.seasonTag ? `${s.seasonTag === 'resident' ? 'a resident species' : `a ${esc(s.seasonTag)} species`} across most of its range` : ''].filter(Boolean).join(' \u00b7 ') || (s.months.length === 12 ? 'Seen all year round.' : `Best months: ${esc(monthRange(s.months))}.`)}</p>
</section>` : '';

  const spCams = camsBySlug.get(slug) || [];
  // Embedded players, the same click-to-play pattern as /cams/: a thumbnail
  // until clicked, then a youtube-nocookie iframe in place. Cams that cannot
  // be embedded (external hosts with no channel id) keep the link-out.
  const camsSec = spCams.length ? `
<section id="cams">
<h2>Watch the ${esc(s.name)} on live cams</h2>
<div class="camgrid">
${spCams.map((cam) => {
    const isYT = cam.watch?.type === 'youtube';
    const emb = isYT ? `${esc(cam.watch.videoId)}?autoplay=1&rel=0`
      : (camChannels[cam.id] ? `live_stream?channel=${esc(camChannels[cam.id])}&autoplay=1&rel=0` : null);
    const still = isYT
      ? `https://i.ytimg.com/vi/${esc(cam.watch.videoId)}/hqdefault.jpg`
      : (fs.existsSync(path.join(__dirname, '..', '..', 'assets', 'cams', `${cam.id}.jpg`)) ? `/assets/cams/${esc(cam.id)}.jpg` : null);
    const badge = cam.status === 'live' ? '<span class="cambadge live">LIVE</span>'
      : `<span class="cambadge seasonal">${esc(cam.returns ? 'RETURNS ' + cam.returns.toUpperCase() : 'SEASONAL')}</span>`;
    const media = emb
      ? `<button class="camthumb" type="button" data-camembed="${emb}" aria-label="Play ${esc(cam.name)}">${still ? `<img src="${still}" alt="${esc(cam.name)} stream preview" loading="lazy">` : ''}${badge}<span class="camplay"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></button>`
      : `<a class="camthumb" href="${esc(cam.watch?.url || '/cams/#cam-' + cam.id)}" target="_blank" rel="noopener" aria-label="Watch ${esc(cam.name)}">${still ? `<img src="${still}" alt="${esc(cam.name)} stream preview" loading="lazy">` : ''}${badge}<span class="camplay"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></a>`;
    return `<figure class="camcard">${media}<figcaption><b>${esc(cam.name)}</b><span>${esc(cam.location)} · ${esc(cam.host)}</span></figcaption></figure>`;
  }).join('\n')}
</div>
<p class="note" style="margin-top:10px"><a href="/cams/">Browse all ${camsTotal} bird cams worldwide</a>, live and seasonal, by region and species.</p>
</section>
<script>document.addEventListener('click',function(e){var b=e.target.closest('.camthumb[data-camembed]');if(!b)return;var src='https://www.youtube-nocookie.com/embed/'+b.getAttribute('data-camembed');var f=document.createElement('iframe');f.src=src;f.title=b.getAttribute('aria-label');f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');f.setAttribute('allowfullscreen','');f.setAttribute('referrerpolicy','strict-origin-when-cross-origin');var w=document.createElement('div');w.className='camframe';w.appendChild(f);b.replaceWith(w);});</script>` : '';

  const confusion = (s.confusion || []).map((n) => byName.get(n)).filter(Boolean);
  const myPairs = compareBySpecies.get(s.id) || [];
  const confSec = confusion.length ? `
<section id="similar">
<h2>Easily confused with</h2>
<div class="confgrid">
${confusion.map((c) => {
    const cd = detail.get(c.id);
    const tip = cd?.idTip ? firstSentence(cd.idTip) : (cd?.description ? firstSentence(cd.description) : '');
    const corig = ((photos.get(c.id) || [])[0] || {}).url;
    const cimg = cardUrl(corig);
    return `<a class="confcard" href="/birds/${slugs[c.id]}/">
${cimg ? `<img src="${esc(cimg)}" alt="${esc(c.name)} (${esc(c.sci)})" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${esc(corig)}'" />` : ''}
<span class="inner"><b>${esc(c.name)}</b><i>${esc(c.sci)}</i>${tip ? `<span class="tip">${esc(tip)}</span>` : ''}</span>
</a>`;
  }).join('\n')}
</div>
${myPairs.length ? `<p class="note" style="margin-top:10px">Side by side: ${myPairs.map((pr) => `<a href="${compareUrl(pr)}">${esc(pr[0].name)} vs ${esc(pr[1].name)}</a>`).join(' · ')}</p>` : ''}
</section>` : '';

  const traits = s.traits || {};
  const dietT = DIET_TRAIT[traits.diet];
  const habT = HABITAT_TRAIT[traits.habitat];
  const sizeBits = [SIZE_TRAIT[traits.size], traits.massG ? massLabel(traits.massG) : ''].filter(Boolean).join(' \u00b7 ');
  const stColor = STATUS_COLORS[s.iucn] || STATUS_COLORS.NE;
  // Chips wear the card's own furniture: the IUCN status disc with its
  // two-letter code, the coloured habitat diamond, and the card's exact
  // glyphs for diet, nest and size.
  const chips = [
    s.iucn && IUCN[s.iucn] ? `<span class="chip"><span class="sdisc" style="background:${stColor}${s.iucn === 'DD' ? ';color:#2E2A25' : ''}">${s.iucn}</span>${IUCN[s.iucn]}</span>` : '',
    s.regions.length === 1 ? `<span class="chip">${ICONS['map-pin']}Endemic</span>` : '',
    dietT ? `<span class="chip">${ICONS[dietT[0]]}${dietT[1]}</span>` : '',
    habT ? `<span class="chip"><span class="hdia" style="background:${CARD.layout.habitatColors[traits.habitat] || '#6A994E'}">${ICONS[habT[0]]}</span>${habT[1]}</span>` : '',
    NEST_TRAIT[traits.nest] ? `<span class="chip">${ICONS.egg}${NEST_TRAIT[traits.nest]}</span>` : '',
    sizeBits ? `<span class="chip">${ICONS[traits.massG ? 'weight' : 'ruler']}${sizeBits}</span>` : '',
  ].filter(Boolean).join('');

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: `${s.name} (${s.sci})`,
        description: answer,
        datePublished: buildDate,
        dateModified: buildDate,
        mainEntityOfPage: canonical,
        author: { '@type': 'Organization', name: 'BeakBrain', url: ORIGIN },
        publisher: { '@type': 'Organization', name: 'BeakBrain', url: ORIGIN },
        about: {
          '@type': 'Taxon',
          name: s.name,
          scientificName: s.sci,
          taxonRank: 'species',
          parentTaxon: { '@type': 'Taxon', name: s.family, taxonRank: 'family' },
        },
        ...(imgs.length ? {
          image: {
            '@type': 'ImageObject', contentUrl: imgs[0].url,
            ...(licUrl(imgs[0].license) ? { license: licUrl(imgs[0].license) } : {}),
            creditText: imgs[0].credit || 'Unknown',
            creator: { '@type': 'Person', name: imgs[0].credit || 'Unknown' },
            copyrightNotice: imgs[0].credit || 'Unknown',
            acquireLicensePage: canonical,
          },
        } : {}),
      },
      breadcrumbLd(crumbItems),
      ...(video ? [{
        '@type': 'VideoObject', contentUrl: video.url,
        ...(video.poster ? { thumbnailUrl: video.poster } : {}),
        name: `${s.name} in the wild`,
        description: `Video of ${aAn(s.name)} ${s.name} (${s.sci}).`,
        ...(licUrl(video.licenceUrl || video.licence) ? { license: licUrl(video.licenceUrl || video.licence) } : {}),
        creditText: video.credit || 'Unknown',
        creator: { '@type': 'Person', name: video.credit || 'Unknown' },
        copyrightNotice: video.credit || 'Unknown',
        uploadDate: buildDate,
        ...(video.duration ? { duration: `PT${video.duration}S` } : {}),
      }] : []),
      ...(s.audio || []).map((a) => ({
        '@type': 'AudioObject', contentUrl: a.url,
        ...(licUrl(a.license) ? { license: licUrl(a.license) } : {}),
        creditText: a.credit || 'Unknown',
        creator: { '@type': 'Person', name: a.credit || 'Unknown' },
        copyrightNotice: a.credit || 'Unknown',
        name: `${s.name} call`,
      })),
    ],
  };

  const title = `${s.name} (${s.sci}) | Photos, Calls and ID | BeakBrain`;
  const desc = (answer.length > 155 ? answer.slice(0, 152).replace(/\s+\S*$/, '') + '…' : answer);

  // The hero wears the species' conservation-status colour — the same colour
  // its card's band and disc wear — with the card itself tucked into the right
  // corner. DD is the one light band; it takes dark ink instead of white.
  const heroCard = cardSvg(s, 300);
  const heroDark = s.iucn === 'DD';
  const heroStyle = `background:linear-gradient(150deg,${shade(stColor, -0.22)},${stColor})`;
  const heroHtml = `<div class="pherorow">
<div class="pherotext">
<a class="backlink" href="/birds/">${ICONS['chevron-left']}Bird Guide</a>
<h1>${esc(s.name)}</h1>
<p class="sci">${esc(s.sci)}</p>
${s.iucn && IUCN[s.iucn] ? `<p class="statusline">${esc(IUCN[s.iucn])} · IUCN Red List</p>` : ''}
</div>
<button class="herocard" id="herocard" type="button" aria-label="View the ${esc(s.name)} collector card larger" aria-haspopup="dialog">${heroCard}<span class="cardmag">${ICONS['zoom-in']}</span></button>
</div>`;
  const jumps = [
    imgs.length ? ['photos', 'Photos'] : null,
    audioSec ? ['sound', 'Sound'] : null,
    aboutSec ? ['about', 'About'] : null,
    whenSec ? ['when', 'When'] : null,
    whereSec ? ['where', 'Where'] : null,
    tipSec ? ['id', 'ID tip'] : null,
    confSec ? ['similar', 'Lookalikes'] : null,
    camsSec ? ['cams', 'Cams'] : null,
  ].filter(Boolean);
  const body = `
<script src="/birds/assets/cardmap.js" defer></script>
<div class="cardlb" id="cardlb" role="dialog" aria-modal="true" aria-label="${esc(s.name)} collector card">
<button class="lbbtn x" id="cardlbx" aria-label="Close card view">${ICONS.x}</button>
<div class="cwrap">${heroCard}</div>
<div class="cap">The ${esc(s.name)} collector card. Master this bird in the BeakBrain app to add it to your collection.</div>
</div>
<script>
(function(){
var hc=document.getElementById('herocard'),lb=document.getElementById('cardlb');
if(!hc||!lb)return;
function open(){lb.classList.add('open');document.body.style.overflow='hidden';document.getElementById('cardlbx').focus()}
function close(){lb.classList.remove('open');document.body.style.overflow='';hc.focus()}
hc.addEventListener('click',open);
document.getElementById('cardlbx').addEventListener('click',close);
lb.addEventListener('click',function(e){if(!e.target.closest('.cwrap'))close()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&lb.classList.contains('open'))close()});
})();
</script>
<div class="chips" style="margin-top:16px">${chips}</div>
${jumps.length > 2 ? `<nav class="jumpnav" aria-label="On this page">${jumps.map(([jid, jl]) => `<a href="#${jid}">${jl}</a>`).join('')}</nav>` : ''}
${banner}
${gallery}
${audioSec}
${aboutSec}
${whenSec}
${whereSec}
${tipSec}
${confSec}
${camsSec}
<section class="cta">
<h2>Learn the ${esc(s.name)} in the BeakBrain App</h2>
<p>Photo and call practice. Coming soon to iPhone and Android.</p>
<a href="${CTA_HREF}">${CTA_LABEL}</a>
</section>
<p class="note">Every photo and recording on this page is credited to its author under the licence shown. Spotted a problem with this page, or have a better photo? <a href="/contribute.html">Contribute</a>.</p>
${imgs.length ? `<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="Photo viewer">
<button class="lbbtn x" id="lbx" aria-label="Close">${ICONS.x}</button>
${imgs.length > 1 ? `<button class="lbbtn pv" id="lbp" aria-label="Previous photo">${ICONS['chevron-left']}</button>
<button class="lbbtn nx" id="lbn" aria-label="Next photo">${ICONS['chevron-right']}</button>` : ''}
<div class="iwrap"><img id="lbimg" alt="" /></div>
<div class="cap" id="lbcap"></div>
${SB ? '<button class="lbreport" id="lbrep" type="button">Report this photo</button>' : ''}
</div>
<script>
(function(){
var figs=[].slice.call(document.querySelectorAll('.gallery figure'));
var lb=document.getElementById('lb'),im=document.getElementById('lbimg'),cap=document.getElementById('lbcap');
var p=document.getElementById('lbp'),n=document.getElementById('lbn'),cur=0;
var rep=document.getElementById('lbrep');
function show(i){cur=(i+figs.length)%figs.length;var f=figs[cur];lb.classList.remove('zoomed');
im.onerror=function(){this.onerror=null;this.src=f.getAttribute('data-orig')};
im.src=f.getAttribute('data-full');im.alt=f.querySelector('img').alt;
cap.textContent=f.getAttribute('data-cap');
if(rep){rep.disabled=false;rep.textContent='Report this photo'}
lb.classList.add('open');document.body.style.overflow='hidden'}
function close(){lb.classList.remove('open');document.body.style.overflow=''}
figs.forEach(function(f,i){f.setAttribute('tabindex','0');f.setAttribute('role','button');f.setAttribute('aria-label','View larger photo');
f.addEventListener('click',function(){show(i)});
f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();show(i)}})});
im.addEventListener('click',function(){lb.classList.toggle('zoomed')});
document.getElementById('lbx').addEventListener('click',close);
if(p)p.addEventListener('click',function(){show(cur-1)});
if(n)n.addEventListener('click',function(){show(cur+1)});
lb.addEventListener('click',function(e){if(e.target===lb)close()});
document.addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;
if(e.key==='Escape')close();else if(e.key==='ArrowLeft'&&p)show(cur-1);else if(e.key==='ArrowRight'&&n)show(cur+1)});
${SB ? `function sendFlag(url,done){
fetch(${JSON.stringify(SB.url)}+'/rest/v1/photo_flags',{method:'POST',headers:{'Content-Type':'application/json',apikey:${JSON.stringify(SB.key)},Authorization:'Bearer '+${JSON.stringify(SB.key)},Prefer:'return=minimal'},
body:JSON.stringify({user_id:null,species_id:${JSON.stringify(s.id)},species_name:${JSON.stringify(s.name)},image_url:url,created_at:new Date().toISOString()})})
.then(function(r){done(r.ok)}).catch(function(){done(false)});
}
if(rep)rep.addEventListener('click',function(){
rep.disabled=true;rep.textContent='Sending\\u2026';
sendFlag(figs[cur].getAttribute('data-orig'),function(ok){
rep.textContent=ok?'Thanks, we will review it':'Could not send, try the app';
if(ok&&figs.length>1)setTimeout(function(){if(lb.classList.contains('open'))show(cur+1)},900);
});
});
[].slice.call(document.querySelectorAll('.capreport')).forEach(function(b){
b.addEventListener('click',function(e){
e.stopPropagation();
b.disabled=true;b.textContent='Sending\\u2026';
sendFlag(b.getAttribute('data-orig'),function(ok){b.textContent=ok?'Thanks, reported':'Could not send'});
});
});` : ''}
})();
</script>` : ''}
`;
  return { html: page({ title, desc, canonical, body, jsonld, noindex, ogImage: imgs[0]?.url, heroHtml, noChromeVideo: true, heroStyle, heroClass: `flat${heroDark ? ' dark-ink' : ''}` }), noindex };
}

// ---------------------------------------------------------------- hubs
function hubPage({ title, h1, desc, url, intro, groups, crumbItems }) {
  const heroHtml = `<a class="backlink" href="/birds/">${ICONS['chevron-left']}Bird Guide</a>
<h1>${esc(h1)}</h1>`;
  const body = `
<p class="lead">${esc(intro)}</p>
${groups.map((g) => `
<section>
${g.h2 ? `<h2>${esc(g.h2)}</h2>` : ''}
${g.note ? `<p class="note">${esc(g.note)}</p>` : ''}
<ul class="linklist">
${g.items.map((it) => `<li><a${it.thumb ? ' class="pic"' : ''} href="${it.href}">${it.thumb ? `<img class="th" src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async" />` : ''}<span class="txt">${esc(it.name)}${it.sub ? `<span class="sub">${esc(it.sub)}</span>` : ''}</span></a></li>`).join('\n')}
</ul>
${g.tail || ''}
</section>`).join('\n')}
`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [breadcrumbLd(crumbItems)] };
  return page({ title, desc, canonical: ORIGIN + url, body, jsonld, heroHtml });
}

// ---------------------------------------------------------------- write
let written = 0;
function write(rel, html) {
  const file = path.join(OUTROOT, rel, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written++;
}

fs.rmSync(OUTROOT, { recursive: true, force: true });
fs.mkdirSync(OUTROOT, { recursive: true });

// species pages
let noindexCount = 0;
let maxBytes = 0; let maxSlug = '';
for (const s of species) {
  const { html, noindex } = speciesPage(s);
  if (noindex) noindexCount++;
  if (html.length > maxBytes) { maxBytes = html.length; maxSlug = slugs[s.id]; }
  write(slugs[s.id], html);
}

// family hubs
for (const [fam, list] of families) {
  const sorted = [...list].sort((a, b) => b.commonness - a.commonness);
  const extra = checklistOnly.get(fam) || [];
  const groups = [{
    items: sorted.map((s) => ({ name: s.name, sub: s.sci, href: `/birds/${slugs[s.id]}/`, thumb: thumbOf(s.id) })),
  }];
  if (extra.length) {
    groups.push({
      h2: 'Also in the checklist',
      note: 'These species are recognised in the AviList world checklist and carry no photos or recordings here yet. Help complete the record.',
      items: [],
      tail: `<p class="note">${extra.map((e) => `${esc(e.name)} (<i>${esc(e.sci)}</i>)`).join(' · ')}</p><p class="note" style="margin-top:8px"><a href="/contribute.html">Contribute a photo or recording</a></p>`,
    });
  }
  write(`family/${famSlug[fam]}`, hubPage({
    title: `${fam} | Bird Family Guide | BeakBrain`,
    h1: fam,
    desc: `All ${sorted.length} ${fam.toLowerCase()} in the BeakBrain directory, with photos, calls and identification tips.`,
    url: `/birds/family/${famSlug[fam]}/`,
    intro: `${sorted.length} species${extra.length ? ` \u00b7 ${extra.length} checklist-only` : ''}`,
    groups,
    crumbItems: [{ name: 'Home', href: '/' }, { name: 'Birds', href: '/birds/' }, { name: sorted[0].order, href: `/birds/order/${orderSlug[sorted[0].order]}/` }, { name: fam }],
  }));
}

// order hubs
for (const [ord, list] of orders) {
  const famsIn = [...new Set(list.map((s) => s.family))].sort();
  write(`order/${orderSlug[ord]}`, hubPage({
    title: `${ord} | Bird Order Guide | BeakBrain`,
    h1: ord,
    desc: `The ${famsIn.length} families and ${list.length} species of ${ord} in the BeakBrain directory.`,
    url: `/birds/order/${orderSlug[ord]}/`,
    intro: `${list.length} species \u00b7 ${famsIn.length} families`,
    groups: [{ items: famsIn.map((f) => ({ name: f, sub: `${families.get(f).length} species`, href: `/birds/family/${famSlug[f]}/` })) }],
    crumbItems: [{ name: 'Home', href: '/' }, { name: 'Birds', href: '/birds/' }, { name: ord }],
  }));
}

// country hubs
for (const [code, list] of countrySpecies) {
  const name = COUNTRY[code] || code;
  const the = theName(name);
  const sorted = [...list].sort((a, b) => (b.regionCounts?.[code] || 0) - (a.regionCounts?.[code] || 0));
  const residents = sorted.filter((s) => !(s.vagrantRegions || []).includes(code));
  const vagrants = sorted.filter((s) => (s.vagrantRegions || []).includes(code));
  const endemics = residents.filter((s) => s.regions.length === 1);
  const groups = [];
  if (endemics.length) groups.push({ h2: `Endemic to ${the}`, note: 'Found in this country and nowhere else on Earth.', items: endemics.map((s) => ({ name: s.name, sub: s.sci, href: `/birds/${slugs[s.id]}/`, thumb: thumbOf(s.id) })) });
  groups.push({ h2: endemics.length ? 'All regular species' : undefined, items: residents.map((s) => ({ name: s.name, sub: s.sci, href: `/birds/${slugs[s.id]}/`, thumb: thumbOf(s.id) })) });
  if (vagrants.length) groups.push({ h2: 'Rare visitors', note: 'Recorded here, though only as vagrants or rarities.', items: vagrants.map((s) => ({ name: s.name, sub: s.sci, href: `/birds/${slugs[s.id]}/`, thumb: thumbOf(s.id) })) });
  write(`country/${code.toLowerCase()}`, hubPage({
    title: `Birds of ${the} | ${residents.length} Species | BeakBrain`,
    h1: `Birds of ${the}`,
    desc: `${residents.length} bird species recorded in ${the}${endemics.length ? `, including ${endemics.length} endemics` : ''}, with photos, calls and ID tips for each.`,
    url: `/birds/country/${code.toLowerCase()}/`,
    intro: `${residents.length} species${endemics.length ? ` \u00b7 ${endemics.length} endemic` : ''}${vagrants.length ? ` \u00b7 ${vagrants.length} rare visitors` : ''} \u00b7 ordered by how often reported`,
    groups,
    crumbItems: [{ name: 'Home', href: '/' }, { name: 'Birds', href: '/birds/' }, { name: `Birds of ${the}` }],
  }));
}

// compare pages ("X vs Y"), one per qualifying confusion pair, plus a hub
function sizeSentence(a, b) {
  // Plain data only (feeds the meta description; nothing editorial).
  const ma = a.traits?.massG; const mb = b.traits?.massG;
  if (!ma || !mb) return '';
  return `About ${massLabel(ma)} and ${massLabel(mb)}.`;
}

function compareSide(s) {
  const d = detail.get(s.id);
  const img = (photos.get(s.id) || [])[0];
  const a = (s.audio || [])[0];
  const traits = s.traits || {};
  const bits = [SIZE_TRAIT[traits.size], traits.massG ? massLabel(traits.massG) : '', HABITAT_TRAIT[traits.habitat]?.[1]].filter(Boolean);
  return `<div class="side">
<img src="${esc(img.url)}" alt="${esc(s.name)} (${esc(s.sci)})" loading="lazy" decoding="async" />
<div class="inner">
<h2><a href="/birds/${slugs[s.id]}/">${esc(s.name)}</a></h2>
<p class="sci">${esc(s.sci)}</p>
<div class="chips">${bits.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>
<p class="tip">${esc(d.idTip)}</p>
<p class="cr" style="border:none;padding:2px 0 0;margin:0">ID text from <a href="${esc(d.descriptionSource || 'https://en.wikipedia.org')}" rel="nofollow">Wikipedia</a>, ${esc(d.descriptionLicense || 'CC BY-SA')}</p>
${a ? `<div class="audio-row" style="margin-top:10px"><audio controls preload="none" src="${esc(a.url)}"></audio><div class="cr" style="border:none;padding:4px 0 0;margin:0">Recording: ${esc(a.credit || 'unknown')} · ${esc(licDisplay(a.license))}</div></div>` : ''}
<div class="cr">Photo: ${esc(img.credit || 'unknown')} · ${esc(licDisplay(img.license))}</div>
</div>
</div>`;
}

for (const pair of comparePairs) {
  const [a, b] = pair;
  const url = compareUrl(pair);
  const h1 = `${a.name} vs ${b.name}`;
  const shared = a.regions.filter((c) => b.regions.includes(c) && !(a.vagrantRegions || []).includes(c) && !(b.vagrantRegions || []).includes(c));
  const size = sizeSentence(a, b);
  // The lead feeds the meta description and Article JSON-LD only; nothing
  // templated is rendered on the visible page (Cat's no-AI-writing rule).
  const lead = `The ${a.name} (${a.sci}) and the ${b.name} (${b.sci}) are easily confused. ${size} ${shared.length ? `Their ranges overlap in ${shared.length === 1 ? theName(COUNTRY[shared[0]] || shared[0]) : `${shared.length} countries`}.` : ''}`.trim();
  const crumbItems = [
    { name: 'Home', href: '/' }, { name: 'Birds', href: '/birds/' },
    { name: 'Compare', href: '/birds/compare/' }, { name: h1 },
  ];
  const heroHtml = `<a class="backlink" href="/birds/">${ICONS['chevron-left']}Bird Guide</a>
<h1>${esc(h1)}</h1>`;
  const body = `
<div class="vs" style="margin-top:16px">
${compareSide(a)}
${compareSide(b)}
</div>
${shared.length ? `
<section>
<h2>Where you might meet both</h2>
<div class="cols">
${shared.slice(0, 24).map((c) => `<a href="/birds/country/${c.toLowerCase()}/">${esc(COUNTRY[c] || c)}</a>`).join('\n')}
</div>
${shared.length > 24 ? `<p class="note" style="margin-top:8px">And ${shared.length - 24} more countries.</p>` : ''}
</section>` : ''}
<section class="cta">
<h2>Learn this pair in the BeakBrain App</h2>
<p>Photo and call practice. Coming soon to iPhone and Android.</p>
<a href="${CTA_HREF}">${CTA_LABEL}</a>
</section>
<p class="note">Photos and recordings are credited to their authors under the licence shown. Full profiles: <a href="/birds/${slugs[a.id]}/">${esc(a.name)}</a> and <a href="/birds/${slugs[b.id]}/">${esc(b.name)}</a>.</p>
`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: `${h1}: how to tell them apart`,
        description: lead,
        datePublished: buildDate, dateModified: buildDate,
        mainEntityOfPage: ORIGIN + url,
        author: { '@type': 'Organization', name: 'BeakBrain', url: ORIGIN },
        publisher: { '@type': 'Organization', name: 'BeakBrain', url: ORIGIN },
      },
      breadcrumbLd(crumbItems),
    ],
  };
  write(url.slice('/birds/'.length), page({
    title: `${h1}: How to Tell Them Apart | BeakBrain`,
    desc: lead.length > 155 ? lead.slice(0, 152).replace(/\s+\S*$/, '') + '…' : lead,
    canonical: ORIGIN + url, body, jsonld, heroHtml, noChromeVideo: true,
  }));
}

// compare hub, grouped by family of the first bird
{
  const byFam = new Map();
  for (const pair of comparePairs) {
    const f = pair[0].family;
    if (!byFam.has(f)) byFam.set(f, []);
    byFam.get(f).push(pair);
  }
  write('compare', hubPage({
    title: 'Compare Lookalike Birds Side by Side | BeakBrain',
    h1: 'Lookalike birds, side by side',
    desc: `${comparePairs.length} pairs of easily confused bird species compared side by side: photos, identification marks, size, calls and where their ranges overlap.`,
    url: '/birds/compare/',
    intro: `${comparePairs.length.toLocaleString()} lookalike pairs, side by side`,
    groups: [...byFam.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([fam, pairs]) => ({
      h2: fam,
      items: pairs.map((pr) => ({ name: `${pr[0].name} vs ${pr[1].name}`, href: compareUrl(pr) })),
    })),
    crumbItems: [{ name: 'Home', href: '/' }, { name: 'Birds', href: '/birds/' }, { name: 'Compare' }],
  }));
}

// /birds/ index — the Bird Guide: hero video banner (same treatment as the home
// and community pages) over an app-style browse bar with country, national park,
// time of year, conservation status and rarity filters. The static hub sections
// below the tool keep every species reachable by crawlers with no JS.
{
  const orderList = [...orders.keys()].sort();
  const bigCountries = [...countrySpecies.entries()]
    .map(([c, l]) => [c, l.filter((s) => !(s.vagrantRegions || []).includes(c)).length])
    .sort((a, b) => b[1] - a[1]);
  const countryOpts = [...countrySpecies.keys()]
    .map((c) => ({ code: c, name: COUNTRY[c] || c, n: countrySpecies.get(c).length }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const groupCounts = GROUPS.map(() => 0);
  const groupIllus = GROUPS.map(() => 0);
  for (const s of species) {
    const gi = groupIdx.get(majorGroupOf(s));
    groupCounts[gi]++;
    if (hasPlate(s.id)) groupIllus[gi]++;
  }
  // Kraft-paper folder browns (Cat, 2026-08-11): the groups no longer wear
  // team colours — they are folders in a drawer, in varying shades of brown,
  // hand-lettered in the cards' Dancing Script.
  const FOLDER_BROWNS = ['#A9855D', '#97764F', '#B29067', '#8B6B47', '#A07D54'];
  const nTotal = species.length.toLocaleString();
  const PARKN = Object.fromEntries([...parksByCountry].map(([c, l]) => [c, l.length]));
  const chev = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  const title = `Bird Species Directory | ${nTotal} Birds Worldwide | BeakBrain`;
  const desc = `Photos, calls and identification tips for ${nTotal} bird species worldwide. Filter by country, national park, time of year and conservation status.`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'BeakBrain', url: ORIGIN },
      breadcrumbLd([{ name: 'Home', href: '/' }, { name: 'Birds' }]),
    ],
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${ORIGIN}/birds/" />
<link rel="icon" href="/assets/favicon.png" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${ORIGIN}/birds/" />
<style>${CSS}
/* Bird Guide page: fixed header over a hero video, app-style browse bar. */
header{position:fixed;top:0;left:0;right:0;z-index:30;background:transparent;border-bottom:1px solid transparent;transition:background .28s ease,border-color .28s ease}
header.scrolled{background:rgba(242,232,207,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.nav .wordmark,.nav .nav-link{color:#fff;transition:color .28s ease}
header.scrolled .nav .wordmark,header.scrolled .nav .nav-link{color:var(--green)}
.hero{position:relative;margin:0;min-height:44vh;display:flex;align-items:center;overflow:hidden;background:linear-gradient(150deg,#2C5134 0%,#386641 45%,#4A7A3E 100%)}
.hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:0;transition:opacity .9s ease}
.hero-video.ready{opacity:1}
.hero::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(30,45,30,.30) 0%,rgba(30,45,30,.50) 60%,rgba(22,36,24,.80) 100%)}
.hero-inner{position:relative;z-index:2;width:100%;color:#fff;padding:118px 22px 62px}
.hero h1{font-size:clamp(32px,5vw,50px);color:#fff;letter-spacing:-.5px}
.hero p{color:#EFE7D2;font-size:clamp(16px,2vw,19px);margin-top:14px;max-width:52ch}
@media (prefers-reduced-motion: reduce){.hero-video{transition:none}}
.finder{position:relative;z-index:3;margin-top:-30px;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:18px 18px 16px;box-shadow:var(--shadow)}
.frow{display:flex;flex-wrap:wrap;gap:10px}
.search{flex:1 1 240px;font-family:var(--body);font-size:16px;color:var(--ink);background:var(--bg);border:1.5px solid var(--border);border-radius:999px;padding:12px 18px}
.search:focus{outline:none;border-color:var(--sage);box-shadow:0 0 0 3px rgba(106,153,78,.18)}
.select-row{position:relative;flex:1 1 210px}
.cselect{-webkit-appearance:none;appearance:none;width:100%;font-family:var(--body);font-size:15px;color:var(--ink);background:var(--bg);border:1.5px solid var(--border);border-radius:999px;padding:12px 40px 12px 18px;cursor:pointer}
.cselect:focus{outline:none;border-color:var(--sage);box-shadow:0 0 0 3px rgba(106,153,78,.18)}
.select-row::after{content:"";position:absolute;right:19px;top:50%;width:8px;height:8px;margin-top:-6px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);pointer-events:none}
.flabel{font-family:var(--display);font-weight:600;text-transform:uppercase;letter-spacing:1.2px;font-size:11.5px;color:var(--gold-deep);margin:14px 0 8px}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.fchip{font-family:var(--body);font-weight:700;font-size:13.5px;border-radius:999px;padding:7px 14px;background:var(--bg);border:1px solid var(--border);cursor:pointer;color:var(--ink)}
.fchip.on{background:var(--green);border-color:var(--green);color:#fff}
.count-note{color:var(--muted);font-size:13.5px;margin-top:14px}
/* Folders: each group is a kraft folder — hand-lettered tab, textured front,
   card grid inside when open. --fb folder brown, --fbd its darker interior. */
:root{--ftex:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.055 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E")}
.folder{margin-top:20px}
.ftab{display:block;width:100%;background:none;border:none;padding:0;cursor:pointer;text-align:left;font-family:var(--body)}
.ftab:focus-visible{outline:3px solid var(--gold);outline-offset:3px;border-radius:12px}
.ftab .tab{display:inline-block;max-width:min(78%,540px);background-color:var(--fb);background-image:var(--ftex);padding:6px 30px 3px 18px;border-radius:10px 16px 0 0;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 100%,0 100%);box-shadow:0 -1px 2px rgba(46,42,37,.12)}
.ftab .fname{font-family:'Dancing Script','Comic Sans MS',cursive;font-weight:700;font-size:clamp(20px,2.8vw,25px);line-height:1.25;color:#191512;text-shadow:0 0 .4px #191512;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.ftab .fbar{display:flex;align-items:center;justify-content:flex-end;gap:10px;background-color:var(--fb);background-image:var(--ftex);border-radius:0 12px 12px 12px;padding:9px 14px;box-shadow:0 2px 5px rgba(46,42,37,.16),0 1px 0 rgba(255,255,255,.22) inset;transition:filter .15s ease}
.ftab:hover .fbar{filter:brightness(1.05)}
.ftab .fcount{font-size:13px;font-weight:800;color:#33291D;opacity:.85}
.ftab .fchev{width:30px;height:30px;border-radius:50%;background:rgba(25,21,18,.16);display:flex;align-items:center;justify-content:center;flex:none}
.ftab .fchev svg{transition:transform .2s ease;stroke:#191512}
.folder.open .fchev svg{transform:rotate(180deg)}
.folder.open .ftab .fbar{border-radius:0 12px 0 0}
.fbody{background-color:var(--fbd);background-image:var(--ftex);border-radius:0 0 14px 14px;box-shadow:0 10px 22px rgba(46,42,37,.18),0 3px 10px rgba(25,21,18,.28) inset;padding:4px 0 2px}
.fbody[hidden]{display:none}
.fnote{font-size:13px;color:#F3EADB;padding:12px 18px 0;text-shadow:0 1px 2px rgba(25,21,18,.4)}
.fnote a{color:#F3EADB}
.cardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(186px,1fr));gap:26px 20px;padding:18px}
@media(max-width:480px){.cardgrid{grid-template-columns:repeat(2,1fr);gap:18px 12px;padding:14px}}
.floading{color:#F3EADB;font-weight:700;padding:18px;text-align:center}
.cardgrid a.scard{opacity:0;transform:translateY(16px);transition:opacity .5s ease,transform .5s ease,filter .18s ease}
.cardgrid a.scard.in{opacity:1;transform:none}
@media(hover:hover){.cardgrid a.scard.in:hover{transform:translateY(-6px) scale(1.045)}}
@media (prefers-reduced-motion: reduce){.cardgrid a.scard{opacity:1;transform:none;transition:none}.cardgrid a.scard.in:hover{transform:none}}
@media(max-width:460px){.gw{display:none}}
.slist{list-style:none;padding:10px;margin:8px 0 18px;background:var(--surface);border:1px solid var(--border);border-radius:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:2px 10px}
.slist[hidden]{display:none}
.slist a{display:flex;align-items:center;gap:10px;padding:5px 8px;border-radius:10px;text-decoration:none;color:var(--green-dark);font-weight:700;font-size:14.5px}
.slist a:hover{background:var(--bg)}
.slist .th{width:40px;height:40px;border-radius:9px;object-fit:cover;background:var(--surface-alt);flex:none;display:inline-block}
.slist .txt{min-width:0}
.slist .sub{display:block;font-weight:400;font-size:12px;color:var(--muted);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
<header><div class="wrap nav">
  <a class="wordmark" href="/">BeakBrain</a>
  <nav><a class="nav-link" href="/birds/">Bird Guide</a><a class="nav-link" href="/daily/"><span class="lbl-full">Daily Bird</span><span class="lbl-short">Daily</span></a><a class="nav-link" href="/cams/">Cams</a><a class="nav-link" href="/community.html">Community</a><a class="btn nav-cta" href="${CTA_HREF}">${CTA_LABEL}</a></nav>
</div></header>
<section class="hero">
  <video class="hero-video" id="heroVideo" autoplay muted loop playsinline preload="auto" poster="/assets/video/guide-hero-poster.jpg" aria-label="An Atlantic puffin colony on a sea cliff">
    <source src="/assets/video/guide-hero.mp4" type="video/mp4" />
  </video>
  <div class="wrap hero-inner">
    <h1>The Bird Guide</h1>
    <p>${nTotal} species \u00b7 photos \u00b7 calls \u00b7 ID tips \u00b7 range maps</p>
  </div>
</section>
<main class="wrap">
<div class="finder">
  <div class="frow">
    <input class="search" id="q" type="search" placeholder="Search ${nTotal} species by name" aria-label="Search species" autocomplete="off" />
    <div class="select-row"><select class="cselect" id="fcountry" aria-label="Country">
      <option value="">Worldwide</option>
${countryOpts.map((c) => `      <option value="${c.code}" data-n="${esc(c.name)}">${esc(c.name)} · ${c.n}</option>`).join('\n')}
    </select></div>
    <div class="select-row" id="parkRow" hidden><select class="cselect" id="fpark" aria-label="National park"></select></div>
    <div class="select-row"><select class="cselect" id="fiucn" aria-label="Conservation status">
      <option value="">Any conservation status</option>
      <option value="T">Threatened (VU, EN or CR)</option>
      <option value="LC">Least Concern</option>
      <option value="NT">Near Threatened</option>
      <option value="VU">Vulnerable</option>
      <option value="EN">Endangered</option>
      <option value="CR">Critically Endangered</option>
      <option value="EW">Extinct in the Wild</option>
      <option value="DD">Data Deficient</option>
      <option value="NE">Not Evaluated</option>
    </select></div>
  </div>
  <div class="flabel">Time of year</div>
  <div class="chip-row" id="monthChips">
    <button class="fchip on" data-m="0">All year</button>
${MONTHS.map((m, i) => `    <button class="fchip" data-m="${i + 1}">${m.slice(0, 3)}</button>`).join('\n')}
  </div>
  <p class="count-note" id="summary">${nTotal} species · Worldwide</p>
</div>
<section id="results" hidden>
  <div class="chip-row" id="placehits" hidden style="margin:0 0 12px"></div>
  <h2 id="resTitle"></h2>
  <ul class="slist" id="hits"></ul>
  <p class="note" id="resNote" hidden>Showing the first 150 matches. Keep typing to narrow it down.</p>
</section>
${BASEMAP_DEF}
<div id="groupwrap">
<h2 style="margin:26px 0 2px">All birds, by family</h2>
<p class="note" style="margin-bottom:4px">Open a folder to lay out its species cards. Every bird has a card; the ones still waiting on an antique illustration show their family silhouette.</p>
${GROUPS.map((g, i) => {
    const fb = FOLDER_BROWNS[i % FOLDER_BROWNS.length];
    return `<div class="folder" data-g="${i}" style="--fb:${fb};--fbd:${shade(fb, -0.16)}"><button class="ftab" data-g="${i}" aria-expanded="false" aria-controls="fbody${i}"><span class="tab"><span class="fname">${esc(g)}</span></span><span class="fbar"><span class="fcount">${groupCounts[i].toLocaleString()}<span class="gw"> species</span></span><span class="fchev">${chev}</span></span></button>
<div class="fbody" id="fbody${i}" hidden><p class="fnote">${groupCounts[i].toLocaleString()} species · ${groupIllus[i].toLocaleString()} illustrated card${groupIllus[i] === 1 ? '' : 's'} so far</p><div class="cardgrid" data-list="${i}"></div></div></div>`;
  }).join('\n')}
</div>
<section class="cta">
<h2>Learn these birds in the BeakBrain App</h2>
<p>Photo and call practice, tuned to your country. Coming soon to iPhone and Android.</p>
<a href="${CTA_HREF}">${CTA_LABEL}</a>
</section>
<script>
(function(){
var GROUPS=${JSON.stringify(GROUPS)};
var PARKN=${JSON.stringify(PARKN)};
var MONTHS=${JSON.stringify(MONTHS)};
var IUCN_LABEL=${JSON.stringify({ ...IUCN, T: 'Threatened' })};
var state={q:'',cc:'',ccName:'',park:null,parkName:'',iucn:'',tier:-1,month:0};
var CNAME={};(function(){var o=$('fcountry').options;for(var i=0;i<o.length;i++)if(o[i].value)CNAME[o[i].value]=o[i].getAttribute('data-n')})();
var DATA=null,pending=null,parkCache={},expanded={};
function $(id){return document.getElementById(id)}
function esch(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function fmt(n){return n.toLocaleString('en')}
function ensure(){
  if(DATA)return Promise.resolve(DATA);
  if(!pending){
    $('summary').textContent='Loading the guide\\u2026';
    pending=Promise.all([
      fetch('/birds/browse.json').then(function(r){return r.json()}),
      fetch('/birds/places.json').then(function(r){return r.json()}).catch(function(){return null})
    ]).then(function(res){DATA=res[0];DATA.places=res[1];return DATA});
  }
  return pending;
}
function pass(r){
  if(state.cc&&(' '+r[7]+' ').indexOf(' '+state.cc+' ')<0)return false;
  if(state.month&&r[4]&&!(r[4]&(1<<(state.month-1))))return false;
  if(state.park&&!state.park[r[8]])return false;
  if(state.iucn==='T'){if(r[5]!=='VU'&&r[5]!=='EN'&&r[5]!=='CR')return false}
  else if(state.iucn&&r[5]!==state.iucn)return false;
  return true;
}
function rowHtml(r){return '<li><a href="/birds/'+r[2]+'/">'+(r[9]?'<img class="th" src="'+r[9]+'" alt="" loading="lazy" decoding="async" />':'<span class="th"></span>')+'<span class="txt">'+esch(r[0])+'<span class="sub">'+esch(r[1])+'</span></span></a></li>'}
function summarize(n){
  var bits=[fmt(n)+' species',state.parkName||state.ccName||'Worldwide'];
  if(state.month)bits.push(MONTHS[state.month-1]);
  if(state.iucn)bits.push(IUCN_LABEL[state.iucn]);
  $('summary').textContent=bits.join(' \\u00b7 ');
}
function apply(){
  if(!DATA)return;
  var q=state.q.trim().toLowerCase(),i,r;
  var buckets=[];for(i=0;i<GROUPS.length;i++)buckets.push([]);
  var total=0,nq=0,hits=[],sp=DATA.species;
  for(i=0;i<sp.length;i++){
    r=sp[i];
    if(!pass(r))continue;
    total++;
    if(q.length>=2){
      if(r[0].toLowerCase().indexOf(q)>-1||r[1].toLowerCase().indexOf(q)>-1){nq++;if(hits.length<150)hits.push(r)}
    }else{buckets[r[3]].push(r)}
  }
  if(q.length>=2){
    $('groupwrap').hidden=true;$('results').hidden=false;
    var ph=[],pl=DATA.places;
    if(pl){
      var i2;
      for(i2=0;i2<pl.countries.length&&ph.length<3;i2++)if(pl.countries[i2][0].toLowerCase().indexOf(q)>-1)ph.push('<button class="fchip" data-cc="'+pl.countries[i2][1]+'">'+esch(pl.countries[i2][0])+'</button>');
      for(i2=0;i2<pl.parks.length&&ph.length<8;i2++)if(pl.parks[i2][0].toLowerCase().indexOf(q)>-1)ph.push('<button class="fchip" data-cc="'+pl.parks[i2][1]+'" data-park="'+pl.parks[i2][2]+'">'+esch(pl.parks[i2][0])+' \u00b7 '+esch((CNAME[pl.parks[i2][1]]||pl.parks[i2][1]))+'</button>');
    }
    $('placehits').hidden=!ph.length;
    $('placehits').innerHTML=ph.length?'<span class="note" style="width:100%">Places</span>'+ph.join(''):'';
    $('resTitle').textContent=fmt(nq)+(nq===1?' match':' matches');
    $('resNote').hidden=nq<=150;
    $('hits').innerHTML=hits.map(rowHtml).join('');
  }else{
    $('results').hidden=true;$('groupwrap').hidden=false;
    var folders=document.querySelectorAll('.folder');
    for(i=0;i<folders.length;i++){
      var g=+folders[i].getAttribute('data-g');
      var rows=buckets[g];
      folders[i].hidden=!rows.length;
      folders[i].querySelector('.fcount').innerHTML=fmt(rows.length)+'<span class="gw"> species</span>';
      var open=!!expanded[g]&&rows.length>0;
      folders[i].classList.toggle('open',open);
      folders[i].querySelector('.ftab').setAttribute('aria-expanded',open?'true':'false');
      var body=document.getElementById('fbody'+g);
      body.hidden=!open;
      if(open)openFolder(g,rows);
    }
  }
  summarize(total);
}
// Card folders: each group's card grid is a pre-rendered fragment, fetched
// the first time its folder opens; filters then show or hide cards in place.
var io=('IntersectionObserver' in window)&&!matchMedia('(prefers-reduced-motion: reduce)').matches
  ?new IntersectionObserver(function(es){for(var k=0;k<es.length;k++)if(es[k].isIntersecting){es[k].target.classList.add('in');io.unobserve(es[k].target)}},{rootMargin:'120px'})
  :null;
var fragLoaded={},fragPending={};
function watchCards(grid){
  var cards=grid.querySelectorAll('a.scard');
  for(var k=0;k<cards.length;k++){if(io)io.observe(cards[k]);else cards[k].classList.add('in')}
}
function filterCards(g,rows){
  var grid=document.querySelector('.cardgrid[data-list="'+g+'"]');
  if(!grid||!fragLoaded[g])return;
  var ok={};for(var k=0;k<rows.length;k++)ok[rows[k][8]]=1;
  var cards=grid.querySelectorAll('a.scard');
  for(k=0;k<cards.length;k++)cards[k].style.display=ok[cards[k].getAttribute('data-id')]?'':'none';
}
function openFolder(g,rows){
  var grid=document.querySelector('.cardgrid[data-list="'+g+'"]');
  if(fragLoaded[g]){filterCards(g,rows);return}
  if(fragPending[g])return;
  fragPending[g]=1;
  grid.innerHTML='<p class="floading">Opening the folder…</p>';
  fetch('/birds/groups/'+g+'.html').then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(h){
    grid.innerHTML=h;fragLoaded[g]=1;fragPending[g]=0;
    filterCards(g,rows);watchCards(grid);
  }).catch(function(){fragPending[g]=0;grid.innerHTML='<p class="floading">Could not load this folder. Tap to retry.</p>';
    grid.onclick=function(){grid.onclick=null;openFolder(g,rows)}});
}
function refresh(){ensure().then(apply)}
$('q').addEventListener('input',function(){state.q=this.value;refresh()});
$('fcountry').addEventListener('change',function(){
  var opt=this.options[this.selectedIndex];
  state.cc=this.value;state.ccName=this.value?opt.getAttribute('data-n'):'';
  state.park=null;state.parkName='';
  var row=$('parkRow');
  if(state.cc&&PARKN[state.cc]){
    row.hidden=false;
    loadParks(state.cc);
  }else{row.hidden=true}
  refresh();
});
var pendingPark=null;
function loadParks(cc){
  var sel=$('fpark');
  function fill(parks){
    if(state.cc!==cc)return;
    var h='<option value="">Anywhere in '+esch(state.ccName)+'</option>';
    for(var i=0;i<parks.length;i++)h+='<option value="'+i+'">'+esch(parks[i].name)+' \\u00b7 '+parks[i].species.length+'</option>';
    sel.innerHTML=h;
    if(pendingPark!=null){sel.value=String(pendingPark);pendingPark=null;sel.dispatchEvent(new Event('change'))}
  }
  if(parkCache[cc])return fill(parkCache[cc]);
  sel.innerHTML='<option value="">Loading parks\\u2026</option>';
  fetch('/birds/parks/'+cc.toLowerCase()+'.json').then(function(r){return r.json()}).then(function(j){
    parkCache[cc]=j.parks||[];fill(parkCache[cc]);
  }).catch(function(){ $('parkRow').hidden=true });
}
$('fpark').addEventListener('change',function(){
  var parks=parkCache[state.cc]||[];
  if(this.value===''){state.park=null;state.parkName=''}
  else{
    var p=parks[+this.value];
    var set={};for(var i=0;i<p.species.length;i++)set[p.species[i]]=1;
    state.park=set;state.parkName=p.name;
  }
  refresh();
});
$('fiucn').addEventListener('change',function(){state.iucn=this.value;refresh()});
function wireChips(id,attr,setter){
  $(id).addEventListener('click',function(e){
    var b=e.target.closest('.fchip');if(!b)return;
    var chips=this.querySelectorAll('.fchip');
    for(var i=0;i<chips.length;i++)chips[i].classList.toggle('on',chips[i]===b);
    setter(+b.getAttribute(attr));refresh();
  });
}
wireChips('monthChips','data-m',function(v){state.month=v});
$('placehits').addEventListener('click',function(e){
  var b=e.target.closest('.fchip');if(!b)return;
  var cc=b.getAttribute('data-cc'),pk=b.getAttribute('data-park');
  if(pk!=null)pendingPark=+pk;
  $('q').value='';state.q='';
  var fc=$('fcountry');fc.value=cc;fc.dispatchEvent(new Event('change'));
});
document.getElementById('groupwrap').addEventListener('click',function(e){
  var h=e.target.closest('.ftab');if(!h)return;
  var g=+h.getAttribute('data-g');
  ensure().then(function(){expanded[g]=!expanded[g];apply()});
});
// Hero video fade-in + solid header once scrolled, as on the home page.
var v=$('heroVideo');
if(v){var mark=function(){v.classList.add('ready')};if(v.readyState>=2)mark();else v.addEventListener('loadeddata',mark)}
var bk=document.querySelector('.backlink');
if(bk)bk.addEventListener('click',function(e){
if(history.length>1&&document.referrer&&document.referrer.indexOf(location.origin)===0){e.preventDefault();history.back()}
});
var hdr=document.querySelector('header');
var tt=document.getElementById('totop');
var onS=function(){hdr.classList.toggle('scrolled',window.scrollY>40);if(tt)tt.classList.toggle('show',window.scrollY>900)};
window.addEventListener('scroll',onS,{passive:true});onS();
if(tt)tt.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});
var fv=document.querySelector('footer .bg-video');
if(fv&&'IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  var io=new IntersectionObserver(function(en){
    if(en[0].isIntersecting){
      var sc=fv.querySelector('source');fv.src=sc.getAttribute('data-src');fv.play().catch(function(){});
      io.disconnect();
    }
  },{rootMargin:'200px'});
  io.observe(fv);
}
})();
</script>
</main>
<footer>
  <video class="bg-video" muted loop playsinline preload="none" poster="/assets/video/site-footer-poster.jpg" aria-label="A weaver at its hanging nest">
    <source data-src="/assets/video/site-footer.mp4" type="video/mp4" />
  </video>
  <div class="wrap foot">
  <span class="wordmark">BeakBrain</span>
  <nav><a href="/">Home</a><a href="/birds/">Birds</a><a href="/contribute.html">Contribute</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></nav>
  <div class="copy">Greet every bird by name. &copy; 2026 BeakBrain. Species data updated ${buildDate}.</div>
</div></footer>
<button class="totop" id="totop" aria-label="Back to top">${ICONS['chevron-up']}</button>
</body>
</html>`;
  write('', html);
}

// Per-group card-grid fragments for the Bird Guide folders: one HTML partial
// per family group, fetched when its folder first opens. Cards link to their
// species page; the shared basemap + hoisted sprites keep each partial small.
// The 25 KB shared basemap geometry ships once as a cached script instead of
// inline on every one of 9,5xx species pages: it injects the <defs> every
// card's <use href="#basemap"> resolves against. The /birds/ index inlines
// the def directly (one page) so its folders need no script round-trip.
fs.mkdirSync(path.join(OUTROOT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUTROOT, 'assets', 'cardmap.js'),
  `(function(){var d=document.createElement('div');d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';d.innerHTML=${JSON.stringify(BASEMAP_DEF)};document.body.appendChild(d);})();`);

{
  fs.mkdirSync(path.join(OUTROOT, 'groups'), { recursive: true });
  const byGroup = GROUPS.map(() => []);
  for (const s of species) byGroup[groupIdx.get(majorGroupOf(s))].push(s);
  let fragBytes = 0;
  byGroup.forEach((list, i) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    const html = list.map((s) =>
      `<a class="scard" data-id="${s.id}" href="/birds/${slugs[s.id]}/" aria-label="${esc(s.name)} — view species page">${cardSvg(s, 320)}</a>`).join('\n');
    fragBytes += html.length;
    fs.writeFileSync(path.join(OUTROOT, 'groups', `${i}.html`), html);
  });
  console.log(`group card fragments: ${GROUPS.length} (${(fragBytes / 1048576).toFixed(1)} MB total)`);
}

// slug index for client-side search + the app's deep links
fs.writeFileSync(path.join(OUTROOT, 'slugs.json'), JSON.stringify({
  generatedAt: world.generatedAt,
  names: Object.fromEntries(species.map((s) => [s.name, slugs[s.id]])),
  ids: slugs,
}));
// committed copy so URLs never drift between builds
fs.writeFileSync(path.join(__dirname, 'slugs.json'), JSON.stringify({ ids: slugs }, null, 1));

// Browse dataset for the /birds/ filter bar: one compact row per species —
// [name, sci, slug, groupIdx, monthBitmask, iucn, tierIdx, "CC CC …", id].
fs.writeFileSync(path.join(OUTROOT, 'browse.json'), JSON.stringify({
  generatedAt: world.generatedAt,
  groups: GROUPS,
  species: species.map((s) => [
    s.name, s.sci, slugs[s.id], groupIdx.get(majorGroupOf(s)),
    (s.months || []).reduce((m, x) => m | (1 << (x - 1)), 0),
    s.iucn || 'NE', TIERS.indexOf(rarity(s)), s.regions.join(' '), s.id, thumbOf(s.id),
  ]),
}));

// Place index for the guide search: country names + park names.
fs.writeFileSync(path.join(OUTROOT, 'places.json'), JSON.stringify({
  countries: [...countrySpecies.keys()].map((c) => [COUNTRY[c] || c, c]),
  parks: [...parksByCountry].flatMap(([cc, list]) => list.map((pk, i) => [pk.name, cc, i])),
}));

// Per-country national park species lists, fetched only when a country with
// parks is picked in the browse bar.
fs.mkdirSync(path.join(OUTROOT, 'parks'), { recursive: true });
for (const [cc, list] of parksByCountry) {
  fs.writeFileSync(path.join(OUTROOT, 'parks', `${cc.toLowerCase()}.json`), JSON.stringify({ parks: list }));
}

// ---------------------------------------------------------------- sitemaps
function smUrl(loc) {
  return `<url><loc>${loc}</loc><lastmod>${buildDate}</lastmod></url>`;
}
function sitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(smUrl).join('\n')}\n</urlset>\n`;
}
const indexable = species.filter((s) => (photos.get(s.id) || []).length || s.audio?.length);
const speciesUrls = indexable.map((s) => `${ORIGIN}/birds/${slugs[s.id]}/`);
const hubUrls = [
  `${ORIGIN}/birds/`,
  ...[...families.keys()].map((f) => `${ORIGIN}/birds/family/${famSlug[f]}/`),
  ...[...orders.keys()].map((o) => `${ORIGIN}/birds/order/${orderSlug[o]}/`),
  ...[...countrySpecies.keys()].map((c) => `${ORIGIN}/birds/country/${c.toLowerCase()}/`),
];
const coreUrls = [`${ORIGIN}/`, `${ORIGIN}/daily/`, `${ORIGIN}/cams/`, `${ORIGIN}/community.html`, `${ORIGIN}/contribute.html`];

// Wave 1: the strongest ~500 pages (photo + description + traits, commonest
// first). Submit this file to Search Console first, watch indexing for two to
// three weeks, then submit the full set in waves (strategy doc §2.3).
const wave1 = indexable
  .filter((s) => (photos.get(s.id) || []).length && detail.get(s.id)?.description && s.traits)
  .sort((a, b) => b.commonness - a.commonness)
  .slice(0, 500)
  .map((s) => `${ORIGIN}/birds/${slugs[s.id]}/`);

const chunks = [];
for (let i = 0; i < speciesUrls.length; i += 5000) chunks.push(speciesUrls.slice(i, i + 5000));
chunks.forEach((c, i) => fs.writeFileSync(path.join(SITE, `sitemap-birds-${i + 1}.xml`), sitemap(c)));
fs.writeFileSync(path.join(SITE, 'sitemap-hubs.xml'), sitemap([...coreUrls, ...hubUrls]));
fs.writeFileSync(path.join(SITE, 'sitemap-compare.xml'),
  sitemap([`${ORIGIN}/birds/compare/`, ...comparePairs.map((pr) => ORIGIN + compareUrl(pr))]));
fs.writeFileSync(path.join(SITE, 'sitemap-wave1.xml'), sitemap(wave1));
fs.writeFileSync(path.join(SITE, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['sitemap-hubs.xml', 'sitemap-compare.xml', ...chunks.map((_, i) => `sitemap-birds-${i + 1}.xml`)].map((f) => `<sitemap><loc>${ORIGIN}/${f}</loc><lastmod>${buildDate}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);

fs.writeFileSync(path.join(SITE, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);

fs.writeFileSync(path.join(SITE, 'llms.txt'), `# BeakBrain

> BeakBrain is a bird learning app and reference site. The species directory at
> ${ORIGIN}/birds/ covers ${species.length.toLocaleString()} bird species worldwide with photos,
> field recordings, identification tips, range by country, seasonality and
> conservation status. All media is openly licensed (CC0, CC BY, CC BY-SA)
> and credited to its author on every page. Species data updated ${buildDate}.

## Browse

- [All species](${ORIGIN}/birds/): search and A to Z
- [By country](${ORIGIN}/birds/): ${countrySpecies.size} country checklists, e.g. [Birds of the Netherlands](${ORIGIN}/birds/country/nl/)
- [By family](${ORIGIN}/birds/): ${families.size} family guides

## Facts per species page

Each species page carries a concise summary, size and weight, diet, habitat,
nest type, countries of occurrence, best months to see it, lookalike species,
IUCN Red List status, photos with photographer credit, and field recordings
with recordist credit via xeno-canto.

## Live cams

- [Live bird cams](${ORIGIN}/cams/): worldwide directory of ${camsTotal || 'live'} bird cams with hosts, locations, species links and best months to watch, live and seasonal cams both labelled
- [Daily Bird](${ORIGIN}/daily/): a free daily quiz, guess the species from its photo and call, a new bird every day

## Community

- [Find a birding club](${ORIGIN}/community.html): worldwide directory of bird clubs and societies
- [Contribute](${ORIGIN}/contribute.html): how to add photos and recordings to the open commons

## App

- [BeakBrain](${APP_URL}): learn birds by photo and call, free to play
`);

// ---------------------------------------------------------------- summary
console.log(`species pages: ${species.length} (${noindexCount} noindex)`);
console.log(`family hubs: ${families.size} | order hubs: ${orders.size} | country hubs: ${countrySpecies.size}`);
console.log(`total pages written: ${written}`);
console.log(`largest species page: ${(maxBytes / 1024).toFixed(1)} KB (${maxSlug})`);
console.log(`sitemaps: ${chunks.length} species + hubs + wave1 (${wave1.length} urls)`);
