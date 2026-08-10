// Builds ../../cams/index.html from build/cams/data/*.json + build/cams/template.html
// Run: node build/cams/generate.js
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const OUT_DIR = path.join(__dirname, '..', '..', 'cams');

const CATEGORIES = [
  ['eagles', 'Eagles, Hawks & Vultures'],
  ['ospreys', 'Ospreys'],
  ['falcons', 'Falcons & Kestrels'],
  ['owls', 'Owls'],
  ['feeders', 'Feeders & Gardens'],
  ['tropical', 'Tropical Feeders & Forest'],
  ['seabirds', 'Seabirds, Penguins & Shorebirds'],
  ['wetlands', 'Wetlands, Waterholes & Wild Places'],
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
const CATEGORY_ICON = {
  eagles: 'bird', ospreys: 'fish', falcons: 'feather', owls: 'moon',
  feeders: 'bird', tropical: 'tree-palm', seabirds: 'waves-horizontal', wetlands: 'trees',
};
const catIconSvg = Object.fromEntries(
  Object.entries(CATEGORY_ICON).map(([cat, icon]) => [cat, lucide(icon, 56)])
);

function esc(s) {
  return String(s).replace(/&(?!(amp|lt|gt|quot|#39|nbsp|rarr|larr|copy);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Load and merge every data file; later files can extend the roster.
let cams = [];
for (const f of fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'geo.json' && f !== 'channels.json').sort()) {
  cams = cams.concat(JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
}

// De-duplicate by id, keep first occurrence.
const seen = new Set();
cams = cams.filter((c) => !seen.has(c.id) && seen.add(c.id));

// Resolved YouTube channel ids (fetch-stills.js -> data/channels.json) for
// seasonal cams that live on a channel: embedded via the live_stream endpoint,
// which auto-plays whatever the channel streams when it returns.
const CHPATH = path.join(DATA, 'channels.json');
const channels = fs.existsSync(CHPATH) ? JSON.parse(fs.readFileSync(CHPATH, 'utf8')) : {};
// Self-hosted preview stills (fetch-stills.js -> assets/cams/<id>.jpg).
const stillOf = (id) => (fs.existsSync(path.join(__dirname, '..', '..', 'assets', 'cams', `${id}.jpg`)) ? `/assets/cams/${id}.jpg` : null);

// Geocoded coordinates (build/cams/geocode.js -> data/geo.json).
const GEOPATH = path.join(DATA, 'geo.json');
const geo = fs.existsSync(GEOPATH) ? JSON.parse(fs.readFileSync(GEOPATH, 'utf8')) : {};
const camGeo = cams
  .filter((c) => geo[c.id])
  .map((c) => [c.id, geo[c.id].lon, geo[c.id].lat, c.status,
    c.name.replace(/"/g, "'"), c.location.replace(/"/g, "'"), c.returns || '']);

const liveCount = cams.filter((c) => c.status === 'live').length;
const catOf = new Map(CATEGORIES.map(([k]) => [k, []]));
for (const c of cams) {
  if (!catOf.has(c.category)) throw new Error(`Unknown category ${c.category} on ${c.id}`);
  catOf.get(c.category).push(c);
}
// Live cams first inside each category, then by name.
for (const arr of catOf.values()) {
  arr.sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1) || a.name.localeCompare(b.name, 'en'));
}

function speciesChips(c) {
  return (c.species || [])
    .map((s) => s.slug
      ? `<a class="sp" href="/birds/${s.slug}/">${esc(s.name)}</a>`
      : `<span class="sp">${esc(s.name)}</span>`)
    .join('');
}

function searchIndex(c) {
  const parts = [c.name, c.host, c.location, c.region, ...(c.species || []).map((s) => s.name)];
  return esc(parts.join(' ').toLowerCase().replace(/"/g, ''));
}

function card(c) {
  const isYT = c.watch.type === 'youtube';
  const badge = c.status === 'live'
    ? '<span class="badge live">LIVE</span>'
    : `<span class="badge seasonal">${esc(c.returns ? 'RETURNS ' + c.returns.toUpperCase() : 'SEASONAL')}</span>`;

  let thumb;
  if (isYT) {
    thumb = `<button class="thumb" type="button" data-video="${esc(c.watch.videoId)}" aria-label="Play ${esc(c.name)}">
          <img src="https://i.ytimg.com/vi/${esc(c.watch.videoId)}/hqdefault.jpg" alt="${esc(c.name)} live stream preview" loading="lazy" />
          ${badge}
          <span class="play"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></span>
        </button>`;
  } else {
    // Real footage still captured by capture-thumbs.js; lucide icon only when absent.
    const still = fs.existsSync(path.join(OUT_DIR, '..', 'assets', 'cams', `${c.id}.jpg`))
      ? `<img src="/assets/cams/${esc(c.id)}.jpg" alt="${esc(c.name)} stream preview" loading="lazy" />`
      : `<span class="ph" aria-hidden="true">${catIconSvg[c.category]}</span>`;
    if (channels[c.id]) {
      // Seasonal cams that live on a YouTube channel: the live_stream endpoint
      // embeds whatever the channel streams once it returns.
      thumb = `<button class="thumb" type="button" data-embed="live_stream?channel=${esc(channels[c.id])}" aria-label="Play ${esc(c.name)}">
          ${still}
          ${badge}
          <span class="play"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></span>
        </button>`;
    } else {
    thumb = `<a class="thumb ext" href="${esc(c.watch.url)}" target="_blank" rel="noopener" aria-label="Watch ${esc(c.name)} on the host's site">
          ${still}
          ${badge}
          <span class="play"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></span>
        </a>`;
    }
  }

  const watchLine = isYT
    ? `<a class="watch-link" href="${esc(c.watch.channelUrl || 'https://www.youtube.com/watch?v=' + c.watch.videoId)}" target="_blank" rel="noopener">${esc(c.host)} ↗</a>`
    : `<a class="watch-link" href="${esc(c.watch.url)}" target="_blank" rel="noopener">Watch on ${esc(c.host)} ↗</a>`;

  return `      <article class="cam" id="cam-${esc(c.id)}" data-status="${c.status}" data-region="${esc(c.region)}" data-search="${searchIndex(c)}"
        data-name="${esc(c.name)}" data-host="${esc(c.host)}" data-hosturl="${esc(c.watch.channelUrl || c.hostUrl || c.watch.url || '')}">
        ${thumb}
        <div class="cam-body">
          <h3>${esc(c.name)}</h3>
          <p class="meta">${esc(c.location)} · ${esc(c.host)}</p>
          <p class="season">${esc(c.seasonText)}</p>
          <div class="sp-row">${speciesChips(c)}</div>
          <div class="watch-row">${watchLine}</div>
        </div>
      </article>`;
}

function section([key, title]) {
  const arr = catOf.get(key);
  if (!arr.length) return '';
  return [
    `    <!-- ${title} -->`,
    `    <section class="cat" data-cat="${key}">`,
    `      <h2 class="cat-title">${esc(title)}</h2>`,
    '      <div class="grid">',
    arr.map(card).join('\n'),
    '      </div>',
    '    </section>',
  ].join('\n');
}

const catOpts = CATEGORIES.filter(([k]) => catOf.get(k).length)
  .map(([k, t]) => `            <option value="${k}">${esc(t)}</option>`).join('\n');
const regionOpts = REGIONS
  .map((r) => `            <option value="${esc(r)}">${esc(r)}</option>`).join('\n');

const finder = `    <div class="finder">
      <div class="finder-row">
        <div class="search-row">
          <input class="search" id="csearch" type="search" autocomplete="off" placeholder="Search cams, species or places" aria-label="Search cams, species or places" />
        </div>
        <div class="select-row">
          <select class="cselect" id="catpick" aria-label="Filter by cam type">
            <option value="">All cam types</option>
${catOpts}
          </select>
        </div>
        <div class="select-row">
          <select class="cselect" id="regpick" aria-label="Filter by region">
            <option value="">All regions</option>
${regionOpts}
          </select>
        </div>
      </div>
      <div class="status-chips" role="group" aria-label="Filter by live status">
        <button class="schip on" type="button" data-status="">All cams</button>
        <button class="schip" type="button" data-status="live"><span class="dot"></span>Live now</button>
        <button class="schip" type="button" data-status="seasonal" title="Streams part of the year, usually the nesting months; each card shows its return month">Seasonal</button>
      </div>
      <p class="count-note">${cams.length} cams \u00b7 ${liveCount} live</p>
    </div>
    <div class="mapwrap">
      <div class="cammap" id="cammap" role="application" aria-label="World map of every cam; dots follow the filters"></div>
      <div class="mapbar">
        <span><i class="dotleg live"></i>Live</span>
        <span><i class="dotleg seas"></i>Seasonal</span>
        <span class="mapnote">Hover a dot for details, click to watch.</span>
        <span class="mapbtns"><button id="mzin" type="button" aria-label="Zoom in">+</button><button id="mzout" type="button" aria-label="Zoom out">&minus;</button><button id="mzreset" type="button">Reset</button></span>
      </div>
    </div>
    <p class="empty" id="empty" hidden>No cams match. Try another search, or tell us which cam is missing and we will add it.</p>`;

const script = `  <script src="/assets/worldmap.js?v=2" defer></script>
  <script>
    // Interactive cam map: shared Natural Earth land + one dot per cam,
    // subset live by the same filters as the cards.
    var CAMGEO = ${JSON.stringify(camGeo)};
    (function () {
      var host = document.getElementById('cammap');
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
          tip.innerHTML = '<b>' + d[4] + '</b><span>' + d[5] + '</span><span class="st ' + d[3] + '">'
            + (d[3] === 'live' ? 'Live now' : (d[6] ? 'Returns ' + d[6] : 'Seasonal')) + '</span><span class="go">Click to watch</span>';
          tip.hidden = false;
          var r = host.getBoundingClientRect();
          var x = e.clientX - r.left + 14; var y = e.clientY - r.top + 10;
          if (x > r.width - 190) x = e.clientX - r.left - 190;
          if (y > r.height - 90) y = e.clientY - r.top - 90;
          tip.style.left = x + 'px'; tip.style.top = y + 'px';
        }
        CAMGEO.forEach(function (d) {
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
            var thumb = document.querySelector('#cam-' + d[0] + ' .thumb');
            if (thumb) { thumb.click(); return; }
            window.location.hash = '#cam-' + d[0];
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
        window.__updateCamMap = function (vis) {
          for (var id in dots) dots[id].style.display = vis[id] ? '' : 'none';
        };
        apply();
        if (window.__lastVisibleCams) window.__updateCamMap(window.__lastVisibleCams);
      }
      boot();
    })();
  </script>
  <script>
    (function () {
      var cams = Array.prototype.slice.call(document.querySelectorAll('.cam'));
      var cats = Array.prototype.slice.call(document.querySelectorAll('.cat'));
      var search = document.getElementById('csearch');
      var catpick = document.getElementById('catpick');
      var regpick = document.getElementById('regpick');
      var chips = Array.prototype.slice.call(document.querySelectorAll('.schip'));
      var empty = document.getElementById('empty');
      var status = '';

      function render() {
        var visMap = {};
        var q = (search.value || '').trim().toLowerCase();
        var cat = catpick.value;
        var reg = regpick.value;
        var visible = 0;
        cats.forEach(function (sec) {
          var on = !cat || sec.getAttribute('data-cat') === cat;
          var shown = 0;
          Array.prototype.slice.call(sec.querySelectorAll('.cam')).forEach(function (c) {
            var hit = on
              && (!status || c.getAttribute('data-status') === status)
              && (!reg || c.getAttribute('data-region') === reg)
              && (!q || c.getAttribute('data-search').indexOf(q) > -1);
            c.style.display = hit ? '' : 'none';
            if (hit) { shown++; visMap[c.id.slice(4)] = 1; }
          });
          sec.style.display = shown ? '' : 'none';
          visible += shown;
        });
        empty.hidden = visible !== 0;
        window.__lastVisibleCams = visMap;
        if (window.__updateCamMap) window.__updateCamMap(visMap);
      }

      search.addEventListener('input', render);
      catpick.addEventListener('change', render);
      regpick.addEventListener('change', render);
      chips.forEach(function (ch) {
        ch.addEventListener('click', function () {
          chips.forEach(function (x) { x.classList.remove('on'); });
          ch.classList.add('on');
          status = ch.getAttribute('data-status');
          render();
        });
      });
      render();

      // Deep links from species pages: /cams/#cam-<id> lands on that cam with all
      // filters clear, scrolled into view and briefly highlighted.
      function jumpToHash() {
        var hash = window.location.hash;
        if (!hash || hash.indexOf('#cam-') !== 0) return;
        var target = document.getElementById(hash.slice(1));
        if (!target) return;
        search.value = ''; catpick.value = ''; regpick.value = ''; status = '';
        chips.forEach(function (x) { x.classList.toggle('on', !x.getAttribute('data-status')); });
        render();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('flash');
        setTimeout(function () { target.classList.remove('flash'); }, 2400);
      }
      window.addEventListener('hashchange', jumpToHash);
      window.__jumpToCam = jumpToHash;
      jumpToHash();

      var tt = document.getElementById('totop');
      if (tt) {
        window.addEventListener('scroll', function () {
          tt.classList.toggle('show', window.scrollY > 900);
        }, { passive: true });
        tt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      }
    })();

    // Click-to-play lightbox: no YouTube iframe loads until a cam is opened.
    (function () {
      var lb = document.getElementById('lightbox');
      var frame = document.getElementById('lbFrame');
      var title = document.getElementById('lbTitle');
      var credit = document.getElementById('lbCredit');
      var close = document.getElementById('lbClose');

      function open(btn) {
        var cam = btn.closest('.cam');
        var vid = btn.getAttribute('data-video');
        var emb = btn.getAttribute('data-embed');
        var src = emb ? emb : (vid + '?autoplay=1&rel=0');
        if (emb) src = emb + '&autoplay=1&rel=0';
        title.textContent = cam.getAttribute('data-name');
        var host = cam.getAttribute('data-host');
        var hostUrl = cam.getAttribute('data-hosturl');
        credit.innerHTML = 'Streamed by <a href="' + hostUrl + '" target="_blank" rel="noopener">' + host + '</a> — open their channel to chat, donate or see highlights.';
        frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + src + '" title="' + cam.getAttribute('data-name') + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
      function shut() {
        lb.classList.remove('open');
        frame.innerHTML = '';
        document.body.style.overflow = '';
      }
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('.thumb[data-video],.thumb[data-embed]');
        if (btn) { open(btn); return; }
        if (e.target === lb) shut();
      });
      close.addEventListener('click', shut);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
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

const sections = CATEGORIES.map(section).filter(Boolean).join('\n\n');

const out = fs
  .readFileSync(path.join(__dirname, 'template.html'), 'utf8')
  .replace('<!--FINDER-->', finder)
  .replace('<!--SECTIONS-->', sections)
  .replace('<!--SCRIPT-->', script);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), out);
console.log(`${cams.length} cams (${liveCount} live now) across ${CATEGORIES.filter(([k]) => catOf.get(k).length).length} categories, ${(out.length / 1024).toFixed(0)} KB -> cams/index.html`);
