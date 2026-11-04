// =====================================================================
// Hargita megye – T01 próba: 2025 nyári Sentinel-2 mozaik pontos határokkal
// Projekt: tidal-velocity-494919-e2
// Határok: geoBoundaries ROU ADM2 (geo-spatial.org / ANCPI alapú), saját feltöltés
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var kozsegek = ee.FeatureCollection(PROJEKT + 'hargita_kozsegek_shp');
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
print('Települések száma (67 kell legyen):', kozsegek.size());

// --- Sentinel-2 nyári medián, egyszerű felhőmaszkkal (SCL sáv) ---
function felhoMaszk(kep) {
  var scl = kep.select('SCL');
  // 3 = felhőárnyék, 8–9 = felhő, 10 = vékony fátyolfelhő, 11 = hó
  var tiszta = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));
  return kep.updateMask(tiszta);
}

var kep = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(megye)
  .filterDate('2025-06-01', '2025-08-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
  .map(felhoMaszk)
  .median()
  .clip(megye);

// --- Megjelenítés ---
Map.centerObject(megye, 9);
Map.addLayer(kep, {bands: ['B4', 'B3', 'B2'], min: 0, max: 1500, gamma: 1.3},
  'Sentinel-2, 2025 nyár');
Map.addLayer(ee.Image().paint(kozsegek, 0, 1), {palette: 'white'}, 'Községhatárok');
Map.addLayer(ee.Image().paint(megye, 0, 2.5), {palette: 'yellow'}, 'Megyehatár');

// --- Egy község kiemelése (írd át a nevet bármelyikre) ---
var valasztott = kozsegek.filter(ee.Filter.eq('nev_hu', 'Bögöz'));
Map.addLayer(ee.Image().paint(valasztott, 0, 3), {palette: 'orange'}, 'Bögöz');
print('Kiválasztott község:', valasztott);
