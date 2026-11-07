# T03 – Hőmérsékleti inverzió – a Csíki-medence hidegtava

**Állapot:** 🔧 folyamatban (indítás: 2026-11-07)

## Cél
Megmutatni, hogy derült, szélcsendes téli időben a medencealj hidegebb, mint a hegyoldal (inverzió), és nyáron fordított a rend.

## Tervezett app
- Téli felszínhőmérséklet-térkép (derült, havas nap)
- Nyár ↔ tél függönnyel
- Magasság–hőmérséklet grafikon (Copernicus DEM), községválasztóval
- Esetleg: húzható metszetvonal (pl. Csíkszereda → Hargita-tető)
- Feliratok, határok, sötétítés: a T02 appból átvéve

## Adatok
- Landsat 8–9 hősáv (ST_B10, 30 m-re finomítva, ~8 naponta, áthaladás ~10:30)
- MODIS MOD11A1/MYD11A1 éjszakai LST (1 km, naponta) – a hidegtó éjjel a legerősebb
- Copernicus DEM GLO-30

## Buktatók
- Felszínhőmérséklet, nem léghőmérséklet (a hómező felszíne hidegebb a levegőnél) – az appban kiírni
- Köd / alacsony rétegfelhő a medencében → a műhold a felhőtetőt látja; szűrni kell
- Kevés jó téli Landsat-kép → több tél legjobb napjaiból válogatni

## Első lépések
1. Earth Engine-szkript (`szkriptek/earth-engine/T03_tiszta_napok.js`): derült téli Landsat-napok listája (dec–feb, 2014–2026), felhő/hó szerint rangsorolva
2. 3–5 legjobb tél + 1–2 nyári nap kiválasztása, export assetként
3. App: a T02 vázára építve

## Eredmények (2026-11-07)
`T03_tiszta_napok.js` futtatva: 293 téli Landsat 8/9 felvételből 8 sor felel meg (derült ≥85%, havas ≥70%) – 5 különböző nap (a Csíki-medence két szomszédos Landsat-sávon fekszik, ezért egyes napok kétszer szerepelnek). Mind negatív: a medencealj 2,6–12,7 °C-kal hidegebb a hegyoldalnál (850–1150 m).

| Nap | Medencealj °C | Hegyoldal °C | Különbség |
|---|---|---|---|
| 2014-02-03 | −16,1 | −3,4 | −12,7 |
| 2017-01-10 | −22,1 | −16,0 | −6,1 |
| 2017-02-11 | −11,9 | −7,0 | −5,0 |
| 2021-01-21 | −6,1 | −2,3 | −3,7 |
| 2026-01-19 | −12,2 | −8,6 | −3,6 |

Következő: nyári nap(ok) kiválasztása (`T03_nyari_napok.js`), majd export asset és app.

## Export és app (2026-11-07)
- `T03_export.js`: 7 nap (5 téli, 2 nyári: 2025-07-03, 2026-08-23) → assetek `T03_st_ÉÉÉÉHHNN` (°C, 30 m, megyére vágva). Mind a 7 kész.
- `T03_megosztas.js`: az assetek nyilvánossá tétele (ee.data.setAssetAcl) – kézzel is megy (Assets → SHARE → Anyone can read).
- `T03_app_v1.js`: két nap függönnyel, árnyékolt domborzat, jelmagyarázat, községválasztó, magasság–hőmérséklet grafikon (100 m-es sávok), felszínhőmérséklet-figyelmeztetés. Falunevek még nincsenek (a T02 appból átvehetők).
- Később: MODIS éjszakai LST, húzható metszetvonal, falunevek.

- App v1 bővítve (2026-11-07): külön kapcsolható **községhatárok, városok, községközpontok, falvak (pontok)** és **településnevek** (a T02 appból átvett névlista és betűkészlet; városnevek 8-as, községközpontok 10-es, falvak 12-es nagyítástól; kiválasztott községnél annak minden települése).
