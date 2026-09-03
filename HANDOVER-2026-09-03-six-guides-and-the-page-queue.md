# Handover, 2026-09-03: the page queue emptied, and what the new guides broke

**Everything below is committed AND DEPLOYED.** Worker `ae2b254f`, verified: all six new
guides return 200, each byte-identical to its local build, and the hub links every one.

Continues `HANDOVER-2026-09-02-practicals-to-zero.md`, whose four open items are all
addressed here except the decisions artifact.

---

## 1. What changed

| | start | now |
|---|---|---|
| guides | 68 | **74** |
| pages the shelf could support and did not have | 6 | **0** |
| regions with nowhere to stay | 272 of 694 | **240 of 694** |
| blocking selfcheck findings, fleet-wide | 3 | **0** |
| guides that render clean | 69 of 69 | **75 of 75** |
| cross-names hits, fleet-wide | 0 | **0** |
| books on the shelf | 107 | **112** |

Six guides built: **Canada** (21 regions), **the United States** (27), **Thailand** (9),
**Cyprus** (7), **the Bahamas** (6), **Bermuda** (3).

## 2. The queue was never written down, so it was derived

There is no machine-readable page queue in the repo. The shelf is the queue: a country
with a **site-grade** book and no guide is a page waiting to be built. By that test there
were six, and there are now none.

**My first count of six was wrong twice over and both corrections mattered.** I first
reported three, having read past five books carrying hand-set kinds (`usa-iba`, `hawaii`,
`bermuda`, `bahamas`, `morocco`) rather than the three `classify()` produces. The ABC
*500 Most Important Bird Areas* is an IBA directory, which is the shape that drove Ghana,
and it is why a country with no conventional site guide could still be written.

**Sixteen countries have books and still cannot be built**: USA aside, the rest are
species-only. Japan, Turkey, Sri Lanka, Nepal, Venezuela, Oman, Pakistan, Bangladesh,
Senegal and the Gambia, Seychelles, Trinidad, the West Indies and South-East Asia all
hold a field guide or an avifauna and nothing that fills `access`. **They are purchases,
not work.**

## 3. Two bugs found, one of them still open

**The geocoder's HOLD warned once and then went silent for good.** On a refused requery
it kept the old coordinate and wrote the NEW query beside it, so the next run read them
as agreeing and skipped the row. Canada's Sibley Peninsula sat **130 km up the shore at a
second Pass Lake inside the same Thunder Bay District**, with a stored query naming Silver
Islet. Naming the district would not have saved it. Patched: the refused query goes to
`held_q`, `q` is left alone, and the HOLD now prints every run until settled. Reproduced
deliberately on Whitehorse before and after.

**THE EXPOSURE IS UNMEASURED AND CANNOT BE MEASURED FROM A CACHE.** The fault makes query
and coordinate look consistent by construction. Only a rerun surfaces it, and rerunning
the 26 sub-REV caches re-derives every coordinate they hold. **That is the largest open
risk on this handover.** See `project_beakbrain_geocode_hold_bug`.

**`ingest-books.py` assigns a book's guides once, at ingest, and never recomputes**, so
any book filed before its country's guide existed stayed wired to nothing. Eight were
stranded: Australia held three site guides and was wired to none, Ethiopia's site guide
sat unread beside its field guide, plus Morocco, the Greater Sundas and both Brazil
volumes. Wired by hand, because a recompute is **not additive**: it would have narrowed
seven correct multi-guide entries from the alias table, dropping the Central America
volume from eight guides to Mexico alone.

**Lowen's *Pantanal Wildlife* had already arrived** and was sitting unwired while the want
list still ranked it the top Pantanal buy and the shelf note still said no English Pantanal
site guide exists. Both corrected.

## 4. Building a guide breaks its neighbours

`cross-names` is a shared gazetteer with one owner per name, so a new guide **takes names
away from guides that were passing yesterday**. The USA claimed Montana, Washington,
Alaska, California, Olympic and Rocky Mountain, and Canada failed on all six within the
hour, though every use is deliberate cross-border geography. Five more guides broke with
no connection to North America: Chile and New Zealand name Alaska because two godwits are
named for where they fly from, Panama has Barro Colorado, South Africa has Somerset West,
Zimbabwe has Churchill Road in Harare.

**Run `node build/travel/cross-names.js` with no argument after adding a guide.** The
per-slug run reports the new guide clean while its neighbours are broken.

Three substring catches in one run, all fixed by the guide claiming its own name rather
than by an exemption: **Fairbanks** matched "banks" and failed the Outer Banks region,
**Haines Junction** matched Alaska's Haines, **Sandspit** matched New Zealand's.

## 5. Species names cost 5 to 8% of every look-for list

Our pages follow AviList; the books are American field guides. 18 of 273 names missed on
Canada, 21 of 310 on the USA. **Three different faults wear the same error and only two
are safe to automate**: spelling and hyphens, a different name for the same bird, and
**splits, which are a judgement every time**. The banded pitta is three species and the
Thai bird is Malayan. Whimbrel is split and Canada's is Hudsonian.

**And sometimes the answer is no.** Our list has no Yelkouan Shearwater. Scopoli's is the
nearest string and is a **different bird** that also occurs off Cyprus, so it went in as
its own record rather than as a rename. See `project_beakbrain_species_name_mapping`.

## 6. Accommodation: 272 to 240, and why it stopped there

Cyprus took 16 certified stays from Green Key, the only one of the six the global harvest
covers. The USA, Canada and Thailand took 39, 22 and 52 from the supplier archive under
the certified-or-in-a-place-the-page-sends-you rule.

**Bermuda and the Bahamas still have nowhere to stay and no register can fix them.**
Bermuda has five supplier rows, none certified; the Bahamas has none at all. Both need
the hand-researched `pending/birding-lodges-<slug>.json` route.

**The first measurement said all 694 regions were empty**, which the 6,744 rows on disk
made obviously false: the lodge files live in `build/trips/data`, not `build/travel/data`,
and they key regions by `region_index`, not by name. Two wrong assumptions in one check,
caught only because the number was absurd. Then the files wrote and the pages still showed
nothing, because a guide reads lodges through a `lodges_file` key **the scaffold does not
set**.

`fill-queue.js` reports **4,066 rows still needing something**: 2,808 descriptions, 2,226
websites, 1,046 rates. The script says it plainly and it is right: the database cannot
close this, it is research, and the only computable part is the order.

## 7. What is next

1. **The geocoder audit.** Every geo cache may hold a silently-paired mismatch from the
   HOLD bug. It needs a rerun per guide with the move summary read, and the 26 sub-REV
   caches re-derive everything when touched. Largest open risk here.
2. **Bermuda and the Bahamas have nowhere to stay.** Hand research, six and three regions.
3. **The remaining 240 empty regions**, worst first: Indonesia's four guides hold 34
   between them, then the USA's 18 and Canada's 11.
4. **No hero clip on any of the six new guides.** They open on the generic site reel.
5. **Nine country-leak warnings on the USA**, mostly the Gulf of Mexico and Mexican
   species named on purpose. Warnings, not blockers.
6. The decisions artifact still holds open questions for Cat.

## 8. Books

Five registered from Downloads, all North American: a British Columbia site guide,
Vancouver, Atlantic Canada, a Canada-wide title and the 1943 *Bird Watcher's Companion*.
All six Canada books were moved out of Downloads into `Birding Library/00 Where to Go/
Americas` and ten North American books were wired into `book-lookup.py`, which keeps a
**reading list separate from the shelf register**. A book missing from that table cannot
be opened however well the shelf describes it.
