// Captures a real footage still for every LINK-type cam in data/cams.json, so the
// directory always shows cam footage instead of placeholder icons.
//   - watch.url on youtube.com  -> latest upload/stream thumbnail from i.ytimg.com
//   - anything else             -> headless Chrome screenshot of the page's player
// Output: ../../assets/cams/<id>.jpg (480x270-ish JPEG via sips).
// Rerun at the quarterly check so stills stay current. Embedded YouTube cams need
// nothing here, their cards use the live i.ytimg.com thumbnail directly.
//
// Run: node build/cams/capture-thumbs.js [--only id1,id2]
// Needs: puppeteer-core (npm i puppeteer-core anywhere on NODE_PATH or alongside)
//        and Google Chrome at the standard macOS path.
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const DATA = path.join(__dirname, 'data');
const OUT = path.join(__dirname, '..', '..', 'assets', 'cams');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let puppeteer;
try { puppeteer = require('puppeteer-core'); } catch {
  try { puppeteer = require(path.join(process.env.HOME, 'node_modules', 'puppeteer-core')); } catch {}
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Cookie': 'PREF=hl=en&gl=US',
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(new URL(res.headers.location, url).href));
      }
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

// First video id on a channel's /streams (falling back to /videos) tab.
async function latestVideoId(channelUrl) {
  for (const tab of ['/streams', '/videos']) {
    const { status, body } = await get(channelUrl.replace(/\/$/, '') + tab);
    if (status !== 200) continue;
    const m = body.toString('utf8').match(/"lockupViewModel":\{"contentImage".*?"contentId":"([A-Za-z0-9_-]{11})"/);
    if (m) return m[1];
  }
  return null;
}

async function saveYtThumb(videoId, file) {
  for (const name of ['maxresdefault', 'hqdefault']) {
    const { status, body } = await get(`https://i.ytimg.com/vi/${videoId}/${name}.jpg`);
    if (status === 200 && body.length > 2000) { fs.writeFileSync(file, body); return true; }
  }
  return false;
}

async function screenshotPage(browser, url, file) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    // Dismiss the common consent banners, then give players time to start.
    for (const sel of ['#onetrust-accept-btn-handler', 'button[aria-label*="ccept"]', '.cc-allow', 'button.accept']) {
      await page.$(sel).then((b) => b && b.click().catch(() => {})).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 9000));
    // Prefer the biggest video/iframe on the page; else the viewport.
    const box = await page.evaluate(() => {
      let best = null;
      for (const el of document.querySelectorAll('video, iframe')) {
        const r = el.getBoundingClientRect();
        if (r.width > 300 && r.height > 160 && (!best || r.width * r.height > best.w * best.h)) {
          best = { x: r.x, y: r.y, w: r.width, h: r.height };
        }
      }
      return best;
    });
    if (box) {
      await page.screenshot({
        path: file, type: 'jpeg', quality: 80,
        clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.w, 1280), height: Math.min(box.h, 720) },
      });
    } else {
      await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
    }
    return true;
  } catch (e) {
    console.log('  screenshot failed:', e.message);
    return false;
  } finally {
    await page.close().catch(() => {});
  }
}

(async () => {
  let cams = [];
  for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).sort()) {
    cams = cams.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
  }
  const only = (process.argv.find((a) => a.startsWith('--only')) || '').split('=')[1];
  let links = cams.filter((c) => c.watch && c.watch.type === 'link');
  if (only) links = links.filter((c) => only.split(',').includes(c.id));
  fs.mkdirSync(OUT, { recursive: true });

  const needBrowser = links.some((c) => !/youtube\.com/.test(c.watch.url));
  const browser = needBrowser && puppeteer
    ? await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] })
    : null;

  for (const c of links) {
    const file = path.join(OUT, `${c.id}.jpg`);
    let ok = false;
    if (/youtube\.com/.test(c.watch.url)) {
      const vid = await latestVideoId(c.watch.url);
      if (vid) ok = await saveYtThumb(vid, file);
      console.log(`${ok ? 'OK ' : 'MISS'} ${c.id} (yt ${vid || 'none'})`);
    } else if (browser) {
      ok = await screenshotPage(browser, c.watch.url, file);
      console.log(`${ok ? 'OK ' : 'MISS'} ${c.id} (shot)`);
    } else {
      console.log(`SKIP ${c.id} (no browser)`);
    }
    if (ok) {
      try { execSync(`sips --resampleWidth 480 "${file}" >/dev/null 2>&1`); } catch {}
    }
  }
  if (browser) await browser.close();
  console.log('done ->', OUT);
})();
