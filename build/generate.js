// Builds ../community.html from build/data/*.json + build/template.html
// Run: node build/generate.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const CONTINENT_ORDER = [
  'International',
  'Europe',
  'North America',
  'South America',
  'Africa',
  'Asia',
  'Oceania',
];

function esc(s) {
  return String(s).replace(/&(?!(amp|lt|gt|quot|#39|nbsp|rarr|larr|copy);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Load every data file, merge by country code (later files win on duplicate codes).
const byCode = new Map();
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).sort()) {
  const rows = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
  for (const c of rows) {
    if (byCode.has(c.code)) {
      // merge regions of the same country coming from two files
      const prev = byCode.get(c.code);
      for (const r of c.regions) {
        const hit = prev.regions.find((x) => x.name === r.name);
        if (hit) hit.groups.push(...r.groups);
        else prev.regions.push(r);
      }
    } else {
      byCode.set(c.code, JSON.parse(JSON.stringify(c)));
    }
  }
}

const countries = [...byCode.values()];

// De-duplicate cards inside each country by URL, keep region order with Countrywide first.
for (const c of countries) {
  const seen = new Set();
  for (const r of c.regions) {
    r.groups = r.groups.filter((g) => {
      const k = g.url.replace(/\/$/, '').toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  c.regions = c.regions.filter((r) => r.groups.length);
  c.regions.sort((a, b) => {
    const rank = (n) => (/^countrywide$/i.test(n) ? 0 : /^(nationwide|national)$/i.test(n) ? 0 : 1);
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'en');
  });
}

countries.sort((a, b) => {
  const ca = CONTINENT_ORDER.indexOf(a.continent);
  const cb = CONTINENT_ORDER.indexOf(b.continent);
  if (ca !== cb) return ca - cb;
  return a.name.localeCompare(b.name, 'en');
});

// Drop countries left with zero groups after de-duplication (e.g. a genuinely thin
// country whose research found nothing of its own, documented in its `gaps` array
// instead) — an empty button and section would just be dead UI.
const nonEmpty = countries.filter((c) => c.regions.some((r) => r.groups.length));
const intl = nonEmpty.filter((c) => c.continent === 'International');
const rest = nonEmpty.filter((c) => c.continent !== 'International');

const totalGroups = countries.reduce((n, c) => n + c.regions.reduce((m, r) => m + r.groups.length, 0), 0);

function card(g) {
  return `        <a class="card" href="${g.url}" target="_blank" rel="noopener"><div class="top"><h3>${esc(g.name)}</h3></div><p class="blurb">${esc(g.blurb)}</p><div class="arrow">Visit →</div></a>`;
}

function section(c) {
  const cont = c.continent === 'International' ? 'INT' : c.continent;
  const search = [c.name, c.code, ...(c.aka || [])].join(' ').toLowerCase();
  const lines = [
    `    <!-- ${c.name} -->`,
    `    <section class="country" data-country="${c.code}" data-continent="${esc(cont)}" data-search="${esc(search)}">`,
    `      <h2 class="country-title">${c.flag} ${esc(c.name)}</h2>`,
  ];
  for (const r of c.regions) {
    lines.push(`      <div class="region-label">${esc(r.name)}</div>`);
    lines.push('      <div class="grid">');
    for (const g of r.groups) lines.push(card(g));
    lines.push('      </div>');
  }
  lines.push('    </section>');
  return lines.join('\n');
}

// ---- chooser ----
const continents = CONTINENT_ORDER.filter((k) => k !== 'International' && rest.some((c) => c.continent === k));
const contBtns = [
  `      <button type="button" class="choice active" data-cont="all">🌍 Everywhere</button>`,
  ...continents.map((k) => `      <button type="button" class="choice" data-cont="${esc(k)}">${esc(k)}</button>`),
].join('\n');

const countryBtns = rest
  .map(
    (c) =>
      `      <button type="button" class="choice" data-country="${c.code}" data-continent="${esc(c.continent)}" data-search="${esc([c.name, c.code, ...(c.aka || [])].join(' ').toLowerCase())}">${c.flag} ${esc(c.name)}</button>`
  )
  .join('\n');

const chooser = `    <div class="finder">
      <div class="search-row">
        <span class="search-icon">🔎</span>
        <input class="search" id="csearch" type="search" autocomplete="off" placeholder="Search a country or territory" aria-label="Search a country or territory" />
      </div>
      <div class="chooser continents" id="continents">
${contBtns}
      </div>
      <div class="chooser countries" id="countries">
${countryBtns}
      </div>
      <p class="count-note">${rest.length} countries and territories, ${totalGroups} groups. Pick one to see its clubs, societies and projects.</p>
    </div>
    <p class="empty" id="empty" hidden>No match yet. Try another spelling, or tell us who is missing and we will add them.</p>`;

const sections = [...intl.map(section), ...rest.map(section)].join('\n\n');

const script = `  <script>
    (function () {
      var contBtns = Array.prototype.slice.call(document.querySelectorAll('#continents .choice'));
      var cBtns = Array.prototype.slice.call(document.querySelectorAll('#countries .choice'));
      var secs = Array.prototype.slice.call(document.querySelectorAll('.country'));
      var search = document.getElementById('csearch');
      var empty = document.getElementById('empty');
      var cont = 'all';
      var country = null;

      function render() {
        var q = (search.value || '').trim().toLowerCase();
        var visible = 0;
        cBtns.forEach(function (b) {
          var okCont = cont === 'all' || b.getAttribute('data-continent') === cont;
          var okQ = !q || b.getAttribute('data-search').indexOf(q) > -1;
          var show = okCont && okQ;
          b.hidden = !show;
          if (show) visible++;
          b.classList.toggle('active', country === b.getAttribute('data-country'));
        });
        contBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-cont') === cont); });
        empty.hidden = visible !== 0;

        secs.forEach(function (s) {
          var code = s.getAttribute('data-country');
          if (s.getAttribute('data-continent') === 'INT') { s.style.display = ''; return; }
          var show;
          if (country) show = code === country;
          else if (q) show = s.getAttribute('data-search').indexOf(q) > -1 && (cont === 'all' || s.getAttribute('data-continent') === cont);
          else show = false;
          s.style.display = show ? '' : 'none';
        });
      }

      contBtns.forEach(function (b) {
        b.addEventListener('click', function () {
          cont = b.getAttribute('data-cont');
          country = null;
          render();
        });
      });
      cBtns.forEach(function (b) {
        b.addEventListener('click', function () {
          var code = b.getAttribute('data-country');
          country = country === code ? null : code;
          render();
          if (country) {
            var s = document.querySelector('.country[data-country="' + code + '"]');
            if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
      search.addEventListener('input', function () { country = null; render(); });
      render();
    })();

    // Hero and footer video fade in once loaded; skipped entirely for reduced motion.
    (function () {
      var vids = document.querySelectorAll('.hero-video');
      if (!vids.length) return;
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      vids.forEach(function (v) {
        if (reduce) { v.remove(); return; }
        v.addEventListener('loadeddata', function () { v.classList.add('ready'); });
        var p = v.play();
        if (p && p.catch) { p.catch(function () {}); }
      });
    })();

    // Nav: transparent over the hero, solid once you scroll onto the page.
    (function () {
      var header = document.querySelector('header');
      var hero = document.querySelector('.hero');
      if (!header) return;
      function update() {
        var threshold = hero ? hero.offsetHeight - 80 : 120;
        if (window.scrollY > threshold) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      }
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    })();
  </script>`;

const out = fs
  .readFileSync(path.join(__dirname, 'template.html'), 'utf8')
  .replace('<!--CHOOSER-->', chooser)
  .replace('<!--SECTIONS-->', sections)
  .replace('<!--SCRIPT-->', script);

fs.writeFileSync(path.join(__dirname, '..', 'community.html'), out);
console.log(`${rest.length} countries + ${intl.length} international section(s), ${totalGroups} groups, ${(out.length / 1024).toFixed(0)} KB`);
