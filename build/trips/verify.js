// Schema + honesty checks for build/trips/data/*.json. Run before every generate.
// Hard-fails on: bad/duplicate ids, unknown type/region, missing url/blurb/source,
// dashes in blurbs (site voice rule), certification chips without evidence URLs,
// conservation claims without evidence URLs, guide entries without vetting evidence.
// Run: node build/trips/verify.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const TYPES = ['operator', 'guide', 'lodge', 'aggregator'];
const REGIONS = ['North America', 'Central & South America', 'Europe', 'Africa', 'Asia & Middle East', 'Australia & New Zealand'];
const CONS_KINDS = ['percent-profit', 'percent-revenue', 'fixed-per-booking', 'fund', 'carbon-programme', 'carbon-neutral', 'community', 'screening', 'none-documented'];

let trips = [];
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'geo.json').sort()) {
  const rows = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  for (const r of rows) r.__file = f;
  trips = trips.concat(rows);
}

const errs = [];
const warn = [];
const seen = new Set();
const isUrl = (u) => /^https?:\/\/\S+$/.test(u || '');

for (const t of trips) {
  const tag = `${t.__file}:${t.id || t.name || '??'}`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id || '')) errs.push(`${tag}: bad id`);
  else if (seen.has(t.id)) warn.push(`${tag}: duplicate id (generator keeps first)`);
  seen.add(t.id);
  if (!TYPES.includes(t.type)) errs.push(`${tag}: unknown type "${t.type}"`);
  if (!t.name) errs.push(`${tag}: missing name`);
  if (!t.hq_country) errs.push(`${tag}: missing hq_country`);
  if (!t.location) errs.push(`${tag}: missing location (needed for geocoding + card meta)`);
  if (!REGIONS.includes(t.region)) errs.push(`${tag}: unknown region "${t.region}"`);
  if (!isUrl(t.url)) errs.push(`${tag}: bad url "${t.url}"`);
  if (!t.blurb || t.blurb.length < 20) errs.push(`${tag}: missing/short blurb`);
  if (/—|–| - /.test(t.blurb || '')) errs.push(`${tag}: dash in blurb (voice rule: no dashes)`);
  if (!t.source) errs.push(`${tag}: missing source`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.last_verified || '')) errs.push(`${tag}: missing last_verified`);
  for (const c of t.certifications || []) {
    if (!c.scheme) errs.push(`${tag}: certification without scheme`);
    if (!isUrl(c.evidence_url)) errs.push(`${tag}: certification "${c.scheme}" without evidence_url`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.checked || '')) errs.push(`${tag}: certification "${c.scheme}" without checked date`);
  }
  const cons = t.conservation || {};
  if (!CONS_KINDS.includes(cons.kind)) errs.push(`${tag}: unknown conservation.kind "${cons.kind}"`);
  if (cons.kind && cons.kind !== 'none-documented' && !isUrl(cons.evidence_url)) {
    errs.push(`${tag}: conservation claim "${cons.kind}" without evidence_url`);
  }
  if (t.type === 'guide') {
    const v = t.guide_vetting || {};
    if (!v.body || !isUrl(v.evidence_url)) errs.push(`${tag}: guide entry needs guide_vetting.body + evidence_url`);
  }
  if (!(t.certifications || []).length && !(cons.kind && cons.kind !== 'none-documented') && t.type !== 'guide') {
    // Stated-ethos entries are allowed (badgeless) but each one should be a deliberate call.
    warn.push(`${tag}: badgeless entry (no certification, no documented giving)`);
  }
}

// Geo coverage (soft: geocode.js may not have run yet).
const GEOPATH = path.join(DATA, 'geo.json');
const geo = fs.existsSync(GEOPATH) ? JSON.parse(fs.readFileSync(GEOPATH, 'utf8')) : {};
const nogeo = trips.filter((t) => !geo[t.id]);
if (nogeo.length) warn.push(`${nogeo.length}/${trips.length} entries have no geo yet (run geocode.js): ${nogeo.slice(0, 8).map((t) => t.id).join(', ')}${nogeo.length > 8 ? '…' : ''}`);

for (const w of warn) console.log(`WARN ${w}`);
if (errs.length) {
  for (const e of errs) console.error(`FAIL ${e}`);
  console.error(`\n${errs.length} errors across ${trips.length} entries.`);
  process.exit(1);
}
console.log(`OK ${trips.length} entries verified (${warn.length} warnings).`);
