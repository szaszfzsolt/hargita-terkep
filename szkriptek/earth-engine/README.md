# Earth Engine-szkriptek

A szkriptek a Google Earth Engine **Code Editorba** másolhatók (https://code.earthengine.google.com). Részletes lépések és gyakori hibák: [U02 – Earth Engine-szkript futtatása](../../jegyzetek/Utmutatok/U02%20Earth%20Engine%20szkript%20futtatasa.md).

**Fontos:** minden szkriptet **új szkriptként** hozz létre (NEW → File, a fájlnév kiterjesztés nélkül), különben felülírsz egy meglévőt.

| Téma | Szkriptek |
|---|---|
| T01 – Felhőmentes műholdmozaik | `T01_*` |
| T02 – Erdőváltozás | `T02_*` |
| T03 – Hőmérsékleti inverzió | `T03_tiszta_napok_v2.js` (újabb, teljes lefedettség-ellenőrzéssel; a v1 hiányos lefedettségű napokat is átengedett) / `T03_tiszta_napok.js` (1. téli napok keresése) → `T03_nyari_napok.js` (2. nyári napok) → `T03_export.js` (3. export asset) → `T03_modis_export.js` (3b. MODIS éjszakai átlagok, 1 km, az egész megyére: `T03_modis_tel_ej`, `T03_modis_nyar_ej`) → assetek kézi megosztása (lásd U02) → `T03_app_v1.js` (4. az interaktív app) |
| T07 – Árvíz | `T07_arviz_napok.js` (1. napkereső: Sentinel-1 radar és Sentinel-2 napok az árvíz időablakára; események sorban: 2025 → 2018 → 2005/2010) → `T07_arviz_terkep_v1.js` (2. elöntéstérkép radarból: előtte–utána, 10 m; előbb csak előnézet a térképen; párválasztó: 2025a/b, 2018a/b/c) → `T07_landsat_napok.js` (3. a korai árvizekhez, 2005/2010: Landsat 5/7 napkereső) → `T07_arviz_2010_landsat.js` (4. 2010-es árvíz utáni nyomok: Landsat 5/7, MNDWI, 30 m) → `T07_arviz_2005_nyiko.js` (5. 2005-ös Nyikó-menti árvíz előtte–utána, Landsat 5/7, függöny) | → `T07_arviz_2010_landsat.js` (2010, Olt) → `T07_nyiko_2005_miert.js` (2005, Nyikó: domborzat és völgyfenék)
