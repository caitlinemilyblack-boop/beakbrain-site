# Handover, 2026-09-01: footers, the Atlas rename, and 389 museum specimens

**All of this is LIVE.** Deployed as Worker `beakbrain-web`, version
`f20a45e2-2e79-4643-ac2f-bbdc1622db76`, 21,642 assets uploaded, 45,597 of 100,000 total.
Post-deploy guards passed: `/build/*` still 301, `TODO.md` and `/functions/go.js` still 404.

**Almost nothing is committed.** See §6. Cat committed the footer work mid-session
(`301a19b` site / `e823b1e` build); everything after that is uncommitted working tree.

---

## 1. Read this first: a concurrent session reverted one of my files

Another session was rebuilding all 68 guides at the same time (site `07b51bd`, build
`1869615` + `9771c9a`, all 15:17–15:18). Its re-pick of region photos **overwrote
`build/travel/data/region-birds-south-georgia.json` and put the King Penguin diorama back
as the chosen photo**, after I had replaced it.

The built HTML and the live page were never wrong — only the source JSON. I found it while
writing this handover, by diffing the working file against `HEAD`, **not** from
`git status`, which reported the file as unmodified because the revert restored it to the
committed state.

**The lesson, and it is the one already in `project_beakbrain_multisession_deploy`:** a
clean `git status` proves nothing when another session is writing the same tree. If you
changed a file this session, diff it against what you wrote, not against the index.

It is re-fixed and now **durable**: `pick-region-birds.js` reads `world.images.json`, and
the diorama is no longer in it, so a re-pick can no longer choose it. Verified.

---

## 2. Footers, all 21,477 pages

Every footer on the site is now exactly:

    Contribute · Contact · Privacy · Terms
    /contribute · mailto:hello@beakbrain.com · /privacy · /terms

Extensionless URLs on purpose — `/privacy.html` and friends 307 to them.

**It replaced nine different footers.** Some carried Home/Bird Guide/Cams/Trips/Community,
some used `.html` URLs that redirect, `contribute.html` and the bibliography had no Terms,
`daily/` had no Privacy, Terms *or* Contact, and the 21,397 bird pages had no Contact.

**`privacy.html` and `terms.html` had no footer at all.** They are standalone documents
with their own inline CSS and no site chrome, so they got a small self-contained footer
styled to match the site's dark-green band. `assets/site.*.css` carries almost no footer
rules, which is why the styles had to be local to those two files.

Dropping the nav links orphans nothing: every page's **header** already carries Home (the
wordmark), Bird Guide, Daily Bird, Cams, Trips/Atlas and Community. Verified before
removing.

The 275 files in `birds/groups/` and `birds/groups/family/` correctly have no footer —
they are lazy-loaded card fragments, not pages.

Generators patched so a rebuild reproduces it: `build/template.html`,
`build/cams/template.html`, `build/trips/template.html`, `build/travel/generate.js`
(`shellFooter`), `build/species/generate.js` (**two** footers), `build/species/daily.js`,
`build/cards/bibliography.js`.

---

## 3. "Trips" is now "Atlas"

**43,015 hub links renamed, 0 left saying "Trips".** Nav, mobile menu (`.navdrop`) and the
country breadcrumbs.

**Why**: the hub's own `<title>` and `<h1>` have said **"The Birding Atlas"** since
19 August, so the section had three names — you clicked "Trips" and landed on "The Birding
Atlas", with a crumb reading "Trips / Kenya". The tour listings were retired on 19 August,
so "Trips" also promised something bookable that is no longer there; what is there is 69
country guides.

**The URL is still `/trips/`.** Only the label changed. If it ever moves to `/atlas/`, note
the section took **6 impressions and 0 clicks** in the 8–26 August Search Console window,
so now is the cheapest that move will ever be. That is 69 guides, sitemaps, redirects and
~43k internal links, and I did not do it.

Left alone deliberately: the homepage body CTA still reads **"Birding guides"** — that is
descriptive link text, not a nav label.

**Cat said "dont change header nav" earlier in the session, then "incl atlas changes".**
The second instruction is the live one, but a future session should know the first was said.

---

## 4. Museum specimen photos: 389 removed across 151 species

Started from one report — the King Penguin photo credited *James St. John · CC BY 2.0* on
the South Georgia guide, which is a **taxidermy mount in a painted diorama**.

**Nothing in the filename or credit gave it away.** `Aptenodytes_patagonicus_(king_penguin).jpg`,
a real photographer, a clean CC BY 2.0. The Commons **category** said it outright:
`Aptenodytes patagonicus (museum specimens)`. One API call. This is the third time that
lesson has been bought — see `project_beakbrain_photo_filters`.

Pulling that thread found a systemic gap: **`pick-region-birds.js` rejects museum
accessions and `build-data.mjs` does not**, and `build-data.mjs` feeds both the `/birds/`
pages and the app.

### The regex trap, again

My first pattern was `\(AM[ _]LB\d+\)`. It caught 82 images across 58 species. **That was
wrong by 4x** — the real filenames carry a hyphenated view number,
`Prosopeia_splendens_(AM_LB8341-6).jpg`, and the closing `\)` after `\d+` skipped every one
of them. The correct pattern is:

    \(AM[ _]LB[\d\-–]+\)

Same shape as the `\bvalse\b` and `repartition` failures already recorded. **Never trust a
first count from a filename regex; re-measure after widening.**

### What was removed

| | |
|---|---|
| Images removed | **389** |
| Species touched | **151** |
| `flagged-photos.json` | 922 → **1,288** URLs (+366) |
| Species emptied | **none** |

I eyeballed 114 of them on two contact sheets before removing. Every one is a museum
object: mounts on stands, **flat study skins with tags**, detached wings, spread feather
boards, eggs, nests, a skeleton, and two that are photographs of the **paper label with no
bird in frame at all**. Not one live bird.

### Four species held back on purpose

The specimen is their **only** photo, and an empty species is worse than a bad photo
(`project_beakbrain_genus_mate_photos`):

- `goutou1` Gould's Toucanet
- `asrfin1` Asian Rosy-Finch
- `ritdro1` Ribbon-tailed Drongo
- `lesbop1` Lesser Lophorina

Their files are **deliberately not in `flagged-photos.json`**, so a rebuild cannot empty
them. Verified: no species is emptied by any of this. The 26 pages that still reference a
specimen are these four plus the compare and country pages that tile them.

`towshe3` and `demwir1` have zero images, but they already did before this session.

### The replacement photo

South Georgia's Salisbury Plain card now shows **David Stanley, CC BY 2.0**, chosen because
Commons files it under *"Aptenodytes patagonicus patagonicus of South Georgia"* — actually
taken there, unlike all four alternates, which are Falklands. Landscape, wild, both birds
whole, colony visible behind, and it survives the card's real 500×281 crop at 50%/35%.

King Penguin's species page went 8 photos → **5**, all wild.

---

## 5. Open items

1. **The app has not shipped any of §4.** `world.images.json` and `flagged-photos.json` are
   fixed and the website is regenerated from them, but the app still bundles the old
   `world.json`. Needs a data rebuild and an app deploy.
2. **`build-data.mjs` still has no accession rule**, so the next harvest can reintroduce the
   whole class. Wire in `\(AM[ _]LB[\d\-–]+\)`. **Do not widen it to any bracketed
   alphanumeric** — `(DSCF3780)` and `(DSC_1085)` are camera filenames on good photographs.
   AM_LB is the only museum family present in the harvest today; I checked.
3. **The four held-back species need real photographs**, or they keep a specimen.
4. **`doveki` (Dovekie, *Alle alle*) holds `Alle-sur-Semois_viewed_from_the_GR16_(DSCF4844).jpg`**,
   a photograph of a Belgian village. Fifth outing for the genus-name trap. Unfixed.
5. **Nothing after `301a19b` / `e823b1e` is committed.** See below.

---

## 6. Repo state

Deploy rsyncs the **working tree**, so everything below is already live.

| Repo | Uncommitted | What |
|---|---|---|
| `beakbrain-site` | **78 files** | Atlas rename + regenerated `trips/` (70), `index.html`, `404.html`, `community.html`, `contribute.html`, `cams/`, `daily/`, `symbols/`, `llms.txt`, sitemaps |
| `beakbrain-site/build` | **9 files** | 6 generators/templates (footer + Atlas), `travel/data/region-birds-south-georgia.json`, `region-birds-falklands.json`, `species/compare-published.json` |
| `Birding-Quiz-App/birding-app` | `assets/regions/world.images.json` | 389 images removed |
| `Birding-Quiz-App/pipeline` | `flagged-photos.json` | +366 URLs (submodule — commit it before the parent pointer) |

`birds/` is gitignored, so the 21,397 regenerated pages exist only in the working tree.
That is normal and is why a deploy carries them and a push does not.

Timestamped `.bak` files sit beside every data file I edited.

`Birding-Quiz-App` also shows `M TODO.md` and an untracked `PHOTO-FLAG-REVIEW-2026-08-31.md`.
**Not mine** — they were there when I started.

---

## 7. Gates run

- `build/travel/render-check.js` — **69/69 guides render clean** (run twice, after each rebuild)
- `build/trips/verify.js` — OK, 2,674 entries, 171 pre-existing warnings (badgeless lodges, missing geo)
- `build/verify.js` — pre-existing community link rot only
- `_redirects` — **byte-identical** across both species rebuilds; 0 compare pairs dropped
- Footers — 21,477 correct / 0 differing, re-verified after every rebuild
- Live spot checks — `/`, `/trips/`, `/birds/king-penguin/`, `/trips/south-georgia/`, `/privacy`, `/terms`, `/contribute` all 200 with the right footer, the right label and the right photo

A note for whoever rebuilds next: **`build/species/generate.js` takes about 11 seconds** for
all 21,397 pages. It is not the expensive step it looks like; do not avoid re-running it.
