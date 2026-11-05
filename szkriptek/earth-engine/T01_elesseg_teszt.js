// =====================================================================
// Hargita megye – T01 élességteszt: melyik mozaik a legélesebb?
// Két összekapcsolt térkép, mindkettőn választható változat.
// Projekt: tidal-velocity-494919-e2 · Mentés: users/szaszfzsolt/T01_proba/elesseg_teszt
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var kozsegek = ee.FeatureCollection(PROJEKT + 'hargita_kozsegek_shp');
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(terulet);
var CS = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var SAVOK = ['B2', 'B3', 'B4'];

// Cloud Score+ maszk adott küszöbbel (a cs_cdf sávot is megtartja)
function csMaszk(kuszob) {
  return function (k) { return k.updateMask(k.select('cs_cdf').gte(kuszob)); };
}
// A próba szkript SCL-alapú maszkja
function sclMaszk(k) {
  var scl = k.select('SCL');
  return k.updateMask(scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)));
}

// --- A) A próba (ez tűnt élesnek) ---
var colA = S2.filterDate('2025-06-01', '2025-08-31')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));
var A = colA.map(sclMaszk).select(SAVOK).median();

// --- B) Az app mostani változata (elmosódottabb) ---
var colB = S2.filterDate('2025-06-01', '2025-09-15');
var B = colB.linkCollection(CS, ['cs_cdf']).map(csMaszk(0.60)).select(SAVOK).median();

// --- C) Szűk nyári ablak, előszűrés + szigorúbb küszöb ---
var colC = S2.filterDate('2025-07-01', '2025-08-20')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30));
var C = colC.linkCollection(CS, ['cs_cdf']).map(csMaszk(0.65)).select(SAVOK).median();

// --- D) Csak a legtisztább napok; a hézagokat C tölti ki ---
var colD = S2.filterDate('2025-06-01', '2025-09-15')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5));
var Dtiszta = colD.linkCollection(CS, ['cs_cdf']).map(csMaszk(0.65)).select(SAVOK).median();
var D = ee.ImageCollection([C, Dtiszta]).mosaic();   // a lista vége kerül felülre

// --- E) „Legjobb pixel": minden pixelnél a legtisztább felvétel (nem átlagol) ---
var E = colC.linkCollection(CS, ['cs_cdf']).map(csMaszk(0.65))
  .qualityMosaic('cs_cdf').select(SAVOK);

print('Felvételek száma – A:', colA.size(), 'B:', colB.size(),
      'C/E:', colC.size(), 'D (legtisztább):', colD.size());

var VIS = {bands: ['B4', 'B3', 'B2'], min: 0, max: 1500, gamma: 1.3};
var VALTOZATOK = {
  'A – próba (jún–aug, <20% felhő)': A,
  'B – app most (286 kép, jún–szept)': B,
  'C – szűk ablak (júl 1 – aug 20)': C,
  'D – legtisztább napok + C': D,
  'E – legjobb pixel (nem átlagol)': E
};
var NEVEK = Object.keys(VALTOZATOK);

// ---------------------------------------------------------------------
// Két összekapcsolt térkép
// ---------------------------------------------------------------------
function terkepValasztoval(kezdo, hely) {
  var t = ui.Map();
  t.setOptions('HYBRID');
  t.setControlVisibility({layerList: false, drawingToolsControl: false, mapTypeControl: false});
  function rajzol(nev) {
    t.layers().reset();
    t.addLayer(VALTOZATOK[nev].clip(terulet), VIS, nev);
    t.addLayer(ee.Image().paint(kozsegek, 0, 1), {palette: 'ffffff'}, 'Határok', true, 0.6);
  }
  var valaszto = ui.Select({items: NEVEK, value: kezdo, onChange: rajzol,
    style: {position: hely, fontWeight: 'bold'}});
  t.add(valaszto);
  rajzol(kezdo);
  return t;
}

var bal = terkepValasztoval(NEVEK[0], 'top-left');
var jobb = terkepValasztoval(NEVEK[1], 'top-right');
ui.Map.Linker([bal, jobb]);

ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel: bal, secondPanel: jobb, orientation: 'horizontal', wipe: true}));

// Kezdőnézet: Bögöz, közelről (itt látszik legjobban az élesség)
var bogoz = kozsegek.filter(ee.Filter.eq('nev_hu', 'Bögöz'));
bal.centerObject(bogoz, 14);
