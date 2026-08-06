// Verifies every href in build/data/*.json (or a passed JSON file):
//   1. HTTP status must be 200 with a real browser UA
//   2. body must not look like a parked / for-sale domain
// Usage: node build/verify.js [file.json ...]   -> writes build/verify-report.txt
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const PARKED = /(this domain (name )?is for sale|buy this domain|domain (is )?for sale|hugedomains|sedoparking|parkingcrew|godaddy\.com\/domainsearch|afternic|related searches|dan\.com|namecheap parking|website coming soon|under construction)/i;

const DATA = path.join(__dirname, 'data');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).map((f) => path.join(DATA, f));

const entries = [];
for (const f of files) {
  for (const c of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    for (const r of c.regions) for (const g of r.groups) entries.push({ file: path.basename(f), country: c.name, region: r.name, ...g });
  }
}
const byUrl = new Map();
for (const e of entries) if (!byUrl.has(e.url)) byUrl.set(e.url, e);
const list = [...byUrl.values()];

function check(e) {
  return new Promise((resolve) => {
    execFile(
      'curl',
      ['-s', '-m', '25', '-A', UA, '-L', '--compressed', '-w', '\\n@@STATUS:%{http_code} %{url_effective}', e.url],
      { maxBuffer: 8 * 1024 * 1024, timeout: 40000 },
      (err, stdout) => {
        const body = String(stdout || '');
        const m = body.match(/@@STATUS:(\d+) (.*)$/);
        const code = m ? m[1] : '000';
        const finalUrl = m ? m[2] : '';
        // Facebook, Instagram and WhatsApp block headless clients outright (400/403) even for
        // pages that load fine in a browser, so a bad status there tells us nothing. Flag them
        // separately as "browser check" rather than as broken links.
        const BROWSER_ONLY = /(^|\/\/)([a-z0-9-]+\.)*(facebook\.com|fb\.com|instagram\.com|chat\.whatsapp\.com|x\.com|twitter\.com|discord\.gg|discord\.com)\//i;
        let problem = null;
        if (BROWSER_ONLY.test(e.url)) {
          resolve({ ...e, code, finalUrl, problem: code === '200' ? null : 'browser check needed' });
          return;
        }
        if (code !== '200') problem = `HTTP ${code}`;
        else {
          const head = body.slice(0, 60000);
          if (PARKED.test(head)) problem = 'PARKED/placeholder page';
          else if (/<title>[^<]{0,80}(404|not found|page not found)/i.test(head)) problem = 'soft 404';
          else if (head.replace(/<[^>]*>/g, '').trim().length < 120 && !/facebook\.com|groups\.google\.com|meetup\.com/i.test(e.url)) problem = 'near-empty body';
        }
        resolve({ ...e, code, finalUrl, problem });
      }
    );
  });
}

(async () => {
  const CONC = 14;
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      while (i < list.length) {
        const e = list[i++];
        results.push(await check(e));
        if (results.length % 50 === 0) process.stderr.write(`  ${results.length}/${list.length}\n`);
      }
    })
  );
  const bad = results.filter((r) => r.problem);
  const lines = bad.map((r) => `${r.problem}\t${r.country} / ${r.region}\t${r.name}\t${r.url}`);
  fs.writeFileSync(path.join(__dirname, 'verify-report.txt'), lines.join('\n') + '\n');
  console.log(`checked ${results.length} unique urls, ${bad.length} problems`);
  if (bad.length) console.log(lines.join('\n'));
})();
