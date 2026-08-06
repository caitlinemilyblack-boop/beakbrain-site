// One-off: pull the hand-authored NL + ZA sections out of community.html into data JSON.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../community.html', 'utf8');

const meta = {
  NL: { name: 'Netherlands', flag: '🇳🇱', continent: 'Europe' },
  ZA: { name: 'South Africa', flag: '🇿🇦', continent: 'Africa' },
};

const out = [];
const secRe = /<section class="country" data-country="([A-Z]{2})">([\s\S]*?)<\/section>/g;
let m;
while ((m = secRe.exec(html))) {
  const code = m[1];
  const body = m[2];
  const regions = [];
  const parts = body.split(/<div class="region-label">/).slice(1);
  for (const p of parts) {
    const name = p.slice(0, p.indexOf('</div>')).trim();
    const groups = [];
    const cardRe = /<a class="card" href="([^"]+)"[^>]*><div class="top"><h3>([\s\S]*?)<\/h3><\/div><p class="blurb">([\s\S]*?)<\/p>/g;
    let c;
    while ((c = cardRe.exec(p))) groups.push({ name: c[2].trim(), url: c[1], blurb: c[3].trim() });
    regions.push({ name, groups });
  }
  out.push({ code, ...meta[code], regions });
}

fs.writeFileSync(__dirname + '/data/seed.json', JSON.stringify(out, null, 2));
console.log(out.map((c) => `${c.code} ${c.regions.length} regions ${c.regions.reduce((n, r) => n + r.groups.length, 0)} groups`).join('\n'));
