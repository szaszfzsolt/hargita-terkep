# Projektnapló

> Minden munkamenet végén ide kerül: mit csináltunk, mi lett az eredmény, mi a következő lépés.
> Új beszélgetésben Claude-nak elég ezt a fájlt megmutatni, és onnan folytatja.

## Jelenlegi állapot

- **Fázis:** 1 – T01 próba (Earth Engine működik, pontos határok elkészültek)
- **Earth Engine-projekt:** `tidal-velocity-494919-e2`, felhasználónév: `szaszfzsolt`
- **Earth Engine-assetek:** `hargita_kozsegek_shp`, `hargita_megye_shp`
- **Mentett szkript:** `users/szaszfzsolt/T01_proba/proba_v1`
- **Közzétett app:** https://tidal-velocity-494919-e2.projects.earthengine.app/view/hargita-megye-muholdrol
- **Projektmappa a gépen:** `C:\Users\Zsolt\hargita-terkep` (GitHub: szaszfzsolt/hargita-terkep)
- **Következő lépés:** T01 rendes szkriptje (Cloud Score+ felhőszűrés, domborzatárnyékolás, export Drive-ra); első térképoldal községválasztóval

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
- GitHub-repó (`szaszfzsolt/hargita-terkep`) és GitHub Desktop beállítva, a régi mappa: `Dokumentumok\Hargita-terkep-regi`.
- T01 v2 szkript (`users/szaszfzsolt/T01_proba/alapterkep_v2`): Cloud Score+ felhőszűrés – a lyuk és a csempehatárok eltűntek; domborzat; 3 export elindítva a Drive `HargitaTerkep` mappájába.
- Exportok elkészültek a Drive `HargitaTerkep` mappájában: Sentinel-2 10 m (544 MB), színes domborzat 30 m (59 MB), DEM 30 m (28 MB).
- Korlát: ekkora fájlokat Claude nem tud a Drive-ról áthozni → webes csempézés majd QGIS-ben, külön alkalommal.
- Addig: **Earth Engine App** (`T01_app_v1.js`) – községválasztó, 4 réteg (valós, infravörös, NDVI, domborzat), kivágás egy községre, kattintásra település-adatok.
- App közzétéve: https://tidal-velocity-494919-e2.projects.earthengine.app/view/hargita-megye-muholdrol (forrás: `users/szaszfzsolt/T01_proba/app_v1`).
- **Teendő:** az `alapterkep_v2` Earth Engine-szkriptet véletlenül felülírta az app kódja → visszaállítani a `T01_alapterkep_v2.js`-ből.
- Az app inkognitóban is működik, miután a két asset (`hargita_kozsegek_shp`, `hargita_megye_shp`) megosztása „Anyone can read" lett. Teszt: Bögöz, NDVI, kivágás – 64,4 km², 427–890 m.

## 2026-11-05 – Élességteszt
- `T01_elesseg_teszt.js`: 5 mozaikváltozat (A próba, B app, C szűk ablak, D legtisztább napok + C, E legjobb pixel) két összekapcsolt, „függönyös" térképen, Bögöz közelről.
- Cél: kiválasztani a legélesebbet, és azzal frissíteni az appot és az exportot.
- Élességteszt eredménye: **E (legjobb pixel)** a legélesebb (Zsolt). Az A élesebb volt a B-nél → a sok kép mediánja mosta el.
- `T01_app_v2.js`: E-mozaik + „Részletes légifotó (Google)" réteg, kivágás sötétítő maszkkal. `T01_alapterkep_v3.js`: exportok az E-mozaikkal.
- `alapterkep_v2` Earth Engine-szkript visszaállítva.
