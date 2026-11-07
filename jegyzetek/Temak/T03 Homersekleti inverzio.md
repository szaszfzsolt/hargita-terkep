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
