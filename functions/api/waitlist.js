/**
 * UNUSED SINCE 2026-08-14, and kept deliberately.
 *
 * Cat closed the waitlist: the beta goes to the App Store and Play within days, so a
 * list whose whole job was "we will tell you when it launches" had days left to live.
 * The homepage form is gone, so nothing calls this and nothing on beakbrain.com
 * collects personal data any more.
 *
 * It stays because it is finished, tested and inert (no TURNSTILE_SECRET means 503,
 * and no caller means not even that), and because the next thing that needs a
 * human-checked form on this site can use it as it stands. Migration 0015 revokes the
 * anon INSERT this replaced, and with the form gone it is now safe to run at any time
 * after the site deploy that removes the form.
 *
 * POST /api/waitlist — the only path a waitlist signup should take.
 *
 * WHY THIS EXISTS
 * ---------------
 * The form posted straight from the browser to Supabase's REST endpoint with the
 * publishable key. That is fine for authenticity — the key is meant to be public —
 * and useless against a script: Supabase does not rate-limit the REST endpoints
 * (only the auth ones), so a loop can fill the table at line rate until the
 * free-tier 500MB quota is gone and sync goes down for every real user. Migration
 * 0011 capped the SIZE of each row; nothing capped the NUMBER (panel review
 * 2026-08-12, §2.M2).
 *
 * Turnstile needs a server, because the token has to be redeemed against
 * siteverify with a secret the browser must never hold. This is that server: a
 * Cloudflare Pages Function, on the host already serving the page.
 *
 * IT ALSO CLOSES THE ENUMERATION HOLE (§2.L3)
 * -------------------------------------------
 * The direct insert answered 201 for a new address and 409 for one already on the
 * list, so anyone could ask "is this person waiting for BeakBrain?" one address at
 * a time. This answers the same 200 either way and keeps the distinction on the
 * server, where it belongs. The reply the user reads no longer depends on it.
 *
 * TURNING IT ON — and it is INERT until step 4, so this file ships safely today
 * ---------------------------------------------------------------------------
 *   1. Run migration 0014 in the app repo (birding-app/supabase/migrations). It
 *      only creates add_to_waitlist() — additive, safe on a live database, and it
 *      must exist before anything calls this endpoint.
 *   2. Create a Turnstile widget for beakbrain.com in the Cloudflare dashboard
 *      (Turnstile -> Add site). Managed mode. Note the site key and secret key.
 *   3. In the Pages project (beakbrain-site) -> Settings -> Environment variables,
 *      set for Production:
 *        TURNSTILE_SECRET   the secret key from step 2
 *        SUPABASE_URL       https://gvmrwlywoiygjfdqmmem.supabase.co
 *        SUPABASE_KEY       the same publishable key index.html carries today
 *      Nothing here needs the service-role key, and it must not be set here.
 *   4. Put the SITE key into TURNSTILE_SITE_KEY in index.html and deploy. Until
 *      you do, the page keeps posting directly to Supabase exactly as it does
 *      now — which is why this file can ship long before the account work does.
 *   5. Join the waitlist yourself and check the row lands.
 *   6. Then migration 0015, which revokes the anon INSERT this endpoint replaces.
 *      Until it runs, a bot can still take the old road and Turnstile is a closed
 *      door standing beside an open one. Not before step 5: it closes the road the
 *      site is still using.
 */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

// Deliberately permissive, matching migration 0011's CHECK: one @, no whitespace,
// a dot in the domain. Anything stricter starts rejecting real addresses.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 320;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

/** The one reply a caller ever sees on success. Same for a new address and one
 *  already on the list, so the endpoint cannot be used to test whether somebody
 *  signed up. */
const OK = () => json(200, { ok: true });

export async function onRequestPost({ request, env }) {
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

  // No secret configured means the widget is not live yet. Refuse rather than
  // accept unverified writes: the page only routes here once its site key is set,
  // so reaching this branch means half a setup, and a half-setup that silently
  // accepts everything is worse than one that visibly fails.
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
  // SECURITY DEFINER, so it keeps working after 0015 takes anon's INSERT away, and
  // it does `on conflict do nothing` and returns nothing — so a duplicate is
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

  // The RPC does not raise on a duplicate, so a 409 should be impossible. Treated
  // as success anyway: it is what a direct table insert would have answered, and
  // if this ever falls back to one, "already on the list" must not read as a fault.
  if (res && (res.ok || res.status === 409)) return OK();

  return json(502, { ok: false, error: 'upstream' });
}

// A GET here is somebody poking at the endpoint; say so plainly rather than
// falling through to the SPA rule and returning a page.
export function onRequestGet() {
  return json(405, { ok: false, error: 'method_not_allowed' });
}
