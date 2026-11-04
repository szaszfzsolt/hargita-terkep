// =====================================================================
// Hargita megye – T01 alaptérkép, v2
// - Sentinel-2 nyári mozaik Cloud Score+ felhőszűréssel (nincs több lyuk)
// - Domborzatárnyékolás (Copernicus DEM GLO-30)
// - Export Google Drive-ra (HargitaTerkep mappa), webes megjelenítéshez
// Projekt: tidal-velocity-494919-e2 · Mentés: users/szaszfzsolt/T01_proba
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var kozsegek = ee.FeatureCollection(PROJEKT + 'hargita_kozsegek_shp');
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();
// Export UTM 35N vetületben (EPSG:32635): itt a 10 m valóban 10 m a terepen.
// Exporthoz kicsit nagyobb keret, hogy a határ menti pixelek ne vágódjanak le
var keret = terulet.bounds().buffer(1000);

// ---------------------------------------------------------------------
// 1. Sentinel-2 mozaik, Cloud Score+ felhőszűréssel
// ---------------------------------------------------------------------
var EV = 2025;
var TISZTA_KUSZOB = 0.60;   // 0–1; nagyobb = szigorúbb (kevesebb felhő, több lyuk)

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(terulet)
  .filterDate(EV + '-06-01', EV + '-09-15');
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

var mozaik = s2
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function (kep) {
    return kep.updateMask(kep.select('cs_cdf').gte(TISZTA_KUSZOB));
  })
  .select(['B2', 'B3', 'B4', 'B8', 'B11'])
  .median();

print('Felhasznált Sentinel-2 felvételek száma:', s2.size());

// Valós színes kép (8 bites RGB) – ez megy a webre
var VALOS = {bands: ['B4', 'B3', 'B2'], min: 0, max: 1500, gamma: 1.3};
var valosSzines = mozaik.visualize(VALOS);

// ---------------------------------------------------------------------
// 2. Domborzat és domborzatárnyékolás
// ---------------------------------------------------------------------
var demCol = ee.ImageCollection('COPERNICUS/DEM/GLO30').filterBounds(keret);
var dem = demCol.select('DEM').mosaic()
  .setDefaultProjection(demCol.first().select('DEM').projection());
var arnyekolas = ee.Terrain.hillshade(dem, 315, 35);   // ÉNy-i megvilágítás

// Színezett domborzat + árnyékolás egyben (szép alaptérkép)
var MAGASSAG = {min: 350, max: 1800,
  palette: ['5a8f3c', 'a8c66c', 'e8dfa1', 'c9a26b', '9c6b4a', 'f2f2f2']};
var domborzatSzines = dem.visualize(MAGASSAG)
  .multiply(arnyekolas.divide(255).multiply(0.6).add(0.4))
  .uint8();

// ---------------------------------------------------------------------
// 3. Megjelenítés a kódszerkesztőben
// ---------------------------------------------------------------------
Map.centerObject(megye, 9);
Map.addLayer(domborzatSzines.clip(terulet), {}, 'Domborzat (színezett, árnyékolt)', false);
Map.addLayer(arnyekolas.clip(terulet), {min: 0, max: 255}, 'Domborzatárnyékolás', false);
Map.addLayer(valosSzines.clip(terulet), {}, 'Sentinel-2, ' + EV + ' nyár');
Map.addLayer(ee.Image().paint(kozsegek, 0, 1), {palette: 'white'}, 'Községhatárok');
Map.addLayer(ee.Image().paint(megye, 0, 2.5), {palette: 'yellow'}, 'Megyehatár');

// ---------------------------------------------------------------------
// 4. Export Google Drive-ra – a Tasks fülön kell elindítani (RUN gomb)
// ---------------------------------------------------------------------
Export.image.toDrive({
  image: valosSzines.clip(keret),
  description: 'T01_sentinel2_' + EV + '_nyar_10m',
  folder: 'HargitaTerkep',
  region: keret,
  scale: 10,
  crs: 'EPSG:32635',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

Export.image.toDrive({
  image: domborzatSzines.clip(keret),
  description: 'T01_domborzat_szines_30m',
  folder: 'HargitaTerkep',
  region: keret,
  scale: 30,
  crs: 'EPSG:32635',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});

Export.image.toDrive({
  image: dem.clip(keret).toInt16(),
  description: 'T01_dem_magassag_30m',
  folder: 'HargitaTerkep',
  region: keret,
  scale: 30,
  crs: 'EPSG:32635',
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF',
  formatOptions: {cloudOptimized: true}
});
