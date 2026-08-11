// Snapshots the CURRENT plate cutouts into ~/Developer/beakbrain-cards, the
// static asset project that serves card art to both beakbrain.com and the app
// (its own Cloudflare Pages project: the main site sits near the 20,000-file
// Pages cap, so art lives in a separate project by design).
//
// Reads pipeline/plates/out/plates_manifest.jsonl READ-ONLY and copies each
// ok plate whose file exists. Safe to run while the cutout pipeline is live:
// it never writes into the pipeline tree. Re-run any time to pick up new cuts,
// then redeploy:
//
//   node build/cards/snapshot-plates.js
//   cd ~/Developer/beakbrain-cards && npx wrangler pages deploy . --project-name beakbrain-cards
//
// Also writes cards-manifest.json (id -> plate metadata incl. pixel size and
// credit fields) which generate.js and the app both read, so every consumer
// renders from the same snapshot.
const fs = require('fs');
const path = require('path');
const os = require('os');

const PIPE = path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'pipeline', 'plates');
const DEST = path.join(os.homedir(), 'Developer', 'beakbrain-cards');
const PLATES_OUT = path.join(DEST, 'plates');

function webpSize(buf) {
  const four = buf.toString('ascii', 12, 16);
  if (four === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (four === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (four === 'VP8L') { const b = buf.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) }; }
  return null;
}

fs.mkdirSync(PLATES_OUT, { recursive: true });

const manifest = {};
let copied = 0, skipped = 0;
for (const line of fs.readFileSync(path.join(PIPE, 'out/plates_manifest.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let rec; try { rec = JSON.parse(line); } catch { continue; } // live manifest append
  if (rec.status !== 'ok' || !rec.file) continue;
  const src = path.join(PIPE, rec.file);
  if (!fs.existsSync(src)) { skipped++; continue; }
  const base = path.basename(rec.file);
  let dim = null;
  try {
    const buf = fs.readFileSync(src);
    dim = webpSize(buf);
    fs.writeFileSync(path.join(PLATES_OUT, base), buf);
  } catch { skipped++; continue; }
  manifest[rec.species_id] = {
    file: `plates/${base}`,
    w: dim ? dim.w : undefined,
    h: dim ? dim.h : undefined,
    artist: rec.artist || undefined,
    title: rec.title || undefined,
    year: rec.year || undefined,
    licence: rec.licence || undefined,
    source_url: rec.source_url || undefined,
    rung: rec.rung || 1,
  };
  copied++;
}

// Stale plates from earlier snapshots (species re-cut under a new name, or
// dropped from the manifest) are removed so the deploy mirrors the manifest.
const want = new Set(Object.values(manifest).map((m) => path.basename(m.file)));
let removed = 0;
for (const f of fs.readdirSync(PLATES_OUT)) {
  if (!want.has(f)) { fs.unlinkSync(path.join(PLATES_OUT, f)); removed++; }
}

fs.writeFileSync(path.join(DEST, 'cards-manifest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: copied,
  plates: manifest,
}));

// Open CORS (the app PWA fetches the manifest cross-origin), long asset cache,
// and noindex: card art is for BeakBrain surfaces, not for image search.
fs.writeFileSync(path.join(DEST, '_headers'), `/*
  Access-Control-Allow-Origin: *
  X-Robots-Tag: noindex
/plates/*
  Cache-Control: public, max-age=86400
`);
fs.writeFileSync(path.join(DEST, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

console.log(`plates: ${copied} copied, ${skipped} missing, ${removed} stale removed -> ${PLATES_OUT}`);
console.log(`manifest: ${Object.keys(manifest).length} entries -> cards-manifest.json`);
