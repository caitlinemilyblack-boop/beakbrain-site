# Handover, 2026-09-01 (evening): the accommodation pass, and eight faults it uncovered

**Everything is committed, pushed and DEPLOYED.** Build `a700402` on
`country-guides-2026-08-20`, site `a65d717` on `trips/nation-guides-heroes-and-fixes`,
Worker version `013dd7be` verified live on beakbrain.com.

Full write-up with the numbers: https://claude.ai/code/artifact/3f509879-4e4e-4f13-bee2-1832bda0fd42

Continues `HANDOVER-2026-09-01-quality-heroes-accommodation.md`.

---

## 1. What changed

The whole Wild & Worthy supplier database now sits behind Where to Stay on all 68 guides.
Cat retired CERTIFIED as the gate that qualifies a row: "put all relevant accomodation
(no guides, agencies, etc) on pages if they make sense in the regions on the page."

| | start of day | now |
|---|---|---|
| regions with nowhere to stay | 345 | **238** |
| places to stay fleet-wide | ~5,700 | **9,093** |
| guides reading a lodge file | 46 | **67** (all but South Georgia) |
| rows that rendered on no page | 786 | **10** |
| properties the rules count as certified | 21,017 | **21,477** |
| coherence findings | 229 | **102** |

3,058 rows carry no certification and show no badge. That is honest because every
certification claim on these pages is a per-card badge drawn from that row's own evidence,
and no copy asserts anything about all of them.

## 2. Eight faults, none visible to any gate

Five were live. Three I introduced and selfcheck caught before they shipped.

1. **`filter(([a]) => areaRegion.has(a) || true)`** in `import-ww-db.js` is always true, so
   every geocoded name became a candidate place, property names included. 786 rows got
   `region_index: null` and rendered nowhere.
2. **The import deleted 48 rows** it could not rebuild, 28 of them hand-researched on ghana,
   malawi, mozambique, zimbabwe and madeira. Restored.
3. **Madeira and the Azores showed nothing**, holding 25 researched rows, because the
   archipelago split left the parent's `operates_in` and pre-split `region_index`.
4. **Four coherence checks were measuring their own assumptions.** `month-table-unscored`
   knew one of two axis sets; `route-place` was defeated by a leading article.
5. **A decomposed `ü` and a missing CANON entry** cost 460 properties a badge they held.
6. *(mine)* The null-region rescue filed an Amsterdam hotel at **Castricum**, 30 km away.
7. *(mine)* The keep-what-cannot-be-rebuilt rule then **resurrected its own refusals**.
8. *(mine)* Three GBIF placement methods, each confidently wrong. Script kept, `--write` refuses.

## 3. Research that reached the pages

Chan Chich Lodge and Lamanai Outpost Lodge (Belize's empty Rio Bravo region), Wildsumaco
Lodge (the Ecuador region named after it), Eco Lodge Itororo (Tres Picos State Park), and
Hotel das Cataratas, which is physically inside Iguacu National Park and was unplaced on
every build until `\biguacu\b` learned to accept the cedilla.

**Refused rather than guessed:** Muyuna Lodge, whose only OSM entry is its Iquitos booking
office 140 km from the lodge, and Kapawi Ecolodge, fly-in in a basin no region reaches.

## 4. BEFORE ANY BULK WRITE TO lodges-*.json

Snapshot every row's name AND whether it has an integer `region_index`, then diff after.
That separates dropping a row nobody could see from dropping one off a live page. The
48-row deletion was found only by diffing `git HEAD` hours later; every sweep after it was
proved safe in seconds. In memory as `project_beakbrain_lodge_import_safety`.

## 5. Still to do

1. **The fill queue**, `build/travel/pending/fill-queue.json`, 6,199 rows ranked. 404 need
   only a rate and the head is the sole place to stay in its region.
2. **238 regions with nowhere to stay.** Hand research; the database is thin where the gaps are.
3. **England has no north-west region.** Nothing covers the Dee or the Ribble.
4. **84 promised species no region names.** Needs a partition over a complete record set.
5. **Ten operator lodges** in `travel/pending/operator-itinerary-lodges.json`, and 20
   itineraries booking fewer nights than they bill days.

## 6. Gates

`render-check` 69/69 · `selfcheck` 68/68 zero blocking · `coherence-mutants` all catch their
own fault · deploy verifier 200s on all five paths, `/build/*` still 301.
