// Probe YouTube channels' /streams tab for currently-live streams (2026 lockupViewModel layout).
// Usage: node probe-channels.js <channelUrl> [...]         -> live streams per channel
//        node probe-channels.js --resolve "<name>" [...]   -> resolve channel by search
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'PREF=hl=en&gl=US',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(new URL(res.headers.location, url).href));
      }
      if (res.statusCode !== 200) return resolve({ status: res.statusCode, body: '' });
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: 200, body }));
    }).on('error', reject);
  });
}

function initialData(html) {
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function findLiveLockups(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.lockupViewModel) {
    const l = node.lockupViewModel;
    const s = JSON.stringify(l);
    if (s.includes('THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE')) {
      const id = l.contentId || (s.match(/animationActivationTargetId":"([^"]+)"/) || [])[1];
      let title = '';
      try { title = l.metadata.lockupMetadataViewModel.title.content || ''; } catch {}
      if (!title) title = (s.match(/"title":\{"content":"([^"]{0,120})"/) || [, ''])[1];
      if (id) out.push({ id, title });
    }
  }
  // legacy renderer, just in case
  if (node.videoRenderer) {
    const v = node.videoRenderer;
    const s = JSON.stringify(v.thumbnailOverlays || []) + JSON.stringify(v.badges || []);
    if (s.includes('"style":"LIVE"') || s.includes('BADGE_STYLE_TYPE_LIVE_NOW')) {
      const title = (v.title && v.title.runs && v.title.runs.map(r => r.text).join('')) || '';
      out.push({ id: v.videoId, title });
    }
  }
  for (const k of Object.keys(node)) findLiveLockups(node[k], out);
}

function findChannels(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.channelRenderer) {
    const c = node.channelRenderer;
    const name = (c.title && c.title.simpleText) || '';
    const url = (c.navigationEndpoint && c.navigationEndpoint.browseEndpoint && c.navigationEndpoint.browseEndpoint.canonicalBaseUrl) || ('/channel/' + c.channelId);
    const subs = (c.videoCountText && (c.videoCountText.simpleText || (c.videoCountText.runs || []).map(r => r.text).join(''))) || '';
    out.push({ name, url: 'https://www.youtube.com' + url, id: c.channelId, subs });
  }
  for (const k of Object.keys(node)) findChannels(node[k], out);
}

(async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--resolve') {
    for (const q of args.slice(1)) {
      const { status, body } = await get('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=EgIQAg%253D%253D');
      console.log(`QUERY ${q}`);
      if (status !== 200) { console.log(`FAIL http ${status}`); continue; }
      const data = initialData(body);
      if (!data) { console.log('FAIL no data'); continue; }
      const chans = [];
      findChannels(data, chans);
      for (const c of chans.slice(0, 3)) console.log(`CH ${c.id} ${c.url} | ${c.name} | ${c.subs}`);
      if (!chans.length) console.log('NONE');
    }
    return;
  }
  for (const base of args) {
    const url = base.replace(/\/$/, '') + '/streams';
    try {
      const { status, body } = await get(url);
      if (status !== 200) { console.log(`CHANNEL ${base}\nFAIL http ${status}`); continue; }
      const data = initialData(body);
      if (!data) { console.log(`CHANNEL ${base}\nFAIL no ytInitialData`); continue; }
      const live = [];
      findLiveLockups(data, live);
      const seen = new Set();
      const uniq = live.filter(v => !seen.has(v.id) && seen.add(v.id));
      console.log(`CHANNEL ${base}`);
      if (!uniq.length) console.log('NONE');
      for (const v of uniq) console.log(`LIVE ${v.id} ${v.title.slice(0, 100)}`);
    } catch (e) {
      console.log(`CHANNEL ${base}\nFAIL ${e.message}`);
    }
  }
})();
