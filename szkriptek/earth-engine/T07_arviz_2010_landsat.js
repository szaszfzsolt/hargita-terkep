// T07 – Árvíz 2010. június (Csík, Gyimes): az árvíz utáni nyomok Landsat 5/7 képről, 30 m
// Mentés új szkriptként: NEW → File → név: T07_arviz_2010_landsat
//
// Adatok: Landsat 5 (TM) 2010-07-02 és Landsat 7 (ETM+) 2010-07-03 – 3–7 nappal az árvíz (jún. 25–29.) után.
// Az árvíz előtti tiszta kép nincs (jún. 18: 79%, jún. 24: 87% felhő), ezért a „száraz" viszonyítás az
// árvíz utáni nyár (júl. 16 – szept. 30) felhőmaszkolt mediánja.
// Módszer: MNDWI = (zöld − SWIR1) / (zöld + SWIR1); > 0 = víz vagy nagyon nedves felszín.
// Jelölt = júl. 2–3-án nedves/víz, de a száraz nyári viszonyításban nem; csak a vízfolyás közelében
// (HAND < 10 m), lapos területen, az állandó vizek nélkül.
// FIGYELEM: ez az árvíz UTÁNI állapot (a víz nagyrésze addigra levonult), 30 m-es felbontásban,
// Landsat 7-nél csíkos hézagokkal. Nem az elöntés teljes kiterjedése.

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

var UTANA_KEZD = '2010-07-02', UTANA_VEG = '2010-07-04';          // júl. 2–3.
var SZARAZ_KEZD = '2010-07-16', SZARAZ_VEG = '2010-09-30';        // száraz viszonyítás
var MNDWI_VIZ = 0.0;           // ennél nagyobb: víz / nagyon nedves
var MNDWI_SZARAZ = -0.1;       // a viszonyításban ennél kisebb: száraz
var MAX_LEJTO = 5, MAX_HAND = 10, MIN_FOLT = 5;

function tisztit(k) {          // felhő, árnyék, hó, kitöltés (SLC-hézag) maszkolása; reflexió 0–1
  var tiszta = k.select('QA_PIXEL').bitwiseAnd(59).eq(0);          // bitek: 0 kitöltés, 1, 3 felhő, 4 árnyék, 5 hó
  return k.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B5'], ['kek', 'zold', 'voros', 'swir1'])
    .multiply(0.0000275).add(-0.2).updateMask(tiszta);
}
function gyujt(kezd, veg) {
  return ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').filterBounds(terulet).filterDate(kezd, veg)
    .merge(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterBounds(terulet).filterDate(kezd, veg))
    .map(tisztit);
}
function mndwi(k) { return k.normalizedDifference(['zold', 'swir1']).rename('mndwi'); }

var utana = gyujt(UTANA_KEZD, UTANA_VEG).mosaic().reproject({crs: 'EPSG:32635', scale: 30});
var szaraz = gyujt(SZARAZ_KEZD, SZARAZ_VEG).median().reproject({crs: 'EPSG:32635', scale: 30});
var mUtana = mndwi(utana), mSzaraz = mndwi(szaraz);

var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic()
  .setDefaultProjection('EPSG:4326', null, 30);
var lejto = ee.Terrain.slope(dem);
var hand = ee.Image('MERIT/Hydro/v1_0_1').select('hnd');
var allandoViz = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').gt(20).unmask(0);

var jelolt = mUtana.gt(MNDWI_VIZ).and(mSzaraz.lt(MNDWI_SZARAZ))
  .and(lejto.lt(MAX_LEJTO)).and(hand.lt(MAX_HAND)).and(allandoViz.not());
var foltok = jelolt.selfMask().connectedPixelCount(50, true);
var nyomok = jelolt.updateMask(foltok.gte(MIN_FOLT)).selfMask();

Map.setCenter(25.80, 46.36, 11);   // Csíkszereda; a keresőbe írd: Csíkszentmihály, Madéfalva, Gyimesközéplok
Map.setOptions('SATELLITE');
var szin = {bands: ['voros', 'zold', 'kek'], min: 0.02, max: 0.25};
Map.addLayer(utana.clip(terulet), szin, 'Landsat 2010-07-02/03 (valódi szín)', false);
Map.addLayer(szaraz.clip(terulet), szin, 'Száraz viszonyítás (júl. 16 – szept.)', false);
Map.addLayer(mUtana.clip(terulet), {min: -0.5, max: 0.5, palette: ['8c510a', 'f6e8c3', 'ffffff', 'c7eae5', '01665e']},
  'MNDWI 2010-07-02/03 (kék-zöld = nedves/víz)', false);
Map.addLayer(ee.Image().paint(megye, 0, 2), {palette: 'ffd400'}, 'Megyehatár');
Map.addLayer(nyomok.clip(terulet), {palette: '00e5ff'}, 'Jelölt árvíz utáni nyom (nedves júl. 2–3-án, később száraz)');

print('Jelölt terület a megyében (km²):', ee.Image.pixelArea().divide(1e6).updateMask(nyomok).reduceRegion({
  reducer: ee.Reducer.sum(), geometry: terulet, scale: 60, maxPixels: 1e10, bestEffort: true}));
