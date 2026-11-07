// T07 – Árvíz: elöntéstérkép Sentinel-1 radarból (előtte–utána), 10 m
// Mentés új szkriptként: NEW → File → név: T07_arviz_terkep_v1
//
// Elv: a sima víz a radar számára „sötét" (kevés visszaszórás). Ha egy képpont az árvíz előtt még
// nem volt sötét, utána viszont igen, ott valószínűleg víz áll. Az előtte és utána kép UGYANARRÓL
// a pályáról és irányból készült (különben a nézőszög eltérése hamis különbséget ad).
// Kizárjuk: az állandó vizeket (JRC), a meredek lejtőket (>5°, itt nem áll meg a víz), az apró zajfoltokat.
//
// Első teszt: lépj közel (nagyítás 11–13), a megye egész területén lassú lenne. Az eredmény JELÖLT elöntés,
// nem végleges: erdő, hó és szél hamis jelet adhat.

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

// --- Beállítások (a napkereső szkript alapján) ---
var ELOTTE = '2025-05-23';      // száraz nap az árvíz előtt
var UTANA = '2025-05-29';       // 2 nappal a csúcs (május 26–27) után
var PALYA = 7;                  // relatív pálya (7 = DESCENDING, 131 = ASCENDING)
var IRANY = 'DESCENDING';       // ASCENDING / DESCENDING
// Alternatív pár: ELOTTE '2025-05-25', UTANA '2025-05-31', PALYA 131, IRANY 'ASCENDING'

var KUSZOB_UTANA = -15;         // dB: ennél sötétebb = víz (sima felszín)
var KUSZOB_VALTOZAS = -3;       // dB: legalább ennyit sötétedett
var MAX_LEJTO = 5;              // fok
var MIN_FOLT = 10;              // legalább ennyi összefüggő képpont (10 m-es pixel)

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('orbitProperties_pass', IRANY))
  .filter(ee.Filter.eq('relativeOrbitNumber_start', PALYA))
  .filterBounds(terulet);

function kep(nap) {   // egy nap felvételei összeillesztve, VV (dB), enyhe zajszűréssel
  var d = ee.Date(nap);
  return s1.filterDate(d, d.advance(1, 'day')).select('VV').mosaic()
    .focalMedian(30, 'circle', 'meters')
    .reproject({crs: 'EPSG:32635', scale: 10});
}
var elotte = kep(ELOTTE), utana = kep(UTANA);
var valtozas = utana.subtract(elotte);

var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic()
  .setDefaultProjection('EPSG:4326', null, 30);
var lejto = ee.Terrain.slope(dem);
var allandoViz = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').gt(20).unmask(0);

var jelolt = utana.lt(KUSZOB_UTANA)
  .and(valtozas.lt(KUSZOB_VALTOZAS))
  .and(lejto.lt(MAX_LEJTO))
  .and(allandoViz.not());
var foltok = jelolt.selfMask().connectedPixelCount(100, true);
var elontes = jelolt.updateMask(foltok.gte(MIN_FOLT)).selfMask();

// --- Megjelenítés ---
Map.setCenter(25.80, 46.36, 12);   // Csíkszereda környéke
Map.setOptions('SATELLITE');
var szurke = {min: -25, max: 0, palette: ['000000', 'ffffff']};
Map.addLayer(elotte.clip(terulet), szurke, 'Radar ELŐTTE ' + ELOTTE + ' (VV dB)', false);
Map.addLayer(utana.clip(terulet), szurke, 'Radar UTÁNA ' + UTANA + ' (VV dB)', false);
Map.addLayer(valtozas.clip(terulet), {min: -6, max: 6, palette: ['d7191c', 'ffffff', '2c7bb6']},
  'Változás (utána−előtte, dB; piros = sötétedés)', false);
Map.addLayer(ee.Image().paint(megye, 0, 2), {palette: 'ffd400'}, 'Megyehatár');
Map.addLayer(elontes.clip(terulet), {palette: '00e5ff'}, 'Jelölt elöntés (új víz)');

// A jelölt elöntés összes területe a megyében (km²), 20 m-es mintavétellel
print('Pár:', ELOTTE + ' → ' + UTANA + ' (pálya ' + PALYA + ', ' + IRANY + ')');
print('Jelölt elöntött terület a megyében (km²):',
  ee.Image.pixelArea().divide(1e6).updateMask(elontes).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: terulet, scale: 20, maxPixels: 1e10, bestEffort: true}));
