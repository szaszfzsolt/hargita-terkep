# Követelmények

Mit kell tudnia a kész térképnek. Ha új igény jön, ide kerül.

## Kötelező

- [ ] Interaktív webes térkép, böngészőben fut, telepítés nélkül
- [ ] Működik okostáblán (nagy kijelző, érintés) és telefonon is
- [ ] Rétegváltó: műholdkép, domborzat, határok, településnevek, témarétegek
- [ ] **Községválasztó:** legördülő lista / kereső a megye 67 településére (pl. Bögöz); a térkép ráközelít, a határon kívüli rész elhalványul
- [ ] Megye → község ráközelítés legyen természetes
- [ ] Forrásmegjelölés minden rétegnél (Copernicus, USGS/NASA stb.)
- [ ] Magyar nyelvű felület

## Szeretnénk

- [ ] „Előtte–utána" csúszka (két időpont vagy két réteg összehasonlítása)
- [ ] Idővonal (évek közti váltás, pl. erdőváltozás)
- [ ] Régi térkép (mapire.eu, katonai felmérések) vs. mai műholdkép
- [ ] 3D domborzat (pl. Csomád, Szent Anna-tó)
- [ ] Községenkénti kivágat nyomtatható A4-es lapként (PNG/PDF), jelmagyarázattal, léptékkel
- [ ] Községenkénti statisztika (erdő/rét/szántó/település %)
- [x] Településnevek magyarul, kapcsolhatóan, megyei nézetben is (T02 app v2.3)
- [x] Beépített terület / épületkörvonalak, kapcsolhatóan (T02 app v2.3)
- [ ] Falu szintű nézet: becsült faluhatár (Voronoi-felosztás a községen belül) + falu-választó
- [ ] **Ötlet:** történeti faluhatárok (régi kataszteri térképek, katonai felmérések – mapire.eu, Hungaricana) kézi átrajzolással QGIS-ben, kiemelt falvakra (Bögöz környékével kezdve)

## Technikai keretek

- Közzététel: GitHub Pages (≈1 GB / oldal, 100 MB / fájl)
- Teljes megye a 13. zoomszintig, kiemelt helyek a 14–15.-ig
- Rétegformátum: PMTiles vagy COG
- Vetület a weben: Web Mercator (EPSG:3857); forrásadatok gyakran Stereo70 (EPSG:3844) vagy UTM 35N
