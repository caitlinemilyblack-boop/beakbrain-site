// /audio/<xc-id> — xeno-canto recordings, cached at our edge and seekable.
//
// WHY THIS EXISTS. Measured 2026-08-19 against xeno-canto directly:
//   * no `accept-ranges` header, so a browser cannot seek and <audio> may buffer
//     the whole file before it will play. That is the stuttering.
//   * `cache-control: max-age=0, private, must-revalidate`, so every single play
//     re-downloads ~1.8 MB. Play a bird twice, pay twice.
// Neither is fixable in markup — the fix has to sit in front of the origin.
//
// THE RANGE HAS TO BE SERVED HERE, NOT FORWARDED. The first version passed the
// client's Range header upstream and returned whatever came back. Because
// xeno-canto ignores Range, that was always a 200 carrying the whole file, which
// we then returned alongside our own `Accept-Ranges: bytes` — advertising
// seeking we did not provide. Verified live on 2026-08-19: a ranged GET answered
// `200` with no `Content-Range`. So the body is fetched whole (Cloudflare caches
// that subrequest for us) and this function does the slicing, which is the only
// way the 206 is real. Recordings are ~1.8 MB, so buffering one is cheap.
//
// Attribution is unaffected: the page still credits the recordist and links the
// xeno-canto page beside every clip, which is what CC BY and CC BY-SA require.
// This caches bytes, it does not restate authorship.

const ORIGIN = 'https://xeno-canto.org';
const TTL = 60 * 60 * 24 * 30; // 30 days; a recording never changes under its id

export async function onRequest({ params, request }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const id = String(params.id || '').replace(/[^0-9]/g, '');
  if (!id) return new Response('bad id', { status: 400 });

  const upstream = await fetch(`${ORIGIN}/${id}/download`, {
    cf: { cacheEverything: true, cacheTtl: TTL },
    headers: { 'User-Agent': 'BeakBrain/1.0 (https://beakbrain.com; hello@beakbrain.com)' },
  });
  if (!upstream.ok) return new Response('recording unavailable', { status: 502 });

  const buf = await upstream.arrayBuffer();
  const size = buf.byteLength;
  const head = request.method === 'HEAD';
  const base = {
    'Cache-Control': `public, max-age=${TTL}, immutable`,
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
