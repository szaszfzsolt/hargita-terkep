# Projektnapló

> Minden munkamenet végén ide kerül: mit csináltunk, mi lett az eredmény, mi a következő lépés.
> Új beszélgetésben Claude-nak elég ezt a fájlt megmutatni, és onnan folytatja.

## Jelenlegi állapot

- **Fázis:** 1 – T01 próba (Earth Engine működik, pontos határok elkészültek)
- **Earth Engine-projekt:** `tidal-velocity-494919-e2`, felhasználónév: `szaszfzsolt`
- **Earth Engine-assetek:** `hargita_kozsegek_shp`, `hargita_megye_shp`
- **Mentett szkript:** `users/szaszfzsolt/T01_proba/proba_v1`
- **Következő lépés:** GitHub-repó + GitHub Desktop; T01 rendes szkriptje (Cloud Score+ felhőszűrés, domborzatárnyékolás, export Drive-ra); első térképoldal községválasztóval

---

## 2026-11-04 – Indulás

**Megbeszéltük:**
- Mire jók az ingyenes műholdadatok, mekkora a reális felbontás (Sentinel-2: 10 m), mik a buktatók.
- Eszközök: Google Earth Engine (felhős számolás), QGIS (helyi munka), Obsidian (jegyzetek), GitHub (verziózás + közzététel GitHub Pages-en).
- Tárhely: a nyers adatot nem töltjük le, Earth Engine-ben számolunk; helyben 10–20 GB elég, a weben az első változat 200–500 MB körül.
- Igény: községre (pl. Bögöz) kivágható nézet → [[01 Kovetelmenyek]]
- Munkaidő-becslés: első működő változat 1–2 munkamenet, témánként 1–2 munkamenet.

**Elkészült:**
- Projektmappa-váz, jegyzetszerkezet, regisztrációs útmutató.

**Döntések:**
- A jegyzetek a projektmappán belül, Markdownban → Obsidian-tár + GitHub.
- A nyers adatok nem kerülnek gitbe (`.gitignore`).

**Nyitott kérdések:**
- GitHub-repó neve, nyilvános legyen-e (GitHub Pages ingyenesen csak nyilvános repóval megy).
- ANCPI ortofotó felhasználási feltételei.

## 2026-11-04 (este) – Earth Engine és az első műholdkép

**Elkészült:**
- Earth Engine-regisztráció (nem kereskedelmi, oktatási), projekt: `tidal-velocity-494919-e2`.
- Első próba: 2025 nyári Sentinel-2 medián mozaik a megyére – működik.
- Obsidian telepítve, a `jegyzetek` mappa széfként megnyitva.

**Probléma → megoldás:**
- A FAO GAUL megyehatár pontatlan (pl. Székelyderzs, Székelymuzsna kimaradt) → saját pontos határok: geoBoundaries ROU ADM2 (geo-spatial.org/ANCPI alapú), 67 település magyar és román névvel → `adatok/kesz/hatarok/`.
- A kép túl sötét volt (max 3000) → `max: 1500, gamma: 1.3`.

**Nyitott:**
- Balánbánya (1,4 km²) és Tusnádfürdő (1,9 km²) területe a forrásadatban gyanúsan kicsi – ellenőrizni.

**Zárás (22:08):**
- Határok feltöltve Earth Engine-be (`hargita_kozsegek_shp`, `hargita_megye_shp`), a próba szkript fut: 67 település, pontos megyehatár. Mentve: `users/szaszfzsolt/T01_proba/proba_v1`.
- Ismert hibák a próbaképen: szögletes adathiány a megye déli részén (Brassó megye határánál) és halvány csempehatárok → Cloud Score+ felhőszűrővel javítjuk.
