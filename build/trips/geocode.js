// Geocodes every trip entry's `location` string via Nominatim (OpenStreetMap) into
// build/trips/data/geo.json, keyed by entry id. Idempotent: already-geocoded ids
// are skipped, so re-runs only fetch new entries. Respects the Nominatim usage
// policy (identifying User-Agent, one request per ~1.2 s).
//
// Never trust upstream coordinates (Destinet's lat/long columns repeat cluster
// values); this file is the only coordinate source for the map.
//
// Run: node build/trips/geocode.js
// Review: every result logs its display_name — scan for obvious mismatches,
// then correct any bad entry by hand in geo.json (set "src": "manual").
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const GEO = path.join(DATA, 'geo.json');

let trips = [];
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'geo.json').sort()) {
  trips = trips.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
}
const seen = new Set();
trips = trips.filter((t) => !seen.has(t.id) && seen.add(t.id));

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
  for (const t of trips) {
    if (geo[t.id] && typeof geo[t.id].lat === 'number') continue;
    // Progressive fallback: full location, then drop the leading (most
    // specific) comma part until Nominatim finds something.
    const parts = t.location.split(',').map((p) => p.trim());
    let hit = null; let used = '';
    for (let i = 0; i < parts.length && !hit; i++) {
      used = parts.slice(i).join(', ');
      try { hit = await lookup(used); } catch (e) { console.warn(`! ${t.id}: ${e.message}`); }
      await sleep(1200);
    }
    if (!hit) { console.warn(`! NO RESULT: ${t.id} (${t.location})`); continue; }
    geo[t.id] = { lat: +(+hit.lat).toFixed(4), lon: +(+hit.lon).toFixed(4), src: used === t.location ? 'nominatim' : `nominatim:${used}` };
    fetched++;
    console.log(`${t.id}: ${geo[t.id].lat}, ${geo[t.id].lon}  <- ${hit.display_name.slice(0, 90)}`);
    fs.writeFileSync(GEO, JSON.stringify(geo, null, 1));
  }
  console.log(`done: ${fetched} fetched, ${Object.keys(geo).length}/${trips.length} total`);
})();
