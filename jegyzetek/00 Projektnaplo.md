# Projektnapló

> Minden munkamenet végén ide kerül: mit csináltunk, mi lett az eredmény, mi a következő lépés.
> Új beszélgetésben Claude-nak elég ezt a fájlt megmutatni, és onnan folytatja.

## Jelenlegi állapot (2026-11-05, 19:20)

- **Fázis:** T01 ✅ kész · T02 Erdőváltozás 🔧 folyamatban
- **Earth Engine:** projekt `tidal-velocity-494919-e2`, felhasználó `szaszfzsolt`, szkriptek: `users/szaszfzsolt/T01_proba/…`
- **Közzétett app (T01, v3):** https://tidal-velocity-494919-e2.projects.earthengine.app/view/hargita-megye-muholdrol
- **Assetek (mind „Anyone can read"):** `hargita_kozsegek_shp`, `hargita_megye_shp`, `T01_s2_2025_nyar_10m`
- **Projektmappa a gépen:** `C:\Users\Zsolt\hargita-terkep` (GitHub: szaszfzsolt/hargita-terkep)

### ▶ Innen folytatjuk (T02)
1. EE: új fájl `evi_mozaikok_export` ← `T02_evi_mozaikok_export.js` → Run → Tasks: **8× RUN** (`T02_s2_nyar_2018` … `_2025`).
2. Ha mind kész: Assets → mind a 8 → SHARE → **Anyone can read**.
3. `erdo_app_v1` kódját lecserélni ← `T02_erdovaltozas_app_v2.js` → Save → Run.
4. Teszt: Gyergyótölgyes 2018–2025 (több színes folt, kék oszlopok a pirosak mellett); 2020-as széldöntés keresése a csíki/gyergyói községekben.
5. Tisztázni: a Direcția Silvică táblázat (ha, m³) mire vonatkozik?
6. Utána: T02 app közzététele, kártya a `szemleltetok` oldalra.

---

## 2026-11-04 – Indulás

**Megbeszéltük:**
- Mire jók az ingyenes műholdadatok, mekkora a reális felbontás (Sentinel-2: 10 m), mik a buktatók.
- Eszközök: Google Earth Engine (felhős számolás), QGIS (helyi munka), Obsidian (jegyzetek), GitHub (verziózás + közzététel GitHub Pages-en).
- Tárhely: a nyers adatot nem töltjük le, Earth Engine-ben számolunk; helyben 10–20 GB elég, a weben az első változat 200–500 MB körül.
- Igény: községre (pl. Bögöz) kivágható nézet → [[01 Kovetelmenyek]]
- Munkaidő-becslés: első működő változat 1–2 munkamenet, témánként 1–2 munkamenet.

**Elkészült:**
- Projektmappa-váz, jegyzetszerkezet, regisztrációs útmutató.

**Döntések:**
- A jegyzetek a projektmappán belül, Markdownban → Obsidian-tár + GitHub.
- A nyers adatok nem kerülnek gitbe (`.gitignore`).

**Nyitott kérdések:**
- GitHub-repó neve, nyilvános legyen-e (GitHub Pages ingyenesen csak nyilvános repóval megy).
- ANCPI ortofotó felhasználási feltételei.

## 2026-11-04 (este) – Earth Engine és az első műholdkép

**Elkészült:**
- Earth Engine-regisztráció (nem kereskedelmi, oktatási), projekt: `tidal-velocity-494919-e2`.
- Első próba: 2025 nyári Sentinel-2 medián mozaik a megyére – működik.
- Obsidian telepítve, a `jegyzetek` mappa széfként megnyitva.

**Probléma → megoldás:**
- A FAO GAUL megyehatár pontatlan (pl. Székelyderzs, Székelymuzsna kimaradt) → saját pontos határok: geoBoundaries ROU ADM2 (geo-spatial.org/ANCPI alapú), 67 település magyar és román névvel → `adatok/kesz/hatarok/`.
- A kép túl sötét volt (max 3000) → `max: 1500, gamma: 1.3`.

**Nyitott:**
- Balánbánya (1,4 km²) és Tusnádfürdő (1,9 km²) területe a forrásadatban gyanúsan kicsi – ellenőrizni.

**Zárás (22:08):**
- Határok feltöltve Earth Engine-be (`hargita_kozsegek_shp`, `hargita_megye_shp`), a próba szkript fut: 67 település, pontos megyehatár. Mentve: `users/szaszfzsolt/T01_proba/proba_v1`.
- Ismert hibák a próbaképen: szögletes adathiány a megye déli részén (Brassó megye határánál) és halvány csempehatárok → Cloud Score+ felhőszűrővel javítjuk.
- GitHub-repó (`szaszfzsolt/hargita-terkep`) és GitHub Desktop beállítva, a régi mappa: `Dokumentumok\Hargita-terkep-regi`.
- T01 v2 szkript (`users/szaszfzsolt/T01_proba/alapterkep_v2`): Cloud Score+ felhőszűrés – a lyuk és a csempehatárok eltűntek; domborzat; 3 export elindítva a Drive `HargitaTerkep` mappájába.
- Exportok elkészültek a Drive `HargitaTerkep` mappájában: Sentinel-2 10 m (544 MB), színes domborzat 30 m (59 MB), DEM 30 m (28 MB).
- Korlát: ekkora fájlokat Claude nem tud a Drive-ról áthozni → webes csempézés majd QGIS-ben, külön alkalommal.
- Addig: **Earth Engine App** (`T01_app_v1.js`) – községválasztó, 4 réteg (valós, infravörös, NDVI, domborzat), kivágás egy községre, kattintásra település-adatok.
- App közzétéve: https://tidal-velocity-494919-e2.projects.earthengine.app/view/hargita-megye-muholdrol (forrás: `users/szaszfzsolt/T01_proba/app_v1`).
- **Teendő:** az `alapterkep_v2` Earth Engine-szkriptet véletlenül felülírta az app kódja → visszaállítani a `T01_alapterkep_v2.js`-ből.
- Az app inkognitóban is működik, miután a két asset (`hargita_kozsegek_shp`, `hargita_megye_shp`) megosztása „Anyone can read" lett. Teszt: Bögöz, NDVI, kivágás – 64,4 km², 427–890 m.

## 2026-11-05 – Élességteszt
- `T01_elesseg_teszt.js`: 5 mozaikváltozat (A próba, B app, C szűk ablak, D legtisztább napok + C, E legjobb pixel) két összekapcsolt, „függönyös" térképen, Bögöz közelről.
- Cél: kiválasztani a legélesebbet, és azzal frissíteni az appot és az exportot.
- Élességteszt eredménye: **E (legjobb pixel)** a legélesebb (Zsolt). Az A élesebb volt a B-nél → a sok kép mediánja mosta el.
- `T01_app_v2.js`: E-mozaik + „Részletes légifotó (Google)" réteg, kivágás sötétítő maszkkal. `T01_alapterkep_v3.js`: exportok az E-mozaikkal.
- `alapterkep_v2` Earth Engine-szkript visszaállítva.
- App v2 közzétéve és nyilvánosan tesztelve (inkognitó): működik, élesebb kép, Google légifotó réteg.
- **Következő ötlet:** a mozaikot egyszer kiszámolni és assetként elmenteni → az app gyorsabban tölt be (most élőben számol, csempénként jelenik meg).

## 2026-11-05 (este) – Gyorsítás: előre kiszámolt mozaik
- `T01_mozaik_asset_export.js` → asset: `T01_s2_2025_nyar_10m` (5 sáv, uint16, UTM 35N, 10 m).
- `T01_app_v3.js` ezt olvassa be élő számolás helyett. Az assetet nyilvánossá kell tenni (Anyone can read)!
- Mozaik-export 8 perc alatt kész (`T01_s2_2025_nyar_10m`), megosztva; az `app_v1` szkriptben a v3 kód fut.
- App v3 közzétéve, inkognitóban tesztelve: a mozaik asset nyilvánosan olvasható, a kép az előre kiszámolt assetből jön.

## 2026-11-05 (este) – T02 Erdőváltozás indul
- `T02_erdovaltozas_app_v1.js`: két év függönnyel, új vágások (dNBR), Hansen 2001–2024, községi grafikon. Lásd [[T02 Erdovaltozas]].
- T02 első teszt: Hansen-rész jó; Sentinel-becslés kevés (újra kizöldült vágások) → app v2 évről évre hasonlít; ehhez 8 évenkénti mozaik export (`T02_evi_mozaikok_export.js`).
- 2026-11-06 reggel: mind a 8 évenkénti export kész (`T02_s2_nyar_2018…2025`, egyenként 9–26 perc). Következik: megosztás (Anyone can read) + app v2 az `erdo_app_v1` szkriptbe.
- App v2 hiba: `connectedPixelCount` lebegőpontos maszkon nem fut → a maszkot egész típusúvá alakítjuk (`gt(0).toByte()`).
- App v2 a javítással fut az `erdo_app_v1` szkriptben (2026-11-06 06:35). Következik: közzététel Earth Engine Appként, inkognitós teszt.
- App v2 első teszt (Bögöz, 2018→2025): a Sentinel-becslés 2317 ha, több mint a község teljes erdeje (1954 ha) → téves jelzés a kaszált réteken és a szántókon. Javítás (v2.1): erdőmaszk (ESA WorldCover 2020 + Hansen 2000) és tartóssági feltétel (2 év múlva is alacsony NBR).
- v2.2: „Csak a kiválasztott község” kapcsoló (Zsolt kérése): bekapcsolva a környék elsötétítve, kikapcsolva a megye teljes képe látszik, a község narancs körvonallal; a számok mindig a községre vonatkoznak.
- v2.3: kapcsolható **beépített terület / épületek** (távolról ESA WorldCover beépített foltok, 14. nagyítástól VIDA Google–Microsoft épületkörvonalak) és **magyar településnevek** (264 falu, megyei nézetben a községközpontok; gena text csomag). Adat: `adatok/kesz/telepulesek/hargita_falvak.csv` – 48 bizonytalan magyar név ellenőrzésre vár. Ötletlistára: történeti faluhatárok.
- v2.4: a gena szövegcsomag nem ismeri az ékezetes betűket (hiba: 'ü') → saját vonalas betűkészlet (Hershey futural, közkincs), az ékezeteket a program rajzolja; a nevek a látható területhez igazodnak.
- Településnevek: Zsolt névlistája (`adatok/kesz/telepulesek/hargita_telepulesek_nevek.csv`) a hiteles forrás; összevonva a pontokkal (264 település, 63 név javult). App: v2.4 a frissített nevekkel.
- 2026-11-06 15:52: v2.4 (986cfe7) működik: saját magyar nevek helyes ékezetekkel, Google-feliratok nélküli háttér. Apró: Homoródszentlászló és Ábránfalva felirata összeér.
