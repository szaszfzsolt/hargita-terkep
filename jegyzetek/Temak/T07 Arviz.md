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
