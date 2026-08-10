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
  'Antarctica',
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

// Search index for one element: lowercased, quotes stripped so it is safe inside a
// double-quoted attribute.
function index(parts) {
  return esc(parts.join(' ').toLowerCase().replace(/"/g, ''));
}

function section(c) {
  const cont = c.continent === 'International' ? 'INT' : c.continent;
  const lines = [
    `    <!-- ${c.name} -->`,
    `    <section class="country" data-country="${c.code}" data-continent="${esc(cont)}" data-search="${index([c.name, c.code, ...(c.aka || [])])}">`,
    `      <h2 class="country-title">${esc(c.name)}</h2>`,
  ];
  for (const r of c.regions) {
    // Region carries its own index (region name + every group name in it) so a search for
    // "Bavaria" or "Brookline Bird Club" can open the right country at the right region.
    lines.push(`      <div class="region" data-search="${index([r.name, ...r.groups.map((g) => g.name), ...r.groups.map((g) => g.blurb || '')])}">`);
    lines.push(`        <div class="region-label">${esc(r.name)}</div>`);
    lines.push('        <div class="grid">');
    for (const g of r.groups) lines.push(card(g));
    lines.push('        </div>');
    lines.push('      </div>');
  }
  lines.push('    </section>');
  return lines.join('\n');
}

// ---- chooser ----
// One dropdown, grouped by continent, in place of the old continent tabs plus a row of
// every country button: that row stopped being usable well before 190 countries.
const byContinent = new Map();
for (const c of rest) {
  if (!byContinent.has(c.continent)) byContinent.set(c.continent, []);
  byContinent.get(c.continent).push(c);
}
// The international section leads the list as a picker option of its own, so you can get
// back to it after looking at a country without reaching for the browser's back button.
const intlOpts = intl
  .map((c) => `            <option value="${c.code}">${esc(c.name)}</option>`)
  .join('\n');

const optgroups = CONTINENT_ORDER.filter((k) => byContinent.has(k))
  .map((k) => {
    const opts = byContinent
      .get(k)
      .map((c) => `            <option value="${c.code}">${esc(c.name)}</option>`)
      .join('\n');
    return `          <optgroup label="${esc(k)}">\n${opts}\n          </optgroup>`;
  })
  .join('\n');

const chooser = `    <div class="finder">
      <div class="finder-row">
        <div class="search-row">
          <input class="search" id="csearch" type="search" autocomplete="off" placeholder="Search a country, region or group" aria-label="Search a country, region or group" />
        </div>
        <div class="select-row">
          <select class="cselect" id="cpick" aria-label="Pick a country or territory">
            <option value="">Choose your location</option>
${intlOpts}
${optgroups}
          </select>
        </div>
      </div>
      <p class="count-note">${rest.length} countries \u00b7 ${totalGroups} groups</p>
    </div>
    <p class="empty" id="empty" hidden>No match yet. Try another spelling, or tell us who is missing and we will add them.</p>`;

const sections = [...intl.map(section), ...rest.map(section)].join('\n\n');

const script = `  <script>
    (function () {
      var secs = Array.prototype.slice.call(document.querySelectorAll('.country'));
      var search = document.getElementById('csearch');
      var pick = document.getElementById('cpick');
      var empty = document.getElementById('empty');

      // No query and no country picked: the worldwide section is what you see.
      // A query matches a country's own name, any region name, or any group name; when the
      // match is a region or a group, only the regions that matched stay open.
      function render() {
        var q = (search.value || '').trim().toLowerCase();
        var code = pick.value;
        var visible = 0;

        secs.forEach(function (s) {
          var regions = Array.prototype.slice.call(s.querySelectorAll('.region'));
          var isIntl = s.getAttribute('data-continent') === 'INT';
          var on;

          if (q) {
            var whole = s.getAttribute('data-search').indexOf(q) > -1;
            on = whole;
            regions.forEach(function (r) {
              var hit = whole || r.getAttribute('data-search').indexOf(q) > -1;
              r.hidden = !hit;
              if (hit) on = true;
            });
          } else {
            regions.forEach(function (r) { r.hidden = false; });
            // The dropdown picks exactly one section. Nothing picked means the international
            // one, which is also selectable by name to get back to it from a country.
            on = code ? s.getAttribute('data-country') === code : isIntl;
          }

          if (on) visible++;
          s.style.display = on ? '' : 'none';
        });

        empty.hidden = !(q && visible === 0);
      }

      search.addEventListener('input', function () {
        if (search.value.trim()) pick.value = '';
        render();
      });
      pick.addEventListener('change', function () {
        search.value = '';
        render();
        if (pick.value) {
          var s = document.querySelector('.country[data-country="' + pick.value + '"]');
          if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
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
