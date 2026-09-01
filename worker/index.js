/**
 * beakbrain.com, served by Workers static assets instead of Cloudflare Pages.
 *
 * WHY THIS EXISTS
 * ---------------
 * Pages reads the ZONE plan for its file ceiling, and beakbrain.com is a Free zone, so
 * the site was stuck at 20,000 files while the tree needed 23,967. It had not deployed
 * since 22 August. Workers static assets reads the ACCOUNT plan instead, and this
 * account is on Workers Paid, where the ceiling is 100,000 files. Same money, five
 * times the room. See project_beakbrain_file_budget.
 *
 * WHAT THIS FILE IS
 * -----------------
 * The three former Pages Functions, and nothing else. Every other URL on the site is
 * served straight from the asset store without invoking this script at all, which is
 * both faster and free: `run_worker_first` in wrangler.jsonc lists exactly the three
 * paths below, so a request for a species page never becomes a Worker invocation.
 *
 * The bodies of the three handlers are carried over from functions/go.js,
 * functions/audio/[id].js and functions/api/waitlist.js UNCHANGED apart from the
 * calling convention. Their original comments explain why each behaves as it does and
 * are kept with them. Behaviour was compared against the live Pages site path by path
 * before this took over the domain.
 *
 * ONE INHERITED QUIRK, PRESERVED ON PURPOSE. On Pages, `_headers` rules do not apply
 * to Function responses, so /go, /audio/* and /api/* have always answered WITHOUT the
 * site's CSP, HSTS and X-Frame-Options. Measured on the live site, not assumed. These
 * handlers return bare responses for the same reason, so the migration changes nothing
 * anyone can observe. Adding those headers here would be an improvement, and it is a
 * separate change from a migration that has to be provably identical.
 */

// ---------------------------------------------------------------------------
// GET /go — the clickout beacon.
//
// The Costa Rica page is a lead-generation test: its whole question is which of the
// 165 outbound links a reader actually leaves for. Cloudflare Web Analytics counts
// pageviews and has no custom events, so the cheapest honest way to record a clickout
// is to make one: the page fires a beacon at this path and the request IS the record.
//
// A beacon, not a /go?to=<url> redirect: a redirect rewrites every outbound href,
// which changes what search engines see on a page that has never been indexed, and a
// bug in it breaks the link rather than the measurement.
//
// Query params only: `c` the link's category, `h` the destination HOST, `p` the page.
// No full URL, no identifier, no cookie, no body, no storage. beakbrain.com has
// collected no personal data since the waitlist closed on 2026-08-14.
// ---------------------------------------------------------------------------
function handleGo(request) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } });
  }
  return new Response(null, {
    status: 204,
    headers: {
      // Never let a proxy or the browser answer this from cache: a cached beacon is
      // an unrecorded clickout, which is the one failure mode that matters.
      'cache-control': 'no-store',
      'referrer-policy': 'same-origin',
    },
  });
}

// ---------------------------------------------------------------------------
// /audio/<xc-id> — xeno-canto recordings, cached at our edge and seekable.
//
// Measured 2026-08-19 against xeno-canto directly: no `accept-ranges`, so a browser
// cannot seek and <audio> may buffer the whole file before it will play; and
// `max-age=0, private, must-revalidate`, so every play re-downloads ~1.8 MB.
//
// THE RANGE IS SERVED HERE, NOT FORWARDED. Passing the client's Range upstream always
// came back a 200 carrying the whole file, which we then returned alongside our own
// `Accept-Ranges: bytes` — advertising seeking we did not provide. So the body is
// fetched whole (Cloudflare caches that subrequest) and this slices it, which is the
// only way the 206 is real. Recordings are ~1.8 MB, so buffering one is cheap.
//
// Attribution is unaffected: the page still credits the recordist and links the
// xeno-canto page beside every clip. This caches bytes, it does not restate authorship.
// ---------------------------------------------------------------------------
const XC_ORIGIN = 'https://xeno-canto.org';
const XC_TTL = 60 * 60 * 24 * 30; // 30 days; a recording never changes under its id

async function handleAudio(request, id) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const clean = String(id || '').replace(/[^0-9]/g, '');
  if (!clean) return new Response('bad id', { status: 400 });

  const upstream = await fetch(`${XC_ORIGIN}/${clean}/download`, {
    cf: { cacheEverything: true, cacheTtl: XC_TTL },
    headers: { 'User-Agent': 'BeakBrain/1.0 (https://beakbrain.com; hello@beakbrain.com)' },
  });
  if (!upstream.ok) return new Response('recording unavailable', { status: 502 });

  const buf = await upstream.arrayBuffer();
  const size = buf.byteLength;
  const head = request.method === 'HEAD';
  const base = {
    'Cache-Control': `public, max-age=${XC_TTL}, immutable`,
    'Accept-Ranges': 'bytes',
    'Content-Type': upstream.headers.get('Content-Type') || 'audio/mpeg',
    'Access-Control-Allow-Origin': '*',
  };

  // bytes=START-END, bytes=START- and the bytes=-SUFFIX form all appear in the wild.
  const m = (request.headers.get('Range') || '').match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] !== '' || m[2] !== '')) {
    let start;
    let end;
    if (m[1] === '') {
      const suffix = parseInt(m[2], 10);
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] === '' ? size - 1 : Math.min(parseInt(m[2], 10), size - 1);
    }
    if (start >= size || start > end) {
      return new Response('range not satisfiable', {
        status: 416,
        headers: { ...base, 'Content-Range': `bytes */${size}` },
      });
    }
    const slice = buf.slice(start, end + 1);
    return new Response(head ? null : slice, {
      status: 206,
      headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(slice.byteLength) },
    });
  }

  return new Response(head ? null : buf, {
    status: 200,
    headers: { ...base, 'Content-Length': String(size) },
  });
}

// ---------------------------------------------------------------------------
// POST /api/waitlist.
//
// UNUSED SINCE 2026-08-14 and kept deliberately. Cat closed the waitlist when the app
// went to the stores; the homepage form is gone, so nothing calls this and nothing on
// beakbrain.com collects personal data any more. It stays because it is finished,
// tested and inert, and because the next thing that needs a human-checked form can use
// it as it stands. Verified inert against the live site on 2026-09-01: a POST answers
// 503 not_configured, because TURNSTILE_SECRET has never been set. Nothing to carry
// over but the code.
//
// It replaced a browser-to-Supabase insert with the publishable key. That is fine for
// authenticity and useless against a script: Supabase does not rate-limit its REST
// endpoints, so a loop could fill the table until the free-tier quota was gone.
// Turnstile needs a server because the token must be redeemed against siteverify with
// a secret the browser must never hold.
//
// It also closes an enumeration hole: the direct insert answered 201 for a new address
// and 409 for one already on the list, so anyone could ask "is this person waiting for
// BeakBrain?" one address at a time. This answers the same 200 either way.
//
// TURNING IT ON: run migration 0014 (creates add_to_waitlist(), additive and safe on a
// live database); create a Turnstile widget for beakbrain.com; set TURNSTILE_SECRET,
// SUPABASE_URL and SUPABASE_KEY as secrets on this Worker (`npx wrangler secret put`)
// — NOT the service-role key, which must never be here; put the SITE key into
// index.html; join the list yourself and check the row lands; then migration 0015,
// which revokes the anon INSERT this replaces. Not before that check: 0015 closes the
// road the site would still be using.
// ---------------------------------------------------------------------------
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

// Deliberately permissive, matching migration 0011's CHECK: one @, no whitespace, a
// dot in the domain. Anything stricter starts rejecting real addresses.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 320;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

async function handleWaitlist(request, env) {
  // A GET here is somebody poking at the endpoint; say so plainly rather than falling
  // through to the asset router and returning a page.
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, error: 'bad_request' });
  }

  const email = String(body?.email ?? '').trim().toLowerCase();
  const token = String(body?.token ?? '');

  if (!email || email.length > MAX_EMAIL || !EMAIL.test(email)) {
    return json(400, { ok: false, error: 'bad_email' });
  }

  // No secret configured means the widget is not live yet. Refuse rather than accept
  // unverified writes: a half-setup that silently accepts everything is worse than one
  // that visibly fails.
  if (!env.TURNSTILE_SECRET) {
    return json(503, { ok: false, error: 'not_configured' });
  }

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token,
      // Cloudflare's own header, set by the edge and not forgeable by the client.
      remoteip: request.headers.get('CF-Connecting-IP') ?? '',
    }),
  }).then((r) => r.json()).catch(() => null);

  if (!verify?.success) {
    return json(403, { ok: false, error: 'challenge_failed' });
  }

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return json(503, { ok: false, error: 'not_configured' });
  }

  // The RPC, not a direct table insert. add_to_waitlist() (migration 0014) is
  // SECURITY DEFINER, so it keeps working after 0015 takes anon's INSERT away, and it
  // does `on conflict do nothing` and returns nothing — so a duplicate is
  // indistinguishable from a new address here as well as downstream.
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/add_to_waitlist`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_email: email, p_source: 'beakbrain.com' }),
  }).catch(() => null);

  // The RPC does not raise on a duplicate, so a 409 should be impossible. Treated as
  // success anyway: it is what a direct table insert would have answered, and if this
  // ever falls back to one, "already on the list" must not read as a fault.
  if (res && (res.ok || res.status === 409)) return json(200, { ok: true });

  return json(502, { ok: false, error: 'upstream' });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/go') return handleGo(request);

    // Pages routed this with functions/audio/[id].js, a SINGLE dynamic segment. So
    // /audio/12345 is ours and /audio/a/b is not; anything else falls through to the
    // asset router exactly as it did before.
    const audio = pathname.match(/^\/audio\/([^/]+)\/?$/);
    if (audio) return handleAudio(request, decodeURIComponent(audio[1]));

    if (pathname === '/api/waitlist') return handleWaitlist(request, env);

    // Not one of ours. Hand it back to the asset store, which applies _headers and
    // _redirects and the not_found_handling 404 page. Reached only for paths inside
    // run_worker_first that no handler above claimed.
    return env.ASSETS.fetch(request);
  },
};
