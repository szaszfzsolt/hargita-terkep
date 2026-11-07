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
// Párok: azonos pálya és irány kell az előtte és utána képhez (a napkereső szkript eredménye)
var PAROK = {
  '2025a': {elotte: '2025-05-23', utana: '2025-05-29', palya: 7, irany: 'DESCENDING'},     // csúcs máj. 26–27 után 2 nappal
  '2025b': {elotte: '2025-05-25', utana: '2025-05-31', palya: 131, irany: 'ASCENDING'},
  '2018a': {elotte: '2018-06-23', utana: '2018-06-29', palya: 7, irany: 'DESCENDING'},     // az eső közben (jún. 28–30.), teljes lefedés
  '2018b': {elotte: '2018-06-25', utana: '2018-07-01', palya: 131, irany: 'ASCENDING'},    // 1–2 nappal a csúcs után
  '2018c': {elotte: '2018-06-18', utana: '2018-06-30', palya: 109, irany: 'DESCENDING'}    // a csúcs napja, de csak a megye 85%-át fedi
};
var PAR = '2018a';              // melyik párt használjuk
var ELOTTE = PAROK[PAR].elotte;
var UTANA = PAROK[PAR].utana;
var PALYA = PAROK[PAR].palya;
var IRANY = PAROK[PAR].irany;

var KUSZOB_UTANA = -15;         // dB: ennél sötétebb = víz (sima felszín) – SZIGORÚ
var KUSZOB_VALTOZAS = -3;       // dB: legalább ennyit sötétedett – SZIGORÚ
var LAZA_UTANA = -13;           // LAZA változat: kisebb küszöbök (több hamis jelet is megenged)
var LAZA_VALTOZAS = -2;
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

function elontesMaszk(kuszobUtana, kuszobValtozas) {
  var jelolt = utana.lt(kuszobUtana)
    .and(valtozas.lt(kuszobValtozas))
    .and(lejto.lt(MAX_LEJTO))
    .and(allandoViz.not());
  var foltok = jelolt.selfMask().connectedPixelCount(100, true);
  return jelolt.updateMask(foltok.gte(MIN_FOLT)).selfMask();
}
var elontes = elontesMaszk(KUSZOB_UTANA, KUSZOB_VALTOZAS);
var elontesLaza = elontesMaszk(LAZA_UTANA, LAZA_VALTOZAS);

// --- Megjelenítés ---
Map.setCenter(25.80, 46.36, 12);   // Csíkszereda környéke
Map.setOptions('SATELLITE');
var szurke = {min: -25, max: 0, palette: ['000000', 'ffffff']};
Map.addLayer(elotte.clip(terulet), szurke, 'Radar ELŐTTE ' + ELOTTE + ' (VV dB)', false);
Map.addLayer(utana.clip(terulet), szurke, 'Radar UTÁNA ' + UTANA + ' (VV dB)', false);
Map.addLayer(valtozas.clip(terulet), {min: -6, max: 6, palette: ['d7191c', 'ffffff', '2c7bb6']},
  'Változás (utána−előtte, dB; piros = sötétedés)', false);
Map.addLayer(ee.Image().paint(megye, 0, 2), {palette: 'ffd400'}, 'Megyehatár');
Map.addLayer(elontesLaza.clip(terulet), {palette: 'ffeb3b'}, 'Jelölt elöntés – LAZA (sárga, bizonytalanabb)');
Map.addLayer(elontes.clip(terulet), {palette: '00e5ff'}, 'Jelölt elöntés – SZIGORÚ (cián)');

// A jelölt elöntés összes területe a megyében (km²), 20 m-es mintavétellel
print('Pár:', ELOTTE + ' → ' + UTANA + ' (pálya ' + PALYA + ', ' + IRANY + ')');
function terulet_km2(maszk) {
  return ee.Image.pixelArea().divide(1e6).updateMask(maszk).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: terulet, scale: 20, maxPixels: 1e10, bestEffort: true});
}
print('Jelölt elöntött terület a megyében, SZIGORÚ (km²):', terulet_km2(elontes));
print('Jelölt elöntött terület a megyében, LAZA (km²):', terulet_km2(elontesLaza));
