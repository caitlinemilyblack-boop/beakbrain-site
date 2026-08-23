# Site header parity — what I changed in beakbrain-site, 2026-08-23

Written for the country-guide session. **Six files touched, all hand-edited, none generated.**
Nothing committed, nothing deployed, no build script run.

## Files I changed

    community.html          contribute.html        symbols/index.html
    404.html                daily/index.html       build/template.html

I did not touch `trips/`, `build/travel/`, `build/trips/`, `sitemap-hubs.xml`, `_redirects`,
`index.html`, `assets/screens/`, or anything else your DO-NOT-DISTURB names.

`build/trips/template.html` and `build/cams/template.html` were already canonical (46vh hero,
Trips link, Get the app button) so they needed nothing.

## Why

Cat has asked for header parity about six times and it has never fully landed. Measured at
1280x900 across eight pages, the causes were:

1. **Seven distinct header markups** across 22 pages. It is copy-pasted, not shared, so each
   fix reaches some copies and misses others.
2. **Only four of eight pages load `assets/site.*.css`.** community, daily, trips and cams
   define header geometry themselves.
3. **Hero heights were set in mixed units**: 90vh, 52vh, 46vh, 300px, 300px, 250px. vh pages
   rescale with the window and px pages do not, so they can only ever match at one viewport.
   This is the reason it looks fixed and then is not.
4. **`site.css` scopes its button as `.cta a.btn`**, so a header button inherits no padding
   from the shared sheet. The pages that looked right each defined `.btn` locally.

## What I changed

- Hero `min-height` on every subpage is now **46vh**. The homepage keeps **90vh** on purpose
  (Cat's call: it is a landing hero). trips and cams were already 46vh.
- **Trips** added to the nav on community, contribute, symbols, 404.
- **Get the app** button added to contribute, symbols, 404; `/daily/` said "Join the waitlist"
  pointing at a `#waitlist` anchor and now matches.
- contribute, symbols and 404 changed from `<nav class="nav-links">` to `<div class="nav-right">`
  with `.nav-link` on each anchor, which is what the other five pages use.
- 404 gained the mobile-menu `<details class="mnav">` plus its CSS, lifted from contribute.html.
  Without a third flex child the `space-between` row pushed the nav hard right.
- `.nav .btn` added to contribute, symbols and 404, lifted verbatim from index.html.
- `build/template.html` (the generator behind community's variant): 52vh to 46vh, Trips added.

## Measured result

    page              before btn x   after    before video h   after
    /                       1008     1008              810      810   (hero, kept)
    /community.html         1008     1008              468      414
    /contribute.html           —     1008              300      414
    /daily/                 1003     1004              250      414
    /trips/                 1008     1008              414      414
    /cams/                  1008     1008              414      414
    /symbols/                  —     1008              300      414
    /404.html                  —     1010                —        —

Button x spread went from 59px (and three pages with no button at all) to 6px. Every page now
has the same five nav links. Every subpage hero is 414px at a 900px viewport and, because they
are all vh now, stays matched at every other viewport too.

## Three residuals I did not chase

- `/daily/` button sits 4px left. Its links use a local `.lnk` class rather than `.nav-link`,
  so the link row measures 554px against 569px elsewhere.
- `/404.html` button sits 2px right, and its header is 80px against 81px. It has no hero, so
  nothing under the header sets the extra pixel.
- The homepage wordmark sits at y=20 against y=21 elsewhere.

## The durable fix, which I deliberately did not do

The header should be one shared block and `.nav .btn` should live in `site.css` unscoped. I did
not, because **`assets/site.1274c2c9f0.css` is content-hashed in its filename**. Editing it in
place leaves the URL unchanged, so edge caches would serve the old bytes for up to a week after
a deploy. Doing it properly means re-hashing and updating every page that references it, which
belongs to whoever owns the CSS pipeline rather than to a header fix.

---

# Second change, same session: Daily Bird pool

`build/species/daily.js` — Cat's instruction: Daily Bird should only feature species that
have audio **and** an illustrated card.

The pool filter tested photos only. It now requires all three things the page renders:
the photograph (the puzzle), the call (the result panel), the plate (the collector card).
A species without a plate was getting a silhouette on its card, which is a thin reward.

    photographed              10,070
    + has audio                2,114
    + has an illustrated card  1,128   <- the pool now

So the pool is 1,128 rather than POOL_SIZE 2,000, and the no-repeat window is ~3.1 years
rather than ~5.5. Audio is nearly free; the plate requirement is what halves it. It logs
the pool size on every run and throws if the pool is empty, which is what a missing
`cards-manifest.json` looks like.

**This rewrote `daily/index.html` and all 400 files under `daily/p/`.** The schedule is a
seeded shuffle of the pool, so a different pool means a different bird on every date. If
anything of yours references a specific past date's bird, it has changed.

## A trap worth writing down, because I walked into it

I hand-edited `daily/index.html` for the header fix, then ran `daily.js`, and it wrote my
edit straight back to a 250px hero and a "Join the waitlist" button. **`daily/index.html`
is generated.** The header values now live in `build/species/daily.js` as `CTA_LABEL`,
`CTA_HREF`, the `.nav .btn` rule and `.hero`. This is very likely why header parity has
been fixed and un-fixed repeatedly: the fix lands on the built page and the next build
removes it.
