// Finds the best openly licensed video per species on Wikimedia Commons and
// writes build/species/videos.json for the page generator.
//
//   node build/species/fetch-videos.js [--limit N]
//
// Why Commons and nothing else: it is the only source that is species-keyed
// (taxon categories), machine-readable on licence AND author, and directly
// hotlinkable, all free. YouTube's CC filter is embed-only and unverifiable at
// this scale; Internet Archive is poorly species-keyed; Macaulay Library is
// rights-reserved.
//
// Licence policy, mirroring the audio precedent (owner decision 2026-07-15):
// the page STREAMS the file unmodified with visible credit, so CC BY-SA is
// acceptable alongside CC0, CC BY and public domain. NC and ND are rejected,
// always. Every kept entry records author, licence and source page, and the
// generator refuses a banner without a credit.
//
// One request per species against Category:<scientific name>, 2 req/s,
// cached on disk, resumable. Full pass is roughly 80 minutes; re-runs are
// free. Cache lives in the app pipeline's cache area, outside the site tree,
// so deploys never upload it.
const fs = require('fs');
const path = require('path');
const os = require('os');

const REGIONS = path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'birding-app', 'assets', 'regions');
const CACHE = path.join(os.homedir(), 'Developer', 'Birding-Quiz-App', 'pipeline', 'cache', 'commons-videos');
const OUT = path.join(__dirname, 'videos.json');

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'BeakBrain/1.0 (https://beakbrain.com; caitlin.emily.black@gmail.com) species-video-fetch';
const GAP_MS = 500;

const REJECT_LICENCE = /\bnc\b|\bnd\b|-nc|-nd|non[- ]commercial|no[- ]derivat/i;
const ACCEPT_LICENCE = /public domain|\bpd\b|cc0|cc[- ]by/i;
const REJECT_TITLE = /specimen|taxidermy|museum|mounted|skeleton|skull|plucking|dead|roadkill|window strike/i;

const world = JSON.parse(fs.readFileSync(path.join(REGIONS, 'world.json'), 'utf8'));
const limitArg = process.argv.indexOf('--limit');
let list = [...world.species].sort((a, b) => b.commonness - a.commonness);
if (limitArg > -1) list = list.slice(0, Number(process.argv[limitArg + 1]));

fs.mkdirSync(CACHE, { recursive: true });

function strip(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function commons(sci) {
  const cachePath = path.join(CACHE, sci.replace(/[^A-Za-z0-9]+/g, '_') + '.json');
  if (fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2',
    generator: 'categorymembers', gcmtitle: `Category:${sci}`,
    gcmtype: 'file', gcmlimit: '500',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '960',
  });
  const r = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${sci}`);
  const data = await r.json();
  fs.writeFileSync(cachePath, JSON.stringify(data));
  await new Promise((res) => setTimeout(res, GAP_MS));
  return data;
}

function pick(data, sci) {
  const out = [];
  for (const pg of data?.query?.pages || []) {
    const info = (pg.imageinfo || [])[0];
    if (!info || !/^video\//.test(info.mime || '')) continue;
    if (REJECT_TITLE.test(pg.title)) continue;
    const ext = info.extmetadata || {};
    const lic = strip(`${ext.LicenseShortName?.value || ''} ${ext.UsageTerms?.value || ''}`);
    if (REJECT_LICENCE.test(lic) || !ACCEPT_LICENCE.test(lic)) continue;
    const w = info.width || 0; const h = info.height || 0;
    const dur = info.duration || 0;
    let score = Math.min(w * h, 1920 * 1080);
    if (dur >= 4 && dur <= 180) score *= 1.5;        // banner-sized clips win
    else if (dur > 400) score *= 0.4;                // whole documentaries lose
    if (info.mime === 'video/webm') score *= 1.2;    // widest browser support
    out.push({
      url: info.url,
      poster: info.thumburl || null,
      mime: info.mime,
      width: w, height: h, duration: Math.round(dur) || null,
      title: pg.title.replace(/^File:/, ''),
      credit: strip(ext.Artist?.value) || 'unknown',
      licence: strip(ext.LicenseShortName?.value) || lic,
      licenceUrl: ext.LicenseUrl?.value || null,
      source: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(pg.title)}`,
      score,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 3).map(({ score, ...rest }) => rest);
}

(async () => {
  const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).videos || {} : {};
  const videos = { ...existing };
  let done = 0; let found = Object.keys(existing).length; let failed = 0;
  for (const s of list) {
    if (s.id in videos || !s.id) { done++; continue; }
    try {
      const cands = pick(await commons(s.sci), s.sci);
      if (cands.length) { videos[s.id] = cands; found++; }
      else videos[s.id] = [];               // remembered so re-runs skip it
    } catch (e) {
      failed++;
      if (failed <= 5) console.error(`! ${s.sci}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 5000));
    }
    done++;
    if (done % 200 === 0) {
      fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), videos }));
      console.log(`${done}/${list.length} probed, ${found} species with video, ${failed} failed`);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), videos }));
  const withVideo = Object.values(videos).filter((v) => v.length).length;
  console.log(`done: ${done} probed | ${withVideo} species have a licensed video | ${failed} failed`);
})();
