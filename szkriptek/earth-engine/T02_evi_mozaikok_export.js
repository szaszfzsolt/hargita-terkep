// =====================================================================
// Hargita megye – T02: évenkénti nyári Sentinel-2 mozaikok (2018–2025)
// előre kiszámolva, assetként. 8 export lesz a Tasks fülön: mindegyiknél RUN.
// Kész után: mind a 8 assetet meg kell osztani (SHARE → Anyone can read).
// Projekt: tidal-velocity-494919-e2 · Mentés: users/szaszfzsolt/T01_proba/evi_mozaikok_export
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();
var keret = terulet.bounds().buffer(1000);

var CS = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(terulet);

function evMozaik(ev) {
  var col = S2.filterDate(ev + '-06-15', ev + '-09-15')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40));
  return col
    .linkCollection(CS, ['cs_cdf'])
    .map(function (k) { return k.updateMask(k.select('cs_cdf').gte(0.65)); })
    .qualityMosaic('cs_cdf')
    .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
    .toUint16()
    .set({ev: ev, idoszak: ev + '-06-15 / ' + ev + '-09-15', felvetelek_szama: col.size()});
}

Map.centerObject(megye, 9);
for (var ev = 2018; ev <= 2025; ev++) {
  var kep = evMozaik(ev);
  Map.addLayer(kep.clip(terulet), {bands: ['B11', 'B8', 'B4'], min: 100, max: 4500},
    String(ev), ev === 2025);
  Export.image.toAsset({
    image: kep,
    description: 'T02_s2_nyar_' + ev,
    assetId: PROJEKT + 'T02_s2_nyar_' + ev,
    region: keret,
    scale: 10,
    crs: 'EPSG:32635',
    maxPixels: 1e10
  });
}
