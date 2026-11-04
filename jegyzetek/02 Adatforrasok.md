# Adatforrások

Minden használt adat ide kerül: honnan, milyen felbontás, milyen licenc, melyik dátum.

## Műholdképek

| Adat | Felbontás | Mire jó | Honnan | Licenc |
|---|---|---|---|---|
| Sentinel-2 | 10 m (látható, NIR), 20 m (SWIR) | valós színes kép, NDVI, erdő, víz, hó | Earth Engine / Copernicus Data Space | szabad, forrásmegjelöléssel |
| Landsat 5–9 | 30 m, hősáv ~100 m | idősor 1984-től, felszíni hőmérséklet | Earth Engine / USGS | szabad (public domain) |
| Sentinel-1 (radar) | 10 m | felhőn át: árvíz, nedvesség | Earth Engine / Copernicus | szabad |
| Sentinel-2 cloudless mozaik (EOX) | 10 m | kész háttérkép, nem kell tárolni | s2maps.eu | CC BY 4.0 (ellenőrizni az évet) |

## Domborzat

| Adat | Felbontás | Honnan |
|---|---|---|
| Copernicus DEM GLO-30 | 30 m | Earth Engine / Copernicus |

## Tematikus kész termékek

| Adat | Felbontás | Mire jó |
|---|---|---|
| ESA WorldCover | 10 m | felszínborítás (erdő, rét, szántó, beépített…) |
| Corine Land Cover | 100 m | felszínborítás idősor (1990–) |
| VIIRS éjszakai fények | ~500 m | települések, kivilágítás |
| Sentinel-5P | ~5 km | légszennyezés (NO₂ stb.) |
| MODIS hóborítottság | 500 m | napi hóborítás |
| Hansen Global Forest Change | 30 m | erdővesztés évente (2001–) |

## Vektoradatok

| Adat | Mi | Honnan |
|---|---|---|
| Közigazgatási határok (UAT) | megye, községek, városok | geo-spatial.org; GitHub: akaleeroy/romania-uat |
| Települések | nevek, SIRUTA-kód | GitHub: Gabrieldevro/romania-geo-data |
| Utak, vizek, POI | OpenStreetMap | Geofabrik letöltés (Románia) |

## Nagy felbontású / történeti (ellenőrizendő)

| Adat | Felbontás | Megjegyzés |
|---|---|---|
| ANCPI ortofotó | ~0,5 m | WMS; felhasználási feltételeket ellenőrizni |
| Habsburg katonai felmérések | – | mapire.eu, georeferált |
| Hungaricana térképtár | – | régi turistatérképek (Hargita-hegység 1:50 000, 1:110 000) |

## Használt adatok naplója

| Dátum | Adat | Pontos azonosító / időszak | Hol használtuk |
|---|---|---|---|
| 2026-11-04 | geoBoundaries ROU ADM2 (gbOpen) | GitHub: wmgeolab/geoBoundaries, teljes felbontás | `adatok/kesz/hatarok/` – megye + 67 település |
| 2026-11-04 | Sentinel-2 SR Harmonized | 2025-06-01 – 2025-08-31, medián, SCL felhőmaszk | T01 próba |
