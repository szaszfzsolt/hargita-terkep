# T01 – Felhőmentes mozaik (a „Helló, világ!")

**Cél:** a teljes lánc kipróbálása adattól a kész interaktív térképig, egyetlen egyszerű témán.

## Mit tartalmaz majd

- Sentinel-2 valós színes nyári mozaik (felhőmentes medián), 10 m
- Domborzatárnyékolás (Copernicus DEM)
- Megye- és községhatárok
- Községválasztó (pl. Bögöz → ráközelítés)

## Lépések

1. [ ] Megyehatár és községhatárok beszerzése (GeoJSON)
2. [ ] Earth Engine-szkript: Sentinel-2 nyári medián, felhőmaszkkal, megyehatárra vágva
3. [ ] Export Google Drive-ra (GeoTIFF)
4. [ ] Domborzatárnyékolás exportja
5. [ ] Csempézés (PMTiles / COG)
6. [ ] Térképoldal (MapLibre vagy Leaflet) rétegváltóval és községválasztóval
7. [ ] Közzététel GitHub Pages-en
8. [ ] Ellenőrzés okostáblán és telefonon

## Jegyzetek menet közben


### Teendő: az app műholdképe elmosódottabb, mint a próbáé (2026-11-05, Zsolt észrevétele)
Valószínű okok:
- a v2 286 felvétel mediánját veszi (jún.–szept. közepe): a különböző pályákról készült képek pár méteres elcsúszása és az évszakos változás (kaszálás, aratás) „összemossa" a részleteket;
- a Cloud Score+ 0,60-as küszöbe átengedi a vékony párát → kisebb kontraszt.

Kipróbálandó (egyenként, összehasonlítva):
1. szűkebb időablak (pl. júl. 1 – aug. 15) + `CLOUDY_PIXEL_PERCENTAGE < 30` előszűrés;
2. szigorúbb küszöb (0,65–0,70);
3. medián helyett „legjobb pixel" mozaik (`qualityMosaic('cs_cdf')`) – éles, de foltosabb lehet;
4. a legtisztább néhány napot külön választva, kézzel.

**Döntés (2026-11-05):** az élességteszt alapján az **E – legjobb pixel** változat nyert (`qualityMosaic('cs_cdf')`, júl 1 – aug 20, <30% felhő, CS+ ≥ 0,65). → `T01_app_v2.js`, `T01_alapterkep_v3.js`.
Új réteg az appban: **Részletes légifotó (Google)** – csak megjelenítés, a kivágást sötétítő maszk adja.
