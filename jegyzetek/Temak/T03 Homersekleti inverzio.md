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

## Irányváltás (2026-11-07, délelőtt)
A téli napok (v1 napkereső) nem fedték le teljesen a Csíki-medencét (Csíkszereda a lefedetlen sávban); a derült arányt a v1 csak a lefedett pixelekre számolta. **Döntés (Zsolt jóváhagyta):**
1. **Napkereső v2** (`T03_tiszta_napok_v2.js`): napi mozaik, a megye és a két nagy medence (Csíki, Gyergyói) lefedettségének külön ellenőrzésével.
2. **MODIS éjszakai LST** átlag (1 km, teljes megye, minden medence egyszerre) – hosszú távú, megbízható kép.
3. **App átnevezése:** „Hőmérsékleti inverzió Hargita megyében"; medencénként választható grafikon.
4. A régi 5 téli nap (2014–2026) csak a Gyergyói-medencére és a Maros völgyére jó; felülvizsgálandó.

## Napkereső v2 – téli eredmény (2026-11-07)
15 nap, amelyen a megye 100%-a látszik; közülük inverziós (mindkét Δ negatív), derült és havas: **2017-01-19** (derült 95%, havas 66%, Csíki Δ −3,4, Gyergyói Δ −5,2), **2026-01-20** (81%, 71%, −3,4/−7,1), **2015-02-15** (89%, 60%, −2,8/−7,5), **2013-12-26** (71%, 44%, −5,3/−9,1). Ellenpéldák (hó nélkül, a medencealj melegebb): 2022-12-19, 2024-02-16, 2016-01-01.
A Landsat délelőtti (~10:30) mérése miatt a Δ mérsékelt; a hajnali inverzió erősebb → MODIS éjszakai réteg. A korábbi 7 export (T03_st_*) hiányos lefedettségű, kiváltandó.

## Új napok kiválasztva és bekötve (2026-11-07 este)
- Nyári napkereső (v2, `IDOSZAK = 'nyar'`): 24 nap teljes lefedettséggel; kiválasztva **2025-07-04** (derült 98%, Csíki Δ +7,8, Gyergyói +9,0) és **2026-07-31** (100%, +6,2 / +8,1).
- Új exportlista (`T03_export.js`): 2017-01-19, 2026-01-20, 2015-02-15, 2013-12-26, 2022-12-19 (hó nélküli ellenpélda), 2025-07-04, 2026-07-31. A régi 7 asset (hiányos lefedettség) nem kell; törölhető.
- App: új napok, hó nélküli ellenpélda, medencék közti választó a grafikonhoz (Csíki / Gyergyói / egész megye), kezdőnézet az egész megye, cím: „Hőmérsékleti inverzió Hargita megyében".
- Következő: export futtatása és megosztás (`T03_megosztas.js`), app ellenőrzése; majd MODIS éjszakai réteg.

- A `T03_megosztas.js` megszűnt (a Code Editor nem engedi az ACL állítását szkriptből); az új 7 asset (`T03_st_20170119`, `20260120`, `20150215`, `20131226`, `20221219`, `20250704`, `20260731`) megosztása kézzel történik, lásd U02.

## App v1 első teszt (2026-11-07 este)
- Mind a 7 nap teljes lefedettséggel betölt, szürke terület nincs; nevek, városok, medencéválasztó működnek.
- Gyergyói-medence, 2017-01-19 (tél, ~10:30): medencealj (600–700 m) ≈ −16 °C, 1100–1200 m-en ≈ −10,5 °C (kb. +5…6 °C melegebb), efölött újra hűl (1600 m: ≈ −13 °C) → inverzió látszik. Nyáron 700 m: ≈ 41 °C → 1600 m: ≈ 27 °C (normális rend).
- Egész megye, ugyanaz a nap: lapos profil (−14 … −10 °C) – a megyei átlag elmossa az inverziót; medencénként érdemes nézni.
- Ötlet: naponként saját színskála (az inverzió jobban látszik a téli képen), közzététel, MODIS éjszakai réteg.

## MODIS éjszakai réteg (az egész megye)
- Cél: a Landsat-napok nem fedik le mindig az összes medencét, ezért a MODIS Terra+Aqua éjszakai felszínhőmérsékletéből átlagot számolunk a derült éjszakákra (tél: 2014 dec.–2025 febr.; nyár: 2015 jún.–2025 aug.), 1 km-en.
- Szkript: `T03_modis_export.js` → assetek: `T03_modis_tel_ej`, `T03_modis_nyar_ej` (sávok: `t` °C, `n` éjszakák száma; legalább 100 éjszaka kell egy képponthoz).
- Korlát: 1 km-es felbontás, a kisebb medencék durván látszanak; a 100 m-es magassági sávok 1 km-es rácsra átlagolt domborzatból készülnek.
- App: a legördülő listában két új elem; „Közös skála” kapcsoló: bekapcsolva a két oldal színe összehasonlítható, kikapcsolva mindkét kép a saját tartományát használja.

### MODIS-eredmény (2026-11-07, app-teszt)
- Export: 1977 téli és 2024 nyári kép; egy képpontra átlagosan 352 (max. 632) téli és 510 (max. 1007) derült éjszaka jut, a 100-as küszöb bőven teljesül.
- Tanulság: az első változat (csak QC=0 és a maszkolás az ellenőrzés előtt) mindent kimaszkolt (`n: null`); a javított szkript a 0 értéket („nincs adat") külön szűri, a QC 0 és 1 kódot elfogadja. Ha az asset már létezik, az új exportnál előbb törölni kell (Assets → Delete).
- Térkép (saját skála): a Gyergyói-medence a legkékebb (legmélyebb hideglevegő-tó), a Csíki-medence is kékes, a hegyoldalak melegebbek.
- Diagram, téli éjszakák átlaga:
  - Gyergyói-medence: 600–700 m ≈ −9,7 °C, 1000 m ≈ −7 °C, efölött közel állandó → ≈ 2,5–3 °C-os inverzió. Átlag −8,3 °C, leghidegebb pont −10,7 °C.
  - Csíki-medence: 600 m ≈ −8,5 °C, 1000 m ≈ −7 °C → ≈ 1,5–2 °C. Átlag −7,5 °C, leghidegebb pont −10,2 °C.
  - Nyári éjszakák: Gyergyó ≈ +11…12 °C, majdnem vízszintes; Csík ≈ 12,5 → 10,5 °C felfelé. A nyári éjszakai görbe laposabb a normális lehűlésnél, ami összefügghet a nyári éjszakai hideglevegő-gyűléssel (ezt külön adatsor nélkül nem állítjuk biztosan).
- Értelmezés: a Landsat-nap (2017-01-19, délelőtt) ≈ 5–6 °C-os különbséget mutat, az éjszakai átlag kisebbet, mert sok éjszakát átlagol, 1 km-en; az átlag azt mutatja, hogy az inverzió tartós jelenség. A mérés felszínhőmérséklet, nem 2 m-es léghőmérséklet.
