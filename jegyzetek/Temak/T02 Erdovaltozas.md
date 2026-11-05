# T02 – Erdőváltozás

**Cél:** megmutatni, hol és mikor tűnt el erdő Hargita megyében – vágás, széldöntés, szúkár.

## Adatok
- **Sentinel-2** évenkénti nyári „legjobb pixel" mozaik (jún 15 – szept 15), 2018–2025, 10 m.
- **Hansen Global Forest Change v1.12** (UMD): erdő 2000-ben (≥30% lombkorona) + évenkénti vesztés 2001–2024, 30 m. Earth Engine: `UMD/hansen/global_forest_change_2024_v1_12`.

## Módszer
- **Új vágás / erdőkár két év között:** NBR = (B8 − B12)/(B8 + B12). Ahol az „előtte" évben erdő volt (NDVI > 0,7) és az NBR több mint 0,25-tel csökkent → vágás/kár. Zajszűrés: legalább 10 összefüggő pixel (~0,1 ha).
- **Erdőkiemelő színezés:** B11–B8–B4 (SWIR–NIR–vörös): erdő sötétzöld, friss vágás rózsaszín-lila.

## App (`T02_erdovaltozas_app_v1.js`)
- két év egymás mellett, „függönnyel"
- rétegek: új vágás (lila), Hansen-vesztés évenként (sárga → lila), községhatárok
- községválasztó, kattintásra is
- számok: erdő 2000-ben, vesztés 2001–2024 (ha, %), új vágás a két év között; oszlopdiagram évente

## Ellenőrző adatok (Zsolt gyűjtése, 2026-11-05)
Forrás: Direcția Silvică Harghita (a megyei területrendezési tanulmány közli, hargitamegye) – *a táblázat pontos tartalmát (év, vágás vagy kár) tisztázni!*

| Erdészeti hivatal | Terület (ha) | Faanyag (m³) |
|---|---|---|
| Borszék | 3379 | 104 491 |
| Homoród | 1310 | 35 005 |
| Csíkszereda | 2285 | 81 754 |
| Maroshévíz | 2455 | 56 316 |
| Gyergyótölgyes | 2343 | 42 115 |

- **2020-as széldöntés:** közel 1000 ha erdő semmisült meg; utána felgyorsult az újraerdősítés, főleg a csíki és a gyergyói régióban (Marosvásárhelyi Rádió).
- **Teszt:** 2019 → 2021 összehasonlítás a gyergyói és csíki községekben; a Hansen-grafikonon 2020–2021-ben kiugrás várható.

## Teendők / ötletek
- [ ] első futtatás, küszöbök finomítása (0,25 NBR, 0,7 NDVI)
- [ ] ismert események ellenőrzése (pl. nagyobb széldöntések) – helyismeret kell!
- [ ] évenkénti mozaikok előre kiszámolása assetként (gyorsítás, mint a T01-nél)
- [ ] közzététel
