# Handover, 2026-09-02: habitat, access and when reach 423 of 423

**Everything below is committed. NOT DEPLOYED** — the live Worker is still version
`337a4ef9`, which predates this work and the accommodation pass before it.

Continues `HANDOVER-2026-09-01b-the-accommodation-pass.md`.

---

## 1. What changed

Every region on every guide now answers the three practical questions a reader arrives
with. There are no gaps left.

| | start | now |
|---|---|---|
| regions missing habitat, access or when | 116 fields across 41 regions | **0** |
| guides with any practicals gap | 14 | **0** |
| selfcheck blocking findings, fleet-wide | 3 | **0** |
| guides that render clean | 69 of 69 | 69 of 69 |
| coherence findings | 67 (10 high, 5 medium, 52 low) | 67 |

The last fourteen guides were filled in this pass: Austria, Germany, Portugal, Brazil
(Amazon, Pantanal, Cerrado/Caatinga), Guatemala, Angola, China, Ecuador, India (plains,
northeast) and Indonesia (Papua, Greater Sundas, Lesser Sundas, Sulawesi/Moluccas).

## 2. Where the words came from

Books first, web second, and the split matters. `book-lookup.py` was tried on every region
before any search, and it answered for the guides whose shelf has a real site guide. For
the rest the shelf either holds only a field guide or holds nothing, and those regions were
written from web research: park authorities, national tourist boards, the Oriental Bird
Club and Burung-Nusantara site accounts, Shanghai Birding, tour operator itineraries.

Three books Cat went looking for do not exist as scans and are not coming: **A Guide to the
Birds of Wallacea**, **Where to Watch Birds in Portugal**, and both German titles. Portugal
was filled from the park and tourist board sources instead. The regions those books would
have covered are now filled, so they are wants rather than blockers.

## 3. Two failure modes this pass, both already in memory

**Accents and truncated names.** Writing to `Peneda-Gerês` with the key `Peneda-Geres`
silently matched nothing, and `The Yellow Sea coast: Rudong and the Jiangsu` missed because
the real name carries ` mudflats` on the end. Both wrote 0 fields and reported success.
Every batch writer since normalises with NFKD and matches on prefix, and the count printed
after each write is what caught them. See `project_beakbrain_accent_and_article_matching`.

**A place name that belongs to another country.** `cross-names` blocked Guatemala over
Finca Filadelfia, which is also a Peru place. Same shape as the Mercedes case in the
Pantanal: drop the colliding name, keep the useful one. Antigua's access line now names
Finca El Pilar and Cerro Alux, which is what a reader needs anyway.

Six participle-on-a-comma sentences were rewritten while in these files, four of them
pre-existing rather than new.

## 4. Books

Five new books registered on the shelf from Downloads:

| book | kind | can it fill access |
|---|---|---|
| Best places to bird in Ontario | **site guide** | yes |
| Best places to bird in the Prairies | **site guide** | yes |
| AMNH Birds of North America (DK) | avifauna | maybe |
| Crossley ID Guide: Eastern Birds | field | no |
| Rough Guide to Berlin | — | not a birding book, filed for completeness |

**The two Canada site guides name none of the 68 guides, because no Canada guide exists
yet.** They are registered but unusable until one is built. This is the books.html list
Cat is still gathering against, and the Americas filing regex now recognises Canada,
Ontario, Prairies, Newfoundland, Alaska, Arctic, Texas, California and Florida, so the
next batch files itself correctly.

Books were left in Downloads rather than moved into the library, since they cannot be
opened by a lookup until there is a guide to point them at.

## 5. What is next

1. **Deploy.** Nothing since Worker `337a4ef9` is live. Run `./deploy-worker.sh` (not
   `deploy.sh`) and verify the version afterwards.
2. **The accommodation wall.** 341 regions had nowhere to stay before the last pass and
   238 after it. That is the largest remaining hole.
3. **North America.** No USA or Canada guide exists. Two site guides for Canada are
   already on the shelf waiting for one.
4. The decisions artifact still holds open questions for Cat, click-to-answer.
