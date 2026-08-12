// Builds ../../trips/index.html from build/trips/data/*.json + build/trips/template.html
// Run: node build/trips/generate.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const OUT_DIR = path.join(__dirname, '..', '..', 'trips');

const TYPES = [
  ['operator', 'Birding & Nature Tour Operators', 'binoculars',
    'Specialist birding companies and eco-certified nature tour operators. Certification chips link to the registry that proves them; conservation chips link to each published giving policy.'],
  ['guide', 'Local Guides & Community Programmes', 'users',
    'Vetted local guiding programmes where booking a guide keeps tourism income in the community that protects the habitat.'],
  ['lodge', 'Eco-Certified Lodges & Reserves', 'bed-double',
    'Places to stay with a real certification behind the leaf on the sign, from rainforest reserves to safari camps.'],
  ['aggregator', 'Screened Booking Platforms', 'globe',
    'Marketplaces with a genuine sustainability layer, useful when a trip needs one basket for flights of fancy.'],
];

const REGIONS = ['North America', 'Central & South America', 'Europe', 'Africa', 'Asia & Middle East', 'Australia & New Zealand'];

// BeakBrain UI rule: no emojis, lucide SVG icons only (extracted from the app's copy
// of lucide-react-native at build time, same icon language as the app).
const LUCIDE_DIR = path.join(
  __dirname, '..', '..', '..', 'Birding-Quiz-App', 'birding-app',
  'node_modules', 'lucide-react-native', 'dist', 'esm', 'icons'
);
function lucide(name, size) {
  const src = fs.readFileSync(path.join(LUCIDE_DIR, `${name}.mjs`), 'utf8');
  const shapes = [...src.matchAll(/\[\s*"(\w+)",\s*\{\s*([^}]*?)\s*\}\s*\]/g)].map(([, tag, attrs]) => {
    const a = [...attrs.matchAll(/(\w+): "([^"]*)"/g)]
      .filter(([, k]) => k !== 'key')
      .map(([, k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${v}"`)
      .join(' ');
    return `<${tag} ${a}/>`;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes}</svg>`;
}
const typeIcon = Object.fromEntries(TYPES.map(([k, , icon]) => [k, lucide(icon, 22)]));
const catTitleIcon = Object.fromEntries(TYPES.map(([k, , icon]) => [k, lucide(icon, 24)]));
const badgeCheckSvg = lucide('badge-check', 12);
const heartHandsSvg = lucide('heart-handshake', 12);
const birdSvg = lucide('bird', 12);

function esc(s) {
  return String(s).replace(/&(?!(amp|lt|gt|quot|#39|nbsp|rarr|larr|copy);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Load and merge every data file; later files can extend the roster.
let trips = [];
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'geo.json').sort()) {
  trips = trips.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
}

// De-duplicate by id, keep first occurrence.
const seen = new Set();
trips = trips.filter((t) => !seen.has(t.id) && seen.add(t.id));

// Geocoded coordinates (build/trips/geocode.js -> data/geo.json).
const GEOPATH = path.join(DATA, 'geo.json');
const geo = fs.existsSync(GEOPATH) ? JSON.parse(fs.readFileSync(GEOPATH, 'utf8')) : {};
const tripGeo = trips
  .filter((t) => geo[t.id])
  .map((t) => [t.id, geo[t.id].lon, geo[t.id].lat, t.type,
    t.name.replace(/"/g, "'"), t.location.replace(/"/g, "'")]);

const typeOf = new Map(TYPES.map(([k]) => [k, []]));
for (const t of trips) {
  if (!typeOf.has(t.type)) throw new Error(`Unknown type ${t.type} on ${t.id}`);
  typeOf.get(t.type).push(t);
}
// Badged entries first inside each section (certified, then conservation, then rest), then by name.
const rank = (t) => ((t.certifications || []).length ? 0 : hasCons(t) ? 1 : 2);
function hasCons(t) {
  const k = t.conservation && t.conservation.kind;
  return k && k !== 'none-documented' && k !== 'screening';
}
for (const arr of typeOf.values()) {
  arr.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'en'));
}

function badgeRow(t) {
  const out = [];
  for (const c of t.certifications || []) {
    const label = c.tier && c.tier !== 'Certified' ? `${c.scheme} ${c.tier}` : c.scheme;
    out.push(`<a class="bdg cert" href="${esc(c.evidence_url)}" target="_blank" rel="noopener" title="Certified: opens the registry evidence">${badgeCheckSvg}${esc(label)}</a>`);
  }
  if (hasCons(t)) {
    out.push(`<a class="bdg cons" href="${esc(t.conservation.evidence_url)}" target="_blank" rel="noopener" title="${esc(t.conservation.detail)}">${heartHandsSvg}Conservation giving</a>`);
  }
  if (t.birdy !== false && (t.birdy === true || t.type === 'guide')) {
    out.push(`<span class="bdg birdyb" title="Explicitly offers birdwatching">${birdSvg}Birding</span>`);
  }
  return out.join('');
}

function searchIndex(t) {
  const parts = [t.name, t.hq_country, t.location, t.region, ...(t.operates_in || []),
    ...(t.certifications || []).map((c) => c.scheme), t.blurb];
  return esc(parts.join(' ').toLowerCase().replace(/"/g, ''));
}

function card(t) {
  const where = (t.operates_in || []).join(', ');
  const vet = t.guide_vetting && t.guide_vetting.detail
    ? `<p class="where"><b>Vetting.</b> ${esc(t.guide_vetting.detail)}</p>` : '';
  const cons = hasCons(t) && t.conservation.detail
    ? `<p class="where"><b>Giving.</b> ${esc(t.conservation.detail)}</p>` : '';
  return `      <article class="trip" id="trip-${esc(t.id)}" data-region="${esc(t.region)}"
        data-cert="${(t.certifications || []).length ? 1 : 0}" data-cons="${hasCons(t) ? 1 : 0}"
        data-birdy="${t.birdy === true || t.type === 'guide' ? 1 : 0}" data-search="${searchIndex(t)}">
        <div class="trip-head">
          <span class="tmark ${esc(t.type)}" aria-hidden="true">${typeIcon[t.type]}</span>
          <div>
            <h3><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.name)}</a></h3>
            <p class="meta">${esc(t.location)}</p>
          </div>
        </div>
        <div class="badge-row">${badgeRow(t)}</div>
        <p class="blurb">${esc(t.blurb)}</p>
        ${vet}${cons}
        ${where ? `<p class="where"><b>Trips in.</b> ${esc(where)}</p>` : ''}
        <div class="watch-row"><a class="watch-link" href="${esc(t.url)}" target="_blank" rel="noopener">Visit website ↗</a></div>
      </article>`;
}

function section([key, title, , sub]) {
  const arr = typeOf.get(key);
  if (!arr.length) return '';
  return [
    `    <!-- ${title} -->`,
    `    <section class="cat" data-cat="${key}">`,
    `      <h2 class="cat-title">${catTitleIcon[key]}${esc(title)}</h2>`,
    `      <p class="cat-sub">${esc(sub)}</p>`,
    '      <div class="grid">',
    arr.map(card).join('\n'),
    '      </div>',
    '    </section>',
  ].join('\n');
}

const certCount = trips.filter((t) => (t.certifications || []).length).length;
const consCount = trips.filter(hasCons).length;
const heroLine = `${trips.length} tour operators, local guide programmes and lodges worldwide. ` +
  `${certCount} hold third party certifications and every badge links to its evidence.`;

const typeOpts = TYPES.filter(([k]) => typeOf.get(k).length)
  .map(([k, t]) => `            <option value="${k}">${esc(t)}</option>`).join('\n');
const regionOpts = REGIONS
  .map((r) => `            <option value="${esc(r)}">${esc(r)}</option>`).join('\n');

const finder = `    <div class="finder">
      <div class="finder-row">
        <div class="search-row">
          <input class="search" id="csearch" type="search" autocomplete="off" placeholder="Search operators, guides, lodges or places" aria-label="Search operators, guides, lodges or places" />
        </div>
        <div class="select-row">
          <select class="cselect" id="typepick" aria-label="Filter by listing type">
            <option value="">All listings</option>
${typeOpts}
          </select>
        </div>
        <div class="select-row">
          <select class="cselect" id="regpick" aria-label="Filter by region">
            <option value="">All regions</option>
${regionOpts}
          </select>
        </div>
      </div>
      <div class="status-chips" role="group" aria-label="Filter by badge">
        <button class="schip on" type="button" data-badge="">All</button>
        <button class="schip" type="button" data-badge="cert" title="Appears on a certifier's own public registry">${lucide('badge-check', 14)}Certified</button>
        <button class="schip" type="button" data-badge="cons" title="Publishes a concrete conservation giving policy">${lucide('heart-handshake', 14)}Conservation giving</button>
        <button class="schip" type="button" data-badge="birdy" title="Explicitly offers birdwatching">${lucide('bird', 14)}Birding focus</button>
      </div>
      <p class="count-note">${trips.length} listings · ${certCount} certified · ${consCount} with published giving</p>
    </div>
    <div class="mapwrap">
      <div class="tripmap" id="tripmap" role="application" aria-label="World map of every listing; dots follow the filters"></div>
      <div class="mapbar">
        <span><i class="dotleg operator"></i>Operators</span>
        <span><i class="dotleg guide"></i>Guides</span>
        <span><i class="dotleg lodge"></i>Lodges</span>
        <span class="mapnote">Hover a dot for details, click to jump to the listing.</span>
        <span class="mapbtns"><button id="mzin" type="button" aria-label="Zoom in">+</button><button id="mzout" type="button" aria-label="Zoom out">&minus;</button><button id="mzreset" type="button">Reset</button></span>
      </div>
    </div>
    <p class="empty" id="empty" hidden>Nothing matches. Try another search, or tell us who is missing and we will review them.</p>`;

const TYPELABEL = { operator: 'Tour operator', guide: 'Guide programme', lodge: 'Lodge', aggregator: 'Booking platform' };

const script = `  <script src="/assets/worldmap.js?v=2" defer></script>
  <script>
    // Interactive trips map: shared Natural Earth land + one dot per listing,
    // subset live by the same filters as the cards.
    var TRIPGEO = ${JSON.stringify(tripGeo)};
    var TYPELABEL = ${JSON.stringify(TYPELABEL)};
    (function () {
      var host = document.getElementById('tripmap');
      if (!host) return;
      function boot() {
        if (!window.BBMap) { setTimeout(boot, 60); return; }
        var NS = 'http://www.w3.org/2000/svg';
        var W = 1000, H = 394, TOP = 84, S = W / 360;
        var svg = document.createElementNS(NS, 'svg');
        var land = document.createElementNS(NS, 'g');
        for (var k in BBMap.land) {
          var p = document.createElementNS(NS, 'path');
          p.setAttribute('class', 'cmland');
          p.setAttribute('d', BBMap.land[k]);
          land.appendChild(p);
        }
        svg.appendChild(land);
        var dots = {};
        var tip = document.createElement('div');
        tip.className = 'maptip';
        tip.hidden = true;
        host.appendChild(tip);
        function showTip(d, e) {
          tip.innerHTML = '<b>' + d[4] + '</b><span>' + d[5] + '</span><span class="tt ' + d[3] + '">'
            + TYPELABEL[d[3]] + '</span><span class="go">Click for details</span>';
          tip.hidden = false;
          var r = host.getBoundingClientRect();
          var x = e.clientX - r.left + 14; var y = e.clientY - r.top + 10;
          if (x > r.width - 200) x = e.clientX - r.left - 200;
          if (y > r.height - 90) y = e.clientY - r.top - 90;
          tip.style.left = x + 'px'; tip.style.top = y + 'px';
        }
        TRIPGEO.forEach(function (d) {
          var c = document.createElementNS(NS, 'circle');
          c.setAttribute('cx', ((d[1] + 180) * S).toFixed(1));
          c.setAttribute('cy', ((TOP - Math.max(-58, Math.min(TOP, d[2]))) * S).toFixed(1));
          c.setAttribute('r', 5);
          c.setAttribute('class', 'cmdot ' + d[3]);
          c.addEventListener('pointerenter', function (e) { showTip(d, e); });
          c.addEventListener('pointermove', function (e) { showTip(d, e); });
          c.addEventListener('pointerleave', function () { tip.hidden = true; });
          c.addEventListener('click', function () {
            if (moved) return;
            tip.hidden = true;
            window.location.hash = '#trip-' + d[0];
            if (window.__jumpToTrip) window.__jumpToTrip();
          });
          svg.appendChild(c);
          dots[d[0]] = c;
        });
        host.appendChild(svg);
        var vb = { x: 0, y: 0, w: W, h: H };
        function apply() {
          svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
          var r = Math.max(1.8, 5 * vb.w / W);
          for (var id in dots) dots[id].setAttribute('r', r);
          land.setAttribute('style', 'stroke-width:' + (0.6 * vb.w / W) + 'px');
        }
        function clamp() {
          vb.x = Math.max(0, Math.min(W - vb.w, vb.x));
          vb.y = Math.max(0, Math.min(H - vb.h, vb.y));
        }
        function zoom(f, cx, cy) {
          var nw = Math.min(W, Math.max(70, vb.w * f));
          var nh = nw * H / W;
          if (cx === undefined) { cx = vb.x + vb.w / 2; cy = vb.y + vb.h / 2; }
          vb.x = cx - (cx - vb.x) * (nw / vb.w);
          vb.y = cy - (cy - vb.y) * (nh / vb.h);
          vb.w = nw; vb.h = nh; clamp(); apply();
        }
        function pt(e) {
          var r = svg.getBoundingClientRect();
          return { x: vb.x + (e.clientX - r.left) / r.width * vb.w, y: vb.y + (e.clientY - r.top) / r.height * vb.h };
        }
        svg.addEventListener('wheel', function (e) {
          e.preventDefault();
          var q = pt(e);
          zoom(e.deltaY > 0 ? 1.25 : 0.8, q.x, q.y);
        }, { passive: false });
        var drag = null; var moved = false;
        svg.addEventListener('pointerdown', function (e) {
          drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y };
          moved = false;
        });
        window.addEventListener('pointermove', function (e) {
          if (!drag) return;
          if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) moved = true;
          if (!moved) return;
          var r = svg.getBoundingClientRect();
          vb.x = drag.vx - (e.clientX - drag.x) / r.width * vb.w;
          vb.y = drag.vy - (e.clientY - drag.y) / r.height * vb.h;
          clamp(); apply();
        });
        window.addEventListener('pointerup', function () { drag = null; });
        document.getElementById('mzin').addEventListener('click', function () { zoom(0.7); });
        document.getElementById('mzout').addEventListener('click', function () { zoom(1.45); });
        document.getElementById('mzreset').addEventListener('click', function () { vb = { x: 0, y: 0, w: W, h: H }; apply(); });
        window.__updateTripMap = function (vis) {
          for (var id in dots) dots[id].style.display = vis[id] ? '' : 'none';
        };
        apply();
        if (window.__lastVisibleTrips) window.__updateTripMap(window.__lastVisibleTrips);
      }
      boot();
    })();
  </script>
  <script>
    (function () {
      var cats = Array.prototype.slice.call(document.querySelectorAll('.cat'));
      var search = document.getElementById('csearch');
      var typepick = document.getElementById('typepick');
      var regpick = document.getElementById('regpick');
      var chips = Array.prototype.slice.call(document.querySelectorAll('.schip'));
      var empty = document.getElementById('empty');
      var badge = '';

      function render() {
        var visMap = {};
        var q = (search.value || '').trim().toLowerCase();
        var type = typepick.value;
        var reg = regpick.value;
        var visible = 0;
        cats.forEach(function (sec) {
          var on = !type || sec.getAttribute('data-cat') === type;
          var shown = 0;
          Array.prototype.slice.call(sec.querySelectorAll('.trip')).forEach(function (c) {
            var hit = on
              && (!badge || c.getAttribute('data-' + badge) === '1')
              && (!reg || c.getAttribute('data-region') === reg)
              && (!q || c.getAttribute('data-search').indexOf(q) > -1);
            c.style.display = hit ? '' : 'none';
            if (hit) { shown++; visMap[c.id.slice(5)] = 1; }
          });
          sec.style.display = shown ? '' : 'none';
          visible += shown;
        });
        empty.hidden = visible !== 0;
        window.__lastVisibleTrips = visMap;
        if (window.__updateTripMap) window.__updateTripMap(visMap);
      }

      search.addEventListener('input', render);
      typepick.addEventListener('change', render);
      regpick.addEventListener('change', render);
      chips.forEach(function (ch) {
        ch.addEventListener('click', function () {
          chips.forEach(function (x) { x.classList.remove('on'); });
          ch.classList.add('on');
          badge = ch.getAttribute('data-badge');
          render();
        });
      });
      render();

      // Deep links: /trips/#trip-<id> lands on that listing with filters clear,
      // scrolled into view and briefly highlighted.
      function jumpToHash() {
        var hash = window.location.hash;
        if (!hash || hash.indexOf('#trip-') !== 0) return;
        var target = document.getElementById(hash.slice(1));
        if (!target) return;
        search.value = ''; typepick.value = ''; regpick.value = ''; badge = '';
        chips.forEach(function (x) { x.classList.toggle('on', !x.getAttribute('data-badge')); });
        render();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('flash');
        setTimeout(function () { target.classList.remove('flash'); }, 2400);
      }
      window.addEventListener('hashchange', jumpToHash);
      window.__jumpToTrip = jumpToHash;
      jumpToHash();

      var tt = document.getElementById('totop');
      if (tt) {
        window.addEventListener('scroll', function () {
          tt.classList.toggle('show', window.scrollY > 900);
        }, { passive: true });
        tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      }
    })();

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

const sections = TYPES.map(section).filter(Boolean).join('\n\n');

const out = fs
  .readFileSync(path.join(__dirname, 'template.html'), 'utf8')
  .replace('<!--HEROLINE-->', esc(heroLine))
  .replace('<!--FINDER-->', finder)
  .replace('<!--SECTIONS-->', sections)
  .replace('<!--SCRIPT-->', script);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), out);
console.log(`${trips.length} listings (${certCount} certified, ${consCount} with giving) across ${TYPES.filter(([k]) => typeOf.get(k).length).length} sections, ${(out.length / 1024).toFixed(0)} KB -> trips/index.html`);
