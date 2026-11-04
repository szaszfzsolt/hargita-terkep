# U01 – Regisztrációk és telepítés

Sorrendben, pipáld ki, ami megvan. Ha valahol elakadsz, írd le Claude-nak, hol (vagy küldj képernyőképet).

## 1. Obsidian (5 perc)

- [x] Letöltés: https://obsidian.md → Download → Windows
- [x] Telepítés után: **„Open folder as vault"** → válaszd ki: `C:\Users\Zsolt\hargita-terkep\jegyzetek`
- [x] Kezdésnek a `00 Projektnapló` jegyzetet nyisd meg
- Bővítményt egyelőre ne telepíts.

## 2. Google Earth Engine (15–20 perc, ez a legbürokratikusabb)

- [x] Nyisd meg: https://earthengine.google.com → **Get started**
- [x] Jelentkezz be a Google-fiókoddal (szaszfzsolt@gmail.com)
- [x] **Register a Noncommercial or Commercial Cloud project** → **Unpaid usage** → felhasználás típusa: **Education / Academia** (vagy *Nonprofit*/*Personal*, ami a legközelebb áll)
- [x] **Create a new Google Cloud Project** – javasolt projektazonosító: `hargita-terkep` (ha foglalt, pl. `hargita-terkep-szfzs`)
- [x] Elfogadod a feltételeket → **Continue to summary** → **Confirm**
- [x] Ellenőrzés: nyisd meg https://code.earthengine.google.com – ha betölt a kódszerkesztő (bal oldalt Scripts, középen üres szkript, lent térkép), kész vagy.
- [x] A projektazonosítót írd be ide: `tidal-velocity-494919-e2` (felhasználónév: `szaszfzsolt`)
- Bankkártya NEM kell a nem kereskedelmi használathoz. Ha mégis kérné, állj meg, és szólj.

## 3. Copernicus Data Space (5 perc)

- [ ] https://dataspace.copernicus.eu → **Register** (jobb felső sarok)
- [ ] E-mail-megerősítés
- [ ] Próba: **Copernicus Browser** → keresd meg Csíkszeredát, és nézz meg egy friss Sentinel-2 képet. Ez csak felfedezésre kell, letölteni nem muszáj.

## 4. QGIS (15 perc, ráér a 2. munkamenetig)

- [ ] https://qgis.org → Download → Windows → **QGIS Standalone Installer, Long Term Release (LTR)**
- [ ] Telepítés az alapbeállításokkal (≈1,5 GB hely kell)
- [ ] Bővítmények (Modulok → Modulok kezelése és telepítése), egyelőre csak ez az egy:
  - [ ] **QuickMapServices**

## 5. GitHub-repó (5 perc)

- [x] https://github.com/new
- [x] Repository name: `hargita-terkep`
- [x] **Public** (a GitHub Pages ingyenesen csak nyilvános repóval működik; a nyers adatok úgysem kerülnek bele)
- [x] Add a README: **NE** pipáld be (a mi README-nket töltjük fel)
- [x] **Create repository** → szólj Claude-nak, és a repó feltöltését ő intézi.

## 6. (Ajánlott) Claude memória

- [ ] Claude → Beállítások → **Memória** bekapcsolása, hogy a projektről a jövőben is tudjon.

---

**Ha mind megvan:** írd meg Claude-nak az Earth Engine-projektazonosítót, és indulhat a [[T01 Felhomentes mozaik]].

## 7. GitHub Desktop (kész)

- [x] Telepítve, bejelentkezve
- [x] Klónozva ide: `C:\Users\Zsolt\hargita-terkep` (a Dokumentumok mappába a Windows vezérelt mappahozzáférése nem engedte)

**Munkamenet eleje:** Fetch origin → Pull origin (lejönnek Claude változtatásai)
**Ha te írtál/pipáltál:** Summary kitöltése → Commit to main → Push origin
