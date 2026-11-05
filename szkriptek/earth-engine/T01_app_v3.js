// =====================================================================
// Hargita megye műholdról – interaktív Earth Engine App, v3
// Községválasztó · rétegkapcsolók · kivágás egy községre
// v3: a mozaik előre kiszámolt assetből jön (gyors betöltés)
// v2: élesebb „legjobb pixel" mozaik (élességteszt E változata) + Google légifotó réteg
// Projekt: tidal-velocity-494919-e2 · Mentés: users/szaszfzsolt/T01_proba/app_v1 (felülírva v2-vel)
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var kozsegek = ee.FeatureCollection(PROJEKT + 'hargita_kozsegek_shp');
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

// ---------------------------------------------------------------------
// Rétegek előállítása
// ---------------------------------------------------------------------
// Előre kiszámolt „legjobb pixel" mozaik (T01_mozaik_asset_export.js készíti)
// Sentinel-2 SR, 2025. júl 1 – aug 20, Cloud Score+ >= 0,65, sávok: B2 B3 B4 B8 B11
var mozaik = ee.Image(PROJEKT + 'T01_s2_2025_nyar_10m');

var valosSzines = mozaik.visualize({bands: ['B4', 'B3', 'B2'], min: 0, max: 1500, gamma: 1.3});
// Hamis színes (közeli infra): a növényzet élénkpiros – jól látszik az erdő és a vágás
var hamisSzines = mozaik.visualize({bands: ['B8', 'B4', 'B3'], min: 0, max: 3500, gamma: 1.2});
// NDVI: növényzeti index (-1…1), barna = csupasz, zöld = dús növényzet
var ndvi = mozaik.normalizedDifference(['B8', 'B4']).visualize({
  min: 0, max: 0.9, palette: ['8c510a', 'd8b365', 'f6e8c3', 'c7eae5', '5ab4ac', '01665e', '00441b']});

var demCol = ee.ImageCollection('COPERNICUS/DEM/GLO30').filterBounds(terulet);
var dem = demCol.select('DEM').mosaic()
  .setDefaultProjection(demCol.first().select('DEM').projection());
var arnyek = ee.Terrain.hillshade(dem, 315, 35);
var domborzat = dem.visualize({min: 350, max: 1800,
    palette: ['5a8f3c', 'a8c66c', 'e8dfa1', 'c9a26b', '9c6b4a', 'f2f2f2']})
  .multiply(arnyek.divide(255).multiply(0.6).add(0.4)).uint8();

var RETEGEK = [
  {nev: 'Műholdkép (valós színek, 2025 nyár)', kep: valosSzines},
  {nev: 'Részletes légifotó (Google)', kep: null},
  {nev: 'Hamis színes (infravörös)', kep: hamisSzines},
  {nev: 'Növényzeti index (NDVI)', kep: ndvi},
  {nev: 'Domborzat (színezett, árnyékolt)', kep: domborzat}
];

// ---------------------------------------------------------------------
// Térkép
// ---------------------------------------------------------------------
var terkep = ui.Map();
terkep.setOptions('HYBRID');
terkep.setControlVisibility({layerList: false, drawingToolsControl: false});
terkep.style().set('cursor', 'crosshair');

var aktivReteg = 0;
var aktivKozseg = null;     // ee.Feature vagy null (= egész megye)
var kivagas = false;

function frissit() {
  terkep.layers().reset();
  var maszkTerulet = (kivagas && aktivKozseg) ? aktivKozseg.geometry() : terulet;
  var kep = RETEGEK[aktivReteg].kep;
  if (kep) {
    terkep.addLayer(kep.clip(maszkTerulet), {}, RETEGEK[aktivReteg].nev);
  } else {
    // Google légifotó: a háttér látszik; a kiemelt területen kívül sötétítünk
    var kint = ee.Image(1).paint(ee.FeatureCollection([ee.Feature(maszkTerulet)]), 0).selfMask();
    terkep.addLayer(kint, {palette: '000000'}, 'Kívül eső rész', true, 0.55);
  }
  terkep.addLayer(ee.Image().paint(kozsegek, 0, 1), {palette: 'ffffff'}, 'Községhatárok', hatarKapcsolo.getValue(), 0.7);
  terkep.addLayer(ee.Image().paint(megye, 0, 2.5), {palette: 'ffd400'}, 'Megyehatár');
  if (aktivKozseg) {
    terkep.addLayer(ee.Image().paint(ee.FeatureCollection([aktivKozseg]), 0, 3.5), {palette: 'ff6a00'}, 'Kiválasztott');
  }
}

// ---------------------------------------------------------------------
// Oldalpanel
// ---------------------------------------------------------------------
var CIM = {fontSize: '22px', fontWeight: 'bold', margin: '8px 8px 0 8px', color: '1b3a4b'};
var ALCIM = {fontSize: '13px', fontWeight: 'bold', margin: '14px 8px 4px 8px', color: '1b3a4b'};
var SZOVEG = {fontSize: '12px', margin: '2px 8px', color: '444444'};

var panel = ui.Panel({style: {width: '320px', padding: '6px'}});
panel.add(ui.Label('Hargita megye műholdról', CIM));
panel.add(ui.Label('Sentinel-2 felvételek, 2025. júl–aug · Copernicus DEM', SZOVEG));

// Rétegválasztó
panel.add(ui.Label('Mit mutasson a térkép?', ALCIM));
var retegValaszto = ui.Select({
  items: RETEGEK.map(function (r, i) { return {label: r.nev, value: i}; }),
  value: 0,
  style: {stretch: 'horizontal', margin: '0 8px'},
  onChange: function (i) { aktivReteg = i; magyarazat.setValue(MAGYARAZAT[i]); frissit(); }
});
panel.add(retegValaszto);
var MAGYARAZAT = [
  'Így látná a szemünk az űrből (Sentinel-2, 10 m). Sötétzöld: erdő, világoszöld: rét, legelő, barnás foltok: szántó, világos foltok: települések.',
  'A Google Térkép légifotója (kb. 0,5 m): házak, utcák, fák is látszanak. Nem műholdas mérés: dátuma ismeretlen, foltonként más évből lehet, infravörös nincs benne – csak nézegetésre.',
  'A közeli infravörös fényt pirosnak mutatja. Az egészséges növényzet élénkpiros (erdő: sötétvörös), a települések kékesszürkék, a víz fekete. A frissen kivágott erdő éles, világos foltként tűnik elő.',
  'NDVI = (infra − vörös) / (infra + vörös). Minél zöldebb, annál dúsabb a növényzet; a barna csupasz talajt, utat, beépített területet jelent.',
  'Tengerszint feletti magasság: zöld (~350 m, medencék) → barna (~1500 m) → fehér (1800 m felett, Kelemen-havasok, Hargita csúcsai).'
];
var magyarazat = ui.Label(MAGYARAZAT[0], {fontSize: '12px', margin: '6px 8px', color: '555555', whiteSpace: 'pre-wrap'});
panel.add(magyarazat);

var hatarKapcsolo = ui.Checkbox({label: 'Községhatárok', value: true, style: {margin: '4px 8px'},
  onChange: frissit});
panel.add(hatarKapcsolo);

// Községválasztó
panel.add(ui.Label('Község, város', ALCIM));
var kozsegValaszto = ui.Select({placeholder: 'Betöltés…', style: {stretch: 'horizontal', margin: '0 8px'}});
panel.add(kozsegValaszto);
var kivagasKapcsolo = ui.Checkbox({label: 'Csak a kiválasztott település területe', value: false,
  style: {margin: '6px 8px'},
  onChange: function (v) { kivagas = v; frissit(); }});
panel.add(kivagasKapcsolo);
var adatok = ui.Label('', {fontSize: '12px', margin: '4px 8px', color: '1b3a4b', whiteSpace: 'pre-wrap'});
panel.add(adatok);
panel.add(ui.Button({label: '↺ Vissza az egész megyére', style: {margin: '6px 8px'},
  onClick: function () {
    aktivKozseg = null; kivagas = false; kivagasKapcsolo.setValue(false, false);
    kozsegValaszto.setValue(null, false); adatok.setValue('');
    terkep.centerObject(megye, 9); frissit();
  }}));

// A lista feltöltése magyar ábécérendben
kozsegek.aggregate_array('nev_hu').evaluate(function (nevek) {
  nevek.sort(function (a, b) { return a.localeCompare(b, 'hu'); });
  kozsegValaszto.items().reset(nevek);
  kozsegValaszto.setPlaceholder('Válassz települést… (' + nevek.length + ')');
});

function kivalaszt(nev) {
  var f = ee.Feature(kozsegek.filter(ee.Filter.eq('nev_hu', nev)).first());
  aktivKozseg = f;
  terkep.centerObject(f, 12);
  frissit();
  adatok.setValue('Betöltés…');
  f.toDictionary(['nev_hu', 'nev_ro', 'tipus', 'terulet_km']).evaluate(function (d) {
    var magas = dem.reduceRegion({reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true),
      geometry: f.geometry(), scale: 30, maxPixels: 1e9});
    magas.evaluate(function (m) {
      adatok.setValue(
        d.nev_hu + ' (' + d.nev_ro + ') – ' + d.tipus + '\n' +
        'Terület: ' + d.terulet_km + ' km²\n' +
        'Magasság: ' + Math.round(m.DEM_min) + '–' + Math.round(m.DEM_max) +
        ' m, átlag ' + Math.round(m.DEM_mean) + ' m');
    });
  });
}
kozsegValaszto.onChange(function (nev) { if (nev) { kivalaszt(nev); } });

// Kattintásra: melyik település?
terkep.onClick(function (koord) {
  var pont = ee.Geometry.Point([koord.lon, koord.lat]);
  kozsegek.filterBounds(pont).aggregate_array('nev_hu').evaluate(function (n) {
    if (n && n.length) { kozsegValaszto.setValue(n[0]); }   // ez meghívja a kivalaszt-ot
  });
});

panel.add(ui.Label('Tipp: kattints a térképen bármelyik településre!', SZOVEG));
panel.add(ui.Label('Adatok: Copernicus Sentinel-2 (ESA), Copernicus DEM GLO-30, ' +
  'geoBoundaries / geo-spatial.org · Készítette: Szász Ferenc Zsolt',
  {fontSize: '10px', margin: '16px 8px 4px 8px', color: '888888'}));

// ---------------------------------------------------------------------
// Összeállítás
// ---------------------------------------------------------------------
ui.root.clear();
ui.root.add(ui.SplitPanel(panel, terkep));
terkep.centerObject(megye, 9);
frissit();
