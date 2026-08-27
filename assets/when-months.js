// Swaps the twelve-bar "When to see" calendar between countries.
//
// WHY THIS EXISTS. The months on a species record are WORLDWIDE. An Osprey is somewhere
// on Earth in every month, so its page showed twelve filled bars and the reader took that
// to mean January. In Britain an Osprey is here from April to September. Each page now
// carries the answer for the countries where that bird has enough records to have one,
// and this lets a reader pick their own.
//
// The default country is already drawn server-side, so a reader with no JavaScript sees a
// real answer rather than an empty box, and the select only ever changes which real
// answer is on screen.
(function () {
  var box = document.querySelector('.mcal[data-months]');
  var pick = document.getElementById('mcal-country');
  if (!box || !pick) return;

  var data;
  try { data = JSON.parse(box.getAttribute('data-months')); } catch (e) { return; }
  var svg = box.querySelector('svg');
  if (!svg) return;
  var bars = svg.querySelectorAll('rect[data-m]');
  var caption = document.getElementById('mcal-caption');
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // The tall bar is the peak month and is drawn wider, so its geometry is restored from
  // the attributes the server put on every rect rather than recomputed here.
  function draw(code) {
    var row = data.rows[code];
    if (!row) return;
    var mask = row[0], peak = row[1], months = [];
    for (var m = 1; m <= 12; m++) if ((mask >> (m - 1)) & 1) months.push(m);
    bars.forEach(function (r) {
      var m = +r.getAttribute('data-m');
      var on = months.indexOf(m) > -1;
      var isPeak = m === peak;
      r.setAttribute('x', r.getAttribute(isPeak ? 'data-xp' : 'data-x'));
      r.setAttribute('width', r.getAttribute(isPeak ? 'data-wp' : 'data-w'));
      var h = r.getAttribute(isPeak ? 'data-hp' : on ? 'data-h' : 'data-h0');
      r.setAttribute('height', h);
      r.setAttribute('y', String(+r.getAttribute('data-top') - +h));
      if (on || isPeak) r.removeAttribute('opacity'); else r.setAttribute('opacity', '.45');
    });
    var name = data.names[code] || code;
    box.setAttribute('aria-label', (months.length === 12
      ? 'Present all year round in ' + name
      : 'Present in ' + months.map(function (m) { return MONTHS[m - 1]; }).join(', ') + ' in ' + name)
      + (peak ? ', peak in ' + MONTHS[peak - 1] : ''));
    if (caption) {
      caption.textContent = (months.length === 12
        ? 'One bar for each month, and every month is filled: this bird is recorded in ' + name + ' in all twelve.'
        : 'One bar for each month. Filled bars are the ' + months.length + ' month'
          + (months.length === 1 ? '' : 's') + ' with records in ' + name + '; pale bars are months with none.')
        + (peak ? ' The wide bar is ' + MONTHS[peak - 1] + ', the month with the most records.' : '');
    }
    try { localStorage.setItem('bb-when-country', code); } catch (e) { /* private mode */ }
  }

  // Which country to open on. A previous choice wins. Failing that, the region in the
  // reader's own locale, because "en-GB" is a better guess at where someone is standing
  // than "the country with the most records", which is the United States for half the
  // birds on this site. Failing both, the server's default is already drawn.
  function fromLocale() {
    var langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) {
      var m = String(langs[i]).match(/-([A-Za-z]{2})$/);
      if (m && data.rows[m[1].toUpperCase()]) return m[1].toUpperCase();
    }
    return null;
  }

  var saved = null;
  try { saved = localStorage.getItem('bb-when-country'); } catch (e) { /* private mode */ }
  var open = (saved && data.rows[saved]) ? saved : fromLocale();
  if (open && open !== pick.value) { pick.value = open; draw(open); }
  pick.addEventListener('change', function () { draw(pick.value); });
})();
