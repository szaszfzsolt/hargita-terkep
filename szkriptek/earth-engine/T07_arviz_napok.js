// T07 – Árvíz: milyen műholdfelvételek vannak az árvíz napjaira? (napkereső)
// Mentés új szkriptként: NEW → File → név: T07_arviz_napok
//
// Mit csinál: egy kiválasztott esemény időablakára kiírja, hogy
//  1) a Sentinel-1 radar (10 m, felhőn át is lát) mely napokon készített felvételt Hargita megyéről,
//     a megye hány százalékát fedte le, és melyik pályán/irányban (a hasonlításhoz azonos pálya kell);
//  2) a Sentinel-2 (10 m, optikai) mely napokon járt el, és mennyi volt a felhő.
// Az eredményből választjuk ki: az árvíz alatti/utáni napot és egy száraz „előtte" napot ugyanarról a pályáról.
//
// Használat: az ESEMENY változóban válassz eseményt, futtasd (Run), a Console-ban nyisd ki a listákat.

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

var ESEMENY = '2018';   // '2018' (jún.–júl.) vagy '2025' (máj.–jún.)
var ESEMENYEK = {
  '2025': {kezd: '2025-05-10', veg: '2025-06-15'},   // Praid, Csíkszereda, Székelyudvarhely, Kovászna megye
  '2018': {kezd: '2018-06-15', veg: '2018-07-15'}    // Székelyföld, 2018. június vége
};
var ABLAK = ESEMENYEK[ESEMENY];

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filterBounds(terulet).filterDate(ABLAK.kezd, ABLAK.veg);

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(terulet).filterDate(ABLAK.kezd, ABLAK.veg);

function napok(gyujt) {
  return gyujt.aggregate_array('system:time_start')
    .map(function (t) { return ee.Date(t).format('YYYY-MM-dd'); }).distinct().sort();
}

function s1Napok() {
  return ee.FeatureCollection(napok(s1).map(function (nap) {
    var d = ee.Date(ee.String(nap));
    var kepek = s1.filterDate(d, d.advance(1, 'day'));
    var lefed = kepek.geometry().dissolve(100).intersection(terulet, 100).area(100)
      .divide(terulet.area(100)).multiply(100).round();
    var elso = ee.Image(kepek.first());
    return ee.Feature(null, {nap: nap, lefedettseg_szazalek: lefed,
      irany: elso.get('orbitProperties_pass'), palya: elso.get('relativeOrbitNumber_start'),
      kepek_szama: kepek.size()});
  }));
}

function s2Napok() {
  return ee.FeatureCollection(napok(s2).map(function (nap) {
    var d = ee.Date(ee.String(nap));
    var kepek = s2.filterDate(d, d.advance(1, 'day'));
    var lefed = kepek.geometry().dissolve(100).intersection(terulet, 100).area(100)
      .divide(terulet.area(100)).multiply(100).round();
    return ee.Feature(null, {nap: nap, lefedettseg_szazalek: lefed,
      felho_szazalek_atlag: ee.Number(kepek.aggregate_mean('CLOUDY_PIXEL_PERCENTAGE')).round(),
      csempek_szama: kepek.size()});
  }));
}

// Rövid, soronkénti kiírás (egy lista, könnyű képernyőképet készíteni róla)
var s1Sorok = s1Napok().sort('nap').map(function (f) {
  return f.set('sor', ee.String(f.get('nap')).cat(' | ').cat(ee.String(f.get('irany')).slice(0, 4))
    .cat(' | pálya ').cat(ee.Number(f.get('palya')).int().format('%d'))
    .cat(' | lefedés ').cat(ee.Number(f.get('lefedettseg_szazalek')).int().format('%d')).cat('%'));
}).aggregate_array('sor');
var s2Sorok = s2Napok().sort('nap').map(function (f) {
  return f.set('sor', ee.String(f.get('nap')).cat(' | lefedés ')
    .cat(ee.Number(f.get('lefedettseg_szazalek')).int().format('%d')).cat('% | felhő ')
    .cat(ee.Number(f.get('felho_szazalek_atlag')).int().format('%d')).cat('%'));
}).aggregate_array('sor');

print('Esemény ablaka:', ABLAK.kezd + ' – ' + ABLAK.veg);
print('1) Sentinel-1 radar napok (nap | DESC=reggel, ASC=este | pálya | a megye hány %-át fedi):', s1Sorok);
print('2) Sentinel-2 optikai napok (nap | lefedés | felhő):', s2Sorok);
Map.centerObject(terulet, 9);
Map.addLayer(ee.Image().paint(megye, 0, 2), {palette: 'ffd400'}, 'Megye');
