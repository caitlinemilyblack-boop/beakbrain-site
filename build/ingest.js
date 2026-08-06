// Validates build/data/incoming/*.json and merges them into the numbered continent files.
// Run: node build/ingest.js [--dry]
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const IN = path.join(DATA, 'incoming');
const FILE_FOR = {
  International: '00-international.json',
  Europe: '10-europe.json',
  'North America': '20-north-america.json',
  'South America': '30-south-america.json',
  Africa: '40-africa.json',
  Asia: '50-asia.json',
  Oceania: '60-oceania.json',
};

const dry = process.argv.includes('--dry');
const problems = [];
const incoming = [];

for (const f of fs.readdirSync(IN).filter((f) => f.endsWith('.json')).sort()) {
  let rows;
  try {
    rows = JSON.parse(fs.readFileSync(path.join(IN, f), 'utf8'));
  } catch (e) {
    problems.push(`${f}: INVALID JSON ${e.message}`);
    continue;
  }
  if (!Array.isArray(rows)) {
    problems.push(`${f}: top level must be an array`);
    continue;
  }
  for (const c of rows) {
    for (const k of ['code', 'name', 'flag', 'continent', 'regions']) {
      if (!c[k]) problems.push(`${f} ${c.code || c.name}: missing ${k}`);
    }
    if (!FILE_FOR[c.continent]) problems.push(`${f} ${c.code}: bad continent "${c.continent}"`);
    if (c.code && !/^[A-Z]{2}$|^INT$/.test(c.code)) problems.push(`${f} ${c.code}: code must be ISO alpha 2`);
    for (const r of c.regions || []) {
      if (!r.name || !Array.isArray(r.groups)) { problems.push(`${f} ${c.code}: bad region ${JSON.stringify(r).slice(0, 80)}`); continue; }
      for (const g of r.groups) {
        const where = `${f} ${c.code}/${r.name}/${g.name || '?'}`;
        if (!g.name || !g.url || !g.blurb) { problems.push(`${where}: missing name/url/blurb`); continue; }
        if (!/^https:\/\//.test(g.url)) problems.push(`${where}: url is not https (${g.url})`);
        if (/[-–—]/.test(g.blurb)) problems.push(`${where}: DASH in blurb -> ${g.blurb}`);
        if (g.blurb.length > 170) problems.push(`${where}: blurb too long (${g.blurb.length})`);
      }
    }
    incoming.push({ file: f, country: c });
  }
}

// global duplicate url check across incoming + existing
const seen = new Map();
function noteUrls(country, src) {
  for (const r of country.regions || []) {
    for (const g of r.groups || []) {
      const k = g.url.replace(/\/+$/, '').toLowerCase();
      if (seen.has(k)) problems.push(`DUPLICATE url ${g.url}: ${seen.get(k)} and ${src}`);
      else seen.set(k, src);
    }
  }
}
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json'))) {
  for (const c of JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))) noteUrls(c, `${f}:${c.code}`);
}
for (const { file, country } of incoming) noteUrls(country, `${file}:${country.code}`);

console.log(`${incoming.length} country objects in incoming/`);
for (const { file, country: c } of incoming) {
  const n = (c.regions || []).reduce((m, r) => m + (r.groups || []).length, 0);
  console.log(`  ${c.code} ${c.name}: ${(c.regions || []).length} regions, ${n} groups   [${file}]`);
}
if (problems.length) {
  console.log(`\n${problems.length} PROBLEMS:`);
  console.log(problems.join('\n'));
}
if (dry) process.exit(problems.length ? 1 : 0);

// merge (replace any existing country with the same code)
const buckets = new Map();
for (const [cont, file] of Object.entries(FILE_FOR)) {
  const p = path.join(DATA, file);
  buckets.set(cont, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : []);
}
for (const { country: c } of incoming) {
  const arr = buckets.get(c.continent);
  if (!arr) continue;
  const i = arr.findIndex((x) => x.code === c.code);
  if (i > -1) arr[i] = c;
  else arr.push(c);
}
for (const [cont, file] of Object.entries(FILE_FOR)) {
  const arr = buckets.get(cont);
  arr.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(arr, null, 2));
}
// archive the ingested files
const done = path.join(IN, 'ingested');
fs.mkdirSync(done, { recursive: true });
for (const f of fs.readdirSync(IN).filter((f) => f.endsWith('.json'))) fs.renameSync(path.join(IN, f), path.join(done, f));
console.log('\nmerged into continent files, incoming archived to incoming/ingested/');
