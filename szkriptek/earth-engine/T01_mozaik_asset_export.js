// =====================================================================
// Hargita megye – T01: a „legjobb pixel" mozaik egyszeri kiszámolása
// és mentése assetként, hogy az app ne élőben számoljon (gyorsabb).
// Futtatás után: Tasks fül → RUN. Kész után: az asset megosztása
// (Assets → T01_s2_2025_nyar_10m → SHARE → Anyone can read).
// Projekt: tidal-velocity-494919-e2 · Mentés: users/szaszfzsolt/T01_proba/mozaik_export
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();
var keret = terulet.bounds().buffer(1000);

var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(terulet)
  .filterDate('2025-07-01', '2025-08-20')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));

var mozaik = col
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function (k) { return k.updateMask(k.select('cs_cdf').gte(0.65)); })
  .qualityMosaic('cs_cdf')
  .select(['B2', 'B3', 'B4', 'B8', 'B11'])
  .toUint16()
  .set({
    'leiras': 'Sentinel-2 SR legjobb pixel mozaik, Cloud Score+ >= 0.65',
    'idoszak': '2025-07-01 / 2025-08-20',
    'felvetelek_szama': col.size()
  });

print('Felhasznált felvételek:', col.size());
Map.centerObject(megye, 9);
Map.addLayer(mozaik.clip(terulet), {bands: ['B4', 'B3', 'B2'], min: 0, max: 1500, gamma: 1.3},
  'Mentendő mozaik (előnézet)');

Export.image.toAsset({
  image: mozaik,
  description: 'T01_s2_2025_nyar_10m_asset',
  assetId: PROJEKT + 'T01_s2_2025_nyar_10m',
  region: keret,
  scale: 10,
  crs: 'EPSG:32635',
  maxPixels: 1e10
});
