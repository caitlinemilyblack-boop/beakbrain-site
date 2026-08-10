// Geocodes every cam's `location` string via Nominatim (OpenStreetMap) into
// build/cams/data/geo.json, keyed by cam id. Idempotent: already-geocoded ids
// are skipped, so re-runs only fetch new cams. Respects the Nominatim usage
// policy (identifying User-Agent, one request per ~1.2 s).
//
// Run: node build/cams/geocode.js
// Review: every result logs its display_name — scan for obvious mismatches,
// then correct any bad entry by hand in geo.json (set "src": "manual").
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const GEO = path.join(DATA, 'geo.json');

let cams = [];
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'geo.json').sort()) {
  cams = cams.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
}
const seen = new Set();
cams = cams.filter((c) => !seen.has(c.id) && seen.add(c.id));

const geo = fs.existsSync(GEO) ? JSON.parse(fs.readFileSync(GEO, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'BeakBrain-site-build/1.0 (hello@beakbrain.com)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
}

(async () => {
  let fetched = 0;
  for (const c of cams) {
    if (geo[c.id] && typeof geo[c.id].lat === 'number') continue;
    // Progressive fallback: full location, then drop the leading (most
    // specific) comma part until Nominatim finds something.
    const parts = c.location.split(',').map((p) => p.trim());
    let hit = null; let used = '';
    for (let i = 0; i < parts.length && !hit; i++) {
      used = parts.slice(i).join(', ');
      try { hit = await lookup(used); } catch (e) { console.warn(`! ${c.id}: ${e.message}`); }
      await sleep(1200);
    }
    if (!hit) { console.warn(`! NO RESULT: ${c.id} (${c.location})`); continue; }
    geo[c.id] = { lat: +(+hit.lat).toFixed(4), lon: +(+hit.lon).toFixed(4), src: used === c.location ? 'nominatim' : `nominatim:${used}` };
    fetched++;
    console.log(`${c.id}: ${geo[c.id].lat}, ${geo[c.id].lon}  <- ${hit.display_name.slice(0, 90)}`);
    fs.writeFileSync(GEO, JSON.stringify(geo, null, 1));
  }
  console.log(`done: ${fetched} fetched, ${Object.keys(geo).length}/${cams.length} total`);
})();
