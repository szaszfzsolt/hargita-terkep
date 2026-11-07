# T07 – Árvíz Hargita megyében

**Cél:** a megyét ért nagy árvizek bemutatása műholdképről, a lehető legjobb felbontásban. A mai diákok nem emlékeznek rájuk, de otthon hallhattak róluk.

## Események (sorrend)
1. **2025. május–június** (Praid: Korond-patak és sóbánya, Csíkszereda, Székelyudvarhely, Kovászna megye) – Sentinel-1 radar + Sentinel-2, 10 m.
2. **2018. június** (Székelyföld, Olt mente) – Sentinel-1 + Sentinel-2, 10 m.
3. **2005 / 2010** – csak Landsat 5, 30 m, ritka felhős képek, radar nincs.
(1970-es nagy árvíz: nincs használható műholdkép.)

## Adatok és felbontás
- Sentinel-1 GRD (VV), 10 m képpont, felhőn át is lát; 2014-től. Azonos pálya/irány kell az előtte–utána összehasonlításhoz. Víz = alacsony visszaszórás. Hátrány: erdőben, városban, meredek lejtőn téves; a kis patakok hirtelen árvizét a 6–12 napos visszatérés elhibázhatja.
- Sentinel-2 (10 m): árvíz alatt általában felhős; az árvíz utáni tiszta napokon az iszap és az elöntött terület látszik.
- Copernicus DEM (30 m): elöntésveszélyes sávok (legközelebbi vízfolyás feletti magasság). Ez a legjobb ingyenes domborzatmodell.
- Az Európai Katasztrófakezelési Szolgálat (Copernicus EMS) kész, nagyfelbontású árvíztérképeket is ad, ha aktiválták az eseményt. Az adott eseményre **még ellenőrizendő**.

## Lépések
1. `T07_arviz_napok.js` – mely napokon van radar- és optikai kép (2025, majd 2018).
2. Radarból elöntésmaszk (előtte–utána különbség), export assetként.
3. App: függöny (előtte–utána), elöntött terület községenként.

## 2025 – napkereső eredménye (2026-11-08)
- Teljes lefedettségű (100%) radarpályák: **7. pálya DESCENDING** (máj. 11, 17, 23, 29, jún. 4, 10), **131. pálya ASCENDING** (máj. 13, 19, 25, 31, jún. 6, 12). A 109-es (86%) és 29-es (85%) pálya nem fedi le az egészet, az 58-as alig (1–2%).
- A csapadék csúcsa kb. máj. 26–27 (hírek alapján); a csúcsnapon nincs teljes lefedettségű kép.
- Választott pár: 7. pálya, máj. 23 (előtte) → máj. 29 (utána). Ellenőrző pár: 131. pálya, máj. 25 → máj. 31.
- Szkript: `T07_arviz_terkep_v1.js` (előnézet a térképen; küszöbök: utána < −15 dB, változás < −3 dB, lejtő < 5°, állandó víz kizárva, legalább 10 képpontos folt).

## 2025 – első eredmény (2026-11-08)
- Radar-előtte–utána (7. pálya, máj. 23 → máj. 29): szigorú 2,8 km², laza 5,0 km² az egész megyében. Csíkszereda mellett egy kisebb réti folt, Praidnál csak elszórt hamis jel (legelők, erdőszél), a Korond-patak völgye üres.
- Ok: a csapadékcsúcsot (máj. 26–27) nem kapta el teljes lefedettségű radarkép; az árvíz Hargita megyében főleg helyi, hirtelen áradás volt; a radar csak a nyílt vizet látja sötétnek (fűvel borított elöntött rét, hullámzó folyó, utcák nem).
- Optikai (Sentinel-2): máj. 12–jún. 1 között végig felhős; tiszta: jún. 6 (13%), jún. 8 (9%), 100% lefedés – csak utólagos következményekre jó.
- Következtetés: a 2025-ös esemény ezekkel a napokkal nem mutatható be látványosan. Következő: **2018. június**, utána 2005/2010.

## 2018 – napkereső eredménye (2026-11-08)
- Csapadék/árvíz: 2018. jún. 28–30. (Székelyföld, Tatros, Olt mente).
- Teljes lefedésű radarpályák: 7 DESC (jún. 17, 23, **29**, júl. 5, 11), 131 ASC (jún. 19, 25, **júl. 1**, júl. 13). 109 DESC (85%): jún. 18, **30**, júl. 12.
- Optikai: csak júl. 3. használható (felhő 23%, 100% lefedés); a többi nap 38–100% felhő.
- Párok a szkriptben: `2018a` (jún. 23 → 29, 7. pálya), `2018b` (jún. 25 → júl. 1, 131. pálya), `2018c` (jún. 18 → 30, 109. pálya, 85%).

### 2018a – első eredmény (2026-11-08)
- Radar (7. pálya, jún. 23 → 29): szigorú 0,27 km², laza 11,1 km². A laza foltok nem folyóvölgyben, hanem dombtetőn, kiirtott erdőfoltokon és legelőkön voltak (Kalonda–Székelypálfalva környéke): eső áztatta csupasz talaj is sötétedik a radaron → hamis jel.
- Javítás: HAND-maszk (MERIT Hydro `hnd` < 10 m), hogy csak a vízfolyás közelében jelöljön elöntést.

## Radaros elöntéstérkép – tanulságok (2026-11-08, lezárva)
- 2025a: szigorú 2,8 / laza 5,0 km²; 2018a: szigorú 0,27 / laza 11,1 km²; HAND-maszkkal 0,09 / 4,4 km². A maradék foltok dombtetői legelőkön és kiirtott erdőfoltokon voltak (eső áztatta csupasz talaj), nem folyóvölgyben.
- Okok: a felvétel az esőben készült (minden sötétedik); a hirtelen, helyi áradás gyorsan levonul, a 6 napos radar elhibázza; a keskeny hegyi völgyekhez a 10 m-es radar és a 90 m-es HAND kevés; a fűvel borított elöntött rét a radaron nem sötét.
- Döntés: a radaros elöntéstérkép nem megbízható ezeknél az eseményeknél, nem közöljük elöntött területként. Szkript megmarad (`T07_arviz_terkep_v1.js`) kísérleti jelleggel.
- Megbízhatóbb alternatívák (ötlet, nem készült el): csapadék (GPM IMERG), árvízveszélyes sáv (HAND/DEM), a radar változás-rétege „nedves talaj lábnyomaként", Copernicus EMS hivatalos térkép (ha van).
- Tanulság: ne állítsunk elöntéskiterjedést, amit nem tudunk igazolni; a tanároknak szánt eszköznél a bizonytalan jel félrevezet.
- Következő: 2005 / 2010 – Landsat 5/7 (30 m) napkereső: `T07_landsat_napok.js`.

## 2005. augusztus 23. – Nyikó-menti villámárvíz (forrás: Székelyhon)
- Verőfényes nyári nap délutánja, felhőszakadás után rohamosan áradó patak: 16 áldozat, 29 lakóház pusztult el, közel 2000 lakó- és gazdasági épületben kár. Hét település a Nyikó mentén, köztük Szombatfalva, Székelyszentlélek, Farkaslaka, Siménfalva, Farcád, Hodgya. A cikk nem ad pontos adatot az eső kezdetéről, a vízcsúcsról és az elöntés kiterjedéséről.
- Következmény a műholdadatokra: hirtelen, órák alatt levonuló árvíz – magáról a vízről nincs műholdkép (Landsat 16 naponta, 30 m; radar nincs). Legfeljebb utólagos nyomok (hordalék, növényzet, meder) látszhatnak, 30 m-en valószínűleg alig.
- Tervezett térkép: a Nyikó vízgyűjtője és az érintett települések; MERIT Hydro (90 m): vízgyűjtő-terület (`upa`), legközelebbi vízfolyás feletti magasság (`hnd`), meder szélessége (`wth`); Copernicus DEM lejtő. Üzenet: miért tudott egy kis patak 16 életet követelni (meredek kis vízgyűjtő, keskeny völgy, felhőszakadás).

## HELYESBÍTÉS: a „311 gazdaság, 130 ha” hírszöveg a 2010. júniusi árvízről szól (forrás: 24.hu, 2010. jún. 27., vasárnap; a cikket nem tudtam megnyitni, a dátum a webcímből és a „vasárnap”–„hétfői második árhullám” szövegből következik)
- Az alábbi szakasz tartalma (helyszínek, kár) a **2010-es** eseményre vonatkozik; a 2018-hoz csak a Csíki Hírlap (2018. júl. 9.) sorai tartoznak.

## Az esemény helyszínei (2010. jún. 27.; Zsolt hírszövege)
- Elöntött: 9 település, 311 gazdaság, 130 ha mezőgazdasági terület (első jelentés). Legtöbb kár: **Csíkszentmihály, Gyimesközéplok, Gyimesfelsőlok**; továbbá Madéfalva, Csíkszentsimon, Csatószeg, Csíkszereda; udvarhelyszéki oldalon Eted, Homoródszentmárton. Nyerges-tetői műút megrongálódott, a gyimesi vasút szünetelt; piros kód az Olt felső szakaszán és a Feketeügyün; második, nagyobb árhullám várható hétfőn.
- A Csíki Hírlap (2018. júl. 9.) szerint az első becslés több mint 2200 ha mezőgazdasági kár (köztük 1929 ha legelő/kaszáló, 197 ha burgonya), főleg Csíkszék; egy hónap alatt kb. félévnyi csapadék.
- **Hiba az eddigi ellenőrzésben:** a 2018a-nál a hamis foltokat Kalonda–Székelypálfalva környékén (Udvarhelyszék) néztük, nem a Csíki-medencében/Gyimesekben. A 2018a „utána" képe (jún. 29. reggel) a vasárnapi (júl. 1.) csúcs előtti volt.
- Következő teszt: `PAR = '2018b'` (jún. 25 → júl. 1. este, 131. pálya), helyszín: Csíkszentmihály, Madéfalva, Csíkszentsimon (Olt völgye) és Gyimes (Tatros).

## 2010 – Landsat-napkereső eredménye (2026-11-08)
- Ablak: 2010-06-10 – 07-15. Felvételek: jún. 18 (L5, 182/28, felhő 79%), jún. 24 (L7, 184/28, 87%), **júl. 2** (L5, 184/28: 17%; 184/27: 33%), **júl. 3** (L7, 183/28: 26%; 183/27: 40%), júl. 11 (L5, 72–77%).
- Az árvíz (jún. 25–29.) előtti napokra nincs tiszta kép; használható: júl. 2–3. (3–7 nappal utána).
- Módszer: MNDWI (zöld, SWIR1) a júl. 2–3-i mozaikon; „száraz" viszonyítás = júl. 16 – szept. 30 felhőmaszkolt mediánja; HAND < 10 m, lejtő < 5°, állandó víz kizárva. Szkript: `T07_arviz_2010_landsat.js`.
- Korlát: az árvíz utáni állapot, 30 m, Landsat 7 csíkos.

## 2005 – Landsat-napkereső eredménye
- Ablak: 2005-08-01 – 09-15. **2005-08-22** (L7, 183/27: felhő 0%; 183/28: 6%) = az árvíz (aug. 23.) előtti nap; **2005-09-06/07** (L5 184/27: 15%; L7 183/27: 1%, 183/28: 3%) = két héttel utána. Landsat 7: csíkos (SLC-off).
- Terv: előtte–utána a Nyikó-völgyre (hordalék, kopár partszakaszok, növényzetvesztés), 30 m.

### 2010 – eredmény (2026-11-08)
- `T07_arviz_2010_landsat.js`: a jelölt árvíz utáni nyom (júl. 2–3-án nedves, a száraz nyári viszonyításban nem) 1,05 km² a megyében; a térképen az **Olt** menti réteken, keskeny sávban, a völgyfenéken látszik (Zsolt megerősítette a helyszínt: Olt). Korlát: árvíz utáni állapot (3–7 nap), 30 m, Landsat 7 csíkos; nem az elöntés teljes kiterjedése. Feliratozás: „árvíz utáni nyom".

### 2005 – szkript
- `T07_arviz_2005_nyiko.js`: függöny, bal: 2005-08-22 (árvíz előtti nap), jobb: 2005-09-06/07; megjelenítés: valódi szín / NDVI / MNDWI. Várható: csak az erősebb nyomok látszanak 30 m-en.
