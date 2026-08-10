// Live-status re-check for every YouTube cam in build/cams/data/*.json.
// Run: node build/cams/checklive.js
// Fetches each watch page and reports whether YouTube says the stream is live NOW.
// Use before every deploy and at the quarterly link check alongside build/checkurls.sh.
// A cam marked status:"live" whose stream is not live needs a new videoId (streams get
// new ids when a host restarts them) or a flip to status:"seasonal".
const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA = path.join(__dirname, 'data');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'PREF=hl=en&gl=US',
      },
    }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

(async () => {
  let cams = [];
  for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).sort()) {
    cams = cams.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
  }
  const yt = cams.filter((c) => c.watch && c.watch.type === 'youtube');
  let bad = 0;
  for (const c of yt) {
    const url = 'https://www.youtube.com/watch?v=' + c.watch.videoId;
    let verdict = 'UNKNOWN';
    try {
      const { status, body } = await get(url);
      if (status !== 200) verdict = 'HTTP ' + status;
      else if (body.includes('"isLiveNow":true')) verdict = 'LIVE';
      else if (body.includes('"isLiveContent":true')) verdict = 'ENDED (was a live stream, not live now)';
      else if (body.includes('Video unavailable')) verdict = 'UNAVAILABLE';
      else verdict = 'NOT LIVE';
    } catch (e) {
      verdict = 'ERR ' + e.message;
    }
    const expectLive = c.status === 'live';
    const ok = (verdict === 'LIVE') === expectLive;
    if (!ok) bad++;
    console.log(`${ok ? 'OK  ' : 'BAD '} ${c.id.padEnd(34)} status=${c.status.padEnd(8)} yt=${verdict}`);
  }
  console.log(`\n${yt.length} YouTube cams checked, ${bad} mismatches`);
  process.exit(bad ? 1 : 0);
})();
