# Hargita megye műholdról – interaktív térképprojekt

Ingyenesen elérhető műholdadatokból (Sentinel, Landsat, Copernicus DEM stb.) készülő interaktív Hargita megye-térkép(ek), oktatási és felfedező céllal.

Készíti: Szász Ferenc Zsolt, Claude segítségével
Indult: 2026. november 4.

## 🗺️ Az interaktív térkép

**[Hargita megye műholdról – megnyitás](https://tidal-velocity-494919-e2.projects.earthengine.app/view/hargita-megye-muholdrol)**

Böngészőben fut, bejelentkezés nélkül (telefonon, okostáblán is). Községválasztó, műholdkép, infravörös, NDVI, domborzat, Google légifotó.

## Mappaszerkezet

| Mappa | Mi van benne |
|---|---|
| `jegyzetek/` | Projektnapló, követelmények, adatforrások, témák, útmutatók. Obsidian-tárként is megnyitható. |
| `szkriptek/earth-engine/` | Google Earth Engine-szkriptek (JavaScript, a Code Editorba másolhatók) |
| `szkriptek/qgis/` | QGIS-lépések, Python-szkriptek |
| `adatok/nyers/` | Letöltött, feldolgozatlan adatok (NEM kerül a GitHubra) |
| `adatok/kesz/` | Kivágott, feldolgozott rétegek (GeoTIFF, GeoJSON) |
| `web/` | Az interaktív térképoldal (ez kerül a GitHub Pages-re) |

## Hol tartunk?

Lásd: [jegyzetek/00 Projektnaplo.md](jegyzetek/00%20Projektnaplo.md)
