// Fetches a real preview still (og:image) for every cam that is NOT a plain
// YouTube embed, saving it to assets/cams/<id>.jpg so link-out cards show the
// cam's own imagery instead of a category icon. Idempotent: existing files are
// kept; delete a file to refetch. Also resolves YouTube channel IDs for
// youtube.com/@handle watch URLs into data/channels.json (for the
// live_stream channel embed).
//
// Run: node build/cams/fetch-stills.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const OUT = path.join(__dirname, '..', '..', 'assets', 'cams');
const CH = path.join(DATA, 'channels.json');
fs.mkdirSync(OUT, { recursive: true });

let cams = [];
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'geo.json' && f !== 'channels.json').sort()) {
  cams = cams.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
}
const seen = new Set();
cams = cams.filter((c) => !seen.has(c.id) && seen.add(c.id));

const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh) BeakBrain-site-build/1.0 (hello@beakbrain.com)' };
const channels = fs.existsSync(CH) ? JSON.parse(fs.readFileSync(CH, 'utf8')) : {};

async function og(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/)
    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/);
  return { img: m ? m[1].replace(/&amp;/g, '&') : null, html };
}

(async () => {
  let stills = 0; let chans = 0;
  for (const c of cams) {
    const isPlainYT = c.watch.type === 'youtube';
    const url = c.watch.url || c.watch.channelUrl;
    if (isPlainYT || !url) continue;

    // Channel id for youtube.com/@handle links
    if (/youtube\.com\/@/.test(url) && !channels[c.id]) {
      try {
        const { html } = await og(url);
        const cm = html.match(/"channelId":"(UC[\w-]{22})"/) || html.match(/channel_id=(UC[\w-]{22})/);
        if (cm) { channels[c.id] = cm[1]; chans++; console.log(`${c.id}: channel ${cm[1]}`); }
        else console.warn(`! ${c.id}: no channelId found`);
      } catch (e) { console.warn(`! ${c.id}: ${e.message}`); }
      await new Promise((r) => setTimeout(r, 400));
    }

    const file = path.join(OUT, `${c.id}.jpg`);
    if (fs.existsSync(file)) continue;
    try {
      const { img } = await og(url);
      if (!img) { console.warn(`! ${c.id}: no og:image`); continue; }
      const ir = await fetch(img, { headers: UA });
      if (!ir.ok) throw new Error(`img HTTP ${ir.status}`);
      const buf = Buffer.from(await ir.arrayBuffer());
      if (buf.length < 4000) { console.warn(`! ${c.id}: image too small (${buf.length}B), skipped`); continue; }
      fs.writeFileSync(file, buf);
      stills++;
      console.log(`${c.id}: still ${(buf.length / 1024).toFixed(0)} KB <- ${img.slice(0, 70)}`);
    } catch (e) { console.warn(`! ${c.id}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 400));
  }
  fs.writeFileSync(CH, JSON.stringify(channels, null, 1));
  console.log(`done: ${stills} stills, ${chans} channel ids`);
})();
