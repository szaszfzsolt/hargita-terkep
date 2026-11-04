# Buktatók és tanulságok

Amibe belefutottunk (vagy várhatóan belefutunk), és hogyan oldottuk meg.

## Előre ismert buktatók

- **Felhő:** hegyvidéken kevés a tiszta nap → évszakos kompozit (medián, felhőmaszkkal).
- **Hegyárnyék:** télen az északi lejtők sötétek, torzítja az indexeket → nyári képek, vagy domborzati korrekció.
- **Vetület:** Stereo70 (EPSG:3844) vs. Web Mercator (EPSG:3857) vs. UTM 35N (EPSG:32635) → mindig ellenőrizni, átvetíteni.
- **Felbontás:** a kivágás nem javítja a felbontást; 10 m-en házak nem látszanak.
- **Méret:** minden zoomszint ~4× több csempe → a teljes megye max. 13. szintig.
- **Licenc:** Google/Esri műholdkép csak háttérnek, elemezni nem szabad.
- **Claude munkakörnyezete:** a külső adatszervereket (Copernicus, USGS) nem éri el letöltésre → a letöltés Earth Engine-ben vagy a saját gépen történik.

## Menet közben szerzett tanulságok

<!-- Formátum: ### ÉÉÉÉ-HH-NN – rövid cím  +  Mi történt / Mi lett a megoldás -->

### 2026-11-04 – Pontatlan megyehatár a FAO GAUL-ban
**Mi történt:** az Earth Engine beépített `FAO/GAUL/2015/level1` határa erősen egyszerűsített, Székelyderzs és Székelymuzsna kimaradt a kivágásból.
**Megoldás:** saját határfájl a geoBoundaries ROU ADM2 teljes felbontású adatából (Hargita megye 67 települése, 10 m-es topológiamegőrző egyszerűsítés, magyar nevekkel), feltöltve Earth Engine-assetként. Terület: 6637 km² (hivatalos: 6639 km²).
**Tanulság:** megyei/községi léptékben soha ne használjunk globális határadatbázist.

### 2026-11-04 – Ékezetes fájlnevek ZIP-ben
**Mi történt:** a Windows beépített kibontója elrontotta az ékezetes fájlneveket.
**Megoldás:** fájlnevek ékezet nélkül, a tartalom maradhat ékezetes.

### 2026-11-04 – A GitHub Desktop nem tudott klónozni a Dokumentumok mappába
**Mi történt:** `could not create work tree dir … No such file or directory` – a Windows zsarolóvírus elleni védelme (vezérelt mappahozzáférés) blokkolta.
**Megoldás:** a repó helye `C:\Users\Zsolt\hargita-terkep` (védett mappán kívül).

### 2026-11-04 – A közzétett app nem töltötte be a határokat
**Mi történt:** inkognitóban a községlista „Betöltés…" maradt, nem volt műholdréteg.
**Megoldás:** az app által használt asseteket meg kell osztani (Assets → asset → SHARE → *Anyone can read*). Az appot nem kell újra közzétenni.
**Tanulság:** közzététel után mindig inkognitóablakban is tesztelni.
