/**
 * GET /go — the clickout beacon endpoint.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Costa Rica page is a lead-generation test: its whole question is which of the
 * 165 outbound links a reader actually leaves for. Nothing on the site answered that.
 * Cloudflare Web Analytics counts pageviews and has no custom events, so the cheapest
 * honest way to record a clickout is to make one: the page fires a beacon at this
 * path, and the request itself is the record, visible in the same analytics and logs
 * that already cover the site.
 *
 * WHY A BEACON AND NOT A REDIRECT
 * -------------------------------
 * The obvious design is /go?to=<url> issuing a 302, which is how affiliate redirects
 * normally work. It was rejected for launch: it rewrites every outbound href, which
 * changes what search engines see on a page that has never been indexed, and a bug in
 * it breaks the link rather than the measurement. The beacon leaves every link exactly
 * as it was. When affiliate tags arrive (W1: affiliate_url preferred over url,
 * rel="sponsored"), this endpoint can grow the redirect then, with traffic data
 * already in hand.
 *
 * WHAT IT RECORDS, AND WHAT IT REFUSES TO
 * ---------------------------------------
 * Query params only: `c` the link's category, `h` the destination HOST, `p` the page.
 * No full URL, no identifier, no cookie, no body, no storage. The host is enough to
 * answer "do readers click lodges or operators", and stops short of recording which
 * individual read what. beakbrain.com has collected no personal data since the
 * waitlist closed on 2026-08-14 and this does not restart that.
 *
 * 204 with no body: nothing reads the response, and sendBeacon ignores it.
 */
export function onRequestGet() {
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

// A beacon is a GET. Anything else is not ours.
export function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } });
}
