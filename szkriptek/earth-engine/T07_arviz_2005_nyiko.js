// T07 – Árvíz 2005. augusztus 23., Nyikó-völgy (Udvarhelyszék): előtte–utána, Landsat 5/7, 30 m
// Mentés új szkriptként: NEW → File → név: T07_arviz_2005_nyiko
//
// Bal oldal: 2005-08-22 (az árvíz előtti nap, Landsat 7, 0–6% felhő). Jobb oldal: 2005-09-06/07 (két héttel utána).
// Az árvíz (aug. 23. délután, villámárvíz) órák alatt levonult, ezért magát a vizet nem látjuk, csak a nyomait
// (hordalék, kopár partszakasz, lemosott növényzet), 30 m-es felbontásban. A Landsat 7 2003 óta csíkos (hézagok).
//
// Használat: húzd a függönyt; a jobb felső sarokban váltható a megjelenítés (valódi szín / NDVI / MNDWI).
// A keresőbe írd: Farkaslaka, Székelyszentlélek, Siménfalva, Farcád, Szombatfalva, Hodgya.

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

var ELOTTE = ['2005-08-22', '2005-08-23'];
var UTANA = ['2005-09-06', '2005-09-08'];

function tisztit(k) {
  var tiszta = k.select('QA_PIXEL').bitwiseAnd(59).eq(0);   // kitöltés (SLC-hézag), felhő, árnyék, hó kizárva
  return k.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'], ['kek', 'zold', 'voros', 'nir', 'swir1'])
    .multiply(0.0000275).add(-0.2).updateMask(tiszta);
}
function mozaik(ido) {
  return ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').filterBounds(terulet).filterDate(ido[0], ido[1])
    .merge(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterBounds(terulet).filterDate(ido[0], ido[1]))
    .map(tisztit).mosaic();
}
var elotte = mozaik(ELOTTE), utana = mozaik(UTANA);

var MODOK = {
  'Valódi szín': function (k) { return k.visualize({bands: ['voros', 'zold', 'kek'], min: 0.02, max: 0.25}); },
  'NDVI (növényzet)': function (k) {
    return k.normalizedDifference(['nir', 'voros']).visualize({min: 0, max: 0.9,
      palette: ['8c510a', 'dfc27d', 'f6e8c3', 'c7e9b4', '41ab5d', '006837']}); },
  'MNDWI (nedvesség, kék = nedves)': function (k) {
    return k.normalizedDifference(['zold', 'swir1']).visualize({min: -0.5, max: 0.4,
      palette: ['8c510a', 'f6e8c3', 'ffffff', 'c7eae5', '01665e']}); }
};
var mod = 'Valódi szín';

var bal = ui.Map(), jobb = ui.Map();
[bal, jobb].forEach(function (t) { t.setOptions('SATELLITE'); t.setControlVisibility({layerList: false}); });
ui.Map.Linker([bal, jobb]);
function rajzol() {
  bal.layers().reset(); jobb.layers().reset();
  bal.addLayer(MODOK[mod](elotte), {}, 'Előtte 2005-08-22');
  jobb.addLayer(MODOK[mod](utana), {}, 'Utána 2005-09-06/07');
  [bal, jobb].forEach(function (t) { t.addLayer(ee.Image().paint(megye, 0, 2), {palette: 'ffd400'}, 'Megyehatár'); });
}
var valaszto = ui.Select({items: Object.keys(MODOK), value: mod, onChange: function (v) { mod = v; rajzol(); },
  style: {position: 'top-right'}});
jobb.add(valaszto);
bal.add(ui.Label('ELŐTTE: 2005. augusztus 22. (az árvíz előtti nap)', {position: 'bottom-left', fontWeight: 'bold'}));
jobb.add(ui.Label('UTÁNA: 2005. szeptember 6–7. (két héttel az árvíz után)', {position: 'bottom-right', fontWeight: 'bold'}));
bal.setCenter(25.30, 46.30, 11);    // Székelyudvarhely környéke; a Nyikó felé nagyíts
rajzol();

ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel: bal, secondPanel: jobb, orientation: 'horizontal', wipe: true,
  style: {stretch: 'both'}}));
