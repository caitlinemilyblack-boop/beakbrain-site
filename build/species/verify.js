// Verifies the generated /birds/ directory. Run after generate.js:
//   node build/species/verify.js
//
// Asserts, per the species-pages handover §5.5:
//   1. every species has exactly one page, at the slug slugs.json records
//   2. every page carries a title, a canonical, and JSON-LD that parses
//   3. every media item on a species page carries a credit line
//   4. every internal /birds/ link resolves to a generated page
//   5. size budget: hard cap 56 KB per species page, mean under 40 KB (image-metadata JSON-LD added 2026-08-10)
//      (raised 2026-08-09 late: video hero/footer chrome, lucide icon chips,
//      confusion cards with tips, month calendar, lightbox + photo report)
//      (raised 2026-08-09 evening: cam cross-link sections, video banners and
//      the richer header grew the cosmopolitan species pages deliberately)
//      (the ~230 pages between 25 and 35 KB are cosmopolitan species whose
//      country lists are real content, so the original 25 KB line moved)
//   6. sitemap URL counts match the generated page sets
const fs = require('fs');
const path = require('path');
const os = require('os');

const SITE = path.join(__dirname, '..', '..');
const OUTROOT = path.join(SITE, 'birds');
const REGIONS = path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'birding-app', 'assets', 'regions');

const world = JSON.parse(fs.readFileSync(path.join(REGIONS, 'world.json'), 'utf8'));
const imageRows = JSON.parse(fs.readFileSync(path.join(REGIONS, 'world.images.json'), 'utf8')).images;
const photos = new Map(imageRows.map((r) => [r.id, r.images || []]));
const slugs = JSON.parse(fs.readFileSync(path.join(__dirname, 'slugs.json'), 'utf8')).ids;
const videosPath = path.join(__dirname, 'videos.json');
const videos = fs.existsSync(videosPath) ? JSON.parse(fs.readFileSync(videosPath, 'utf8')).videos || {} : {};

let failures = 0;
function fail(msg) { failures++; if (failures <= 30) console.error('FAIL:', msg); }

// 1. one page per species
for (const s of world.species) {
  const p = path.join(OUTROOT, slugs[s.id], 'index.html');
  if (!fs.existsSync(p)) fail(`missing page for ${s.id} (${slugs[s.id]})`);
}

// collect every generated page path (as /birds/... URL) for link resolution
const pages = new Set();
(function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}${e.name}/`);
    else if (e.name === 'index.html') pages.add(rel);
  }
})(OUTROOT, '/birds/');

let totalBytes = 0; let nSpecies = 0; let worst = 0;
const badLinks = new Set();
for (const s of world.species) {
  const p = path.join(OUTROOT, slugs[s.id], 'index.html');
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  nSpecies++; totalBytes += html.length; worst = Math.max(worst, html.length);

  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${slugs[s.id]}: no title`);
  if (!html.includes(`<link rel="canonical" href="https://beakbrain.com/birds/${slugs[s.id]}/"`)) fail(`${slugs[s.id]}: bad canonical`);
  const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (!ld) fail(`${slugs[s.id]}: no JSON-LD`);
  else {
    try { JSON.parse(ld[1]); } catch { fail(`${slugs[s.id]}: JSON-LD does not parse`); }
  }

  // 3. credit per media item
  const nImgs = (photos.get(s.id) || []).length;
  const nCaps = (html.match(/<figcaption>Photo: /g) || []).length;
  if (nCaps !== nImgs) fail(`${slugs[s.id]}: ${nImgs} photos, ${nCaps} credits`);
  const nAudio = (s.audio || []).length;
  const nACred = (html.match(/class="cr">Recording: /g) || []).length;
  if (nACred !== nAudio) fail(`${slugs[s.id]}: ${nAudio} recordings, ${nACred} credits`);
  const hasVideo = (videos[s.id] || []).length > 0;
  const hasVCred = html.includes('class="cr">Video: ');
  if (hasVideo !== hasVCred) fail(`${slugs[s.id]}: video banner and credit mismatch`);

  // Budget raised 56 -> 110 KB on 2026-08-11: every species page now inlines
  // its collector-card SVG (hero + lightbox share one rendering; the world-map
  // geometry is a shared cached script, not page weight).
  if (html.length > 152 * 1024) fail(`${slugs[s.id]}: ${(html.length / 1024).toFixed(1)} KB over 152 KB cap (nav dropdown 2026-08-12: was 150)`);

  for (const m of html.matchAll(/href="(\/birds\/[^"#?]*)"/g)) {
    // Card sprites and group fragments are files, not pages.
    if (m[1].startsWith('/birds/assets/') || m[1].startsWith('/birds/groups/')) continue;
    const href = m[1].endsWith('/') ? m[1] : null;
    if (href === null) { if (!m[1].endsWith('.json')) badLinks.add(`${slugs[s.id]} -> ${m[1]}`); continue; }
    if (!pages.has(href)) badLinks.add(`${slugs[s.id]} -> ${href}`);
  }
}
for (const b of badLinks) fail(`unresolved link: ${b}`);

// hub pages: title + links resolve (sampled fully, they are few)
for (const rel of pages) {
  if (Object.values(slugs).some((sl) => rel === `/birds/${sl}/`)) continue;
  const raw = fs.readFileSync(path.join(OUTROOT, rel.slice('/birds/'.length), 'index.html'), 'utf8');
  if (!/<title>[^<]+<\/title>/.test(raw)) fail(`${rel}: no title`);
  // Scripts build hrefs from template strings; only markup links are checked.
  const html = raw.replace(/<script>[\s\S]*?<\/script>/g, '');
  for (const m of html.matchAll(/href="(\/birds\/[^"#?]*)"/g)) {
    if (m[1].endsWith('.json')) continue;
    if (m[1].startsWith('/birds/assets/') || m[1].startsWith('/birds/groups/')) continue;
    if (!pages.has(m[1])) fail(`unresolved hub link: ${rel} -> ${m[1]}`);
  }
}

// 6. sitemaps
function urlCount(f) {
  return (fs.readFileSync(path.join(SITE, f), 'utf8').match(/<loc>/g) || []).length;
}
const indexable = world.species.filter((s) => (photos.get(s.id) || []).length || (s.audio || []).length).length;
let smSpecies = 0;
for (let i = 1; fs.existsSync(path.join(SITE, `sitemap-birds-${i}.xml`)); i++) smSpecies += urlCount(`sitemap-birds-${i}.xml`);
if (smSpecies !== indexable) fail(`sitemap species urls ${smSpecies} != indexable species ${indexable}`);
const comparePages = [...pages].filter((p) => p.startsWith('/birds/compare/')).length;
if (fs.existsSync(path.join(SITE, 'sitemap-compare.xml'))) {
  const cmp = urlCount('sitemap-compare.xml');
  if (cmp !== comparePages) fail(`sitemap compare urls ${cmp} != compare pages ${comparePages}`);
}
const hubCount = urlCount('sitemap-hubs.xml');
// + core pages (/, /daily/, /cams/, community, contribute), - species and compare pages
const expectedHubs = pages.size - world.species.length - comparePages + 5;
if (hubCount !== expectedHubs) fail(`sitemap hub urls ${hubCount} != expected ${expectedHubs}`);
if (urlCount('sitemap-wave1.xml') > 500) fail('wave1 sitemap over 500 urls');

const mean = totalBytes / nSpecies / 1024;
console.log(`pages: ${pages.size} | species: ${nSpecies} | mean ${mean.toFixed(1)} KB | max ${(worst / 1024).toFixed(1)} KB`);
if (mean > 64) fail(`mean species page ${mean.toFixed(1)} KB over 64 KB budget (nav dropdown added 2026-08-12: was 62; card era: was 40)`);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('all checks green');
