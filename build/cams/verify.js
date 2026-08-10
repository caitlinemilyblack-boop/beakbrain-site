// Schema + cross-link check for build/cams/data/*.json
// Run: node build/cams/verify.js
// Fails (exit 1) on: bad/missing fields, duplicate ids, unknown category/region/status,
// species slugs that do not exist as /birds/<slug>/ pages, malformed watch entries.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const CATEGORIES = ['eagles', 'ospreys', 'falcons', 'owls', 'feeders', 'tropical', 'seabirds', 'wetlands'];
const REGIONS = ['North America', 'Central & South America', 'Europe', 'Africa', 'Asia & Middle East', 'Australia & New Zealand'];
const STATUSES = ['live', 'seasonal'];

const slugs = new Set(
  Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'species', 'slugs.json'), 'utf8')).ids)
);

let cams = [];
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).sort()) {
  cams = cams.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
}

const errs = [];
const warns = [];
const ids = new Set();

for (const c of cams) {
  const at = c.id || c.name || '??';
  if (!c.id || !/^[a-z0-9-]+$/.test(c.id)) errs.push(`${at}: bad id`);
  if (ids.has(c.id)) errs.push(`${at}: duplicate id`);
  ids.add(c.id);
  for (const k of ['name', 'host', 'location', 'flag', 'blurb', 'seasonText']) {
    if (!c[k] || typeof c[k] !== 'string') errs.push(`${at}: missing ${k}`);
  }
  if (!CATEGORIES.includes(c.category)) errs.push(`${at}: unknown category ${c.category}`);
  if (!REGIONS.includes(c.region)) errs.push(`${at}: unknown region ${c.region}`);
  if (!STATUSES.includes(c.status)) errs.push(`${at}: unknown status ${c.status}`);
  if (c.status === 'seasonal' && !c.returns) warns.push(`${at}: seasonal without returns month`);
  if (!c.watch || !['youtube', 'link'].includes(c.watch.type)) {
    errs.push(`${at}: watch.type must be youtube|link`);
  } else if (c.watch.type === 'youtube') {
    if (!/^[A-Za-z0-9_-]{11}$/.test(c.watch.videoId || '')) errs.push(`${at}: bad videoId`);
    if (!/^https:\/\/(www\.)?youtube\.com\//.test(c.watch.channelUrl || '')) errs.push(`${at}: youtube cams need channelUrl`);
  } else {
    if (!/^https:\/\//.test(c.watch.url || '')) errs.push(`${at}: link cams need https watch.url`);
  }
  if (!Array.isArray(c.species) || !c.species.length) {
    warns.push(`${at}: no species listed`);
  } else {
    for (const s of c.species) {
      if (!s.name) errs.push(`${at}: species entry without name`);
      if (s.slug && !slugs.has(s.slug)) errs.push(`${at}: species slug not in /birds/: ${s.slug}`);
    }
  }
  if (c.blurb && /[–—]|--/.test(c.blurb + c.seasonText)) warns.push(`${at}: dash in copy (voice rule: no dashes)`);
}

console.log(`${cams.length} cams checked`);
for (const w of warns) console.log('WARN', w);
for (const e of errs) console.log('ERR ', e);
if (errs.length) { console.log(`FAILED: ${errs.length} errors`); process.exit(1); }
console.log('OK');
