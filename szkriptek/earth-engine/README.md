# Earth Engine-szkriptek

A szkriptek a Google Earth Engine **Code Editorba** másolhatók (https://code.earthengine.google.com). Részletes lépések és gyakori hibák: [U02 – Earth Engine-szkript futtatása](../../jegyzetek/Utmutatok/U02%20Earth%20Engine%20szkript%20futtatasa.md).

**Fontos:** minden szkriptet **új szkriptként** hozz létre (NEW → File, a fájlnév kiterjesztés nélkül), különben felülírsz egy meglévőt.

| Téma | Szkriptek |
|---|---|
| T01 – Felhőmentes műholdmozaik | `T01_*` |
| T02 – Erdőváltozás | `T02_*` |
| T03 – Hőmérsékleti inverzió | `T03_tiszta_napok_v2.js` (újabb, teljes lefedettség-ellenőrzéssel; a v1 hiányos lefedettségű napokat is átengedett) / `T03_tiszta_napok.js` (1. téli napok keresése) → `T03_nyari_napok.js` (2. nyári napok) → `T03_export.js` (3. export asset) → `T03_modis_export.js` (3b. MODIS éjszakai átlagok, 1 km, az egész megyére: `T03_modis_tel_ej`, `T03_modis_nyar_ej`) → assetek kézi megosztása (lásd U02) → `T03_app_v1.js` (4. az interaktív app) |
