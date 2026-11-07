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
