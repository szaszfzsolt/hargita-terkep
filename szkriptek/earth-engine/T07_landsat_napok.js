// T07 – Árvíz 2005 / 2010: milyen Landsat-felvételek vannak az árvíz időablakára? (napkereső)
// Mentés új szkriptként: NEW → File → név: T07_landsat_napok
//
// A korai árvizeknél (2005, 2010) nincs Sentinel, csak Landsat 5 (TM) és Landsat 7 (ETM+), 30 m.
// A Landsat 16 naponta jár el ugyanott, ezért kicsi az esély, hogy éppen az árvíz napjára vagy utána
// pár napra tiszta kép esik. Ez a szkript kilistázza a felvételeket a megyére, felhőmennyiséggel.
//
// Használat: az ESEMENY változóban válassz időablakot (vagy írd át a dátumokat), Run, Console.

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

var ESEMENY = '2005';   // '2005' (Nyikó, aug. 23.) vagy '2010' (az ablak átírható)
var ESEMENYEK = {
  '2010': {kezd: '2010-06-01', veg: '2010-07-31'},
  '2005': {kezd: '2005-08-01', veg: '2005-09-15'}   // Nyikó-menti villámárvíz: 2005. aug. 23. délután
};
var ABLAK = ESEMENYEK[ESEMENY];

function gyujt(az, nev) {
  return ee.ImageCollection(az).filterBounds(terulet).filterDate(ABLAK.kezd, ABLAK.veg)
    .map(function (k) { return k.set('muhold', nev); });
}
var mind = gyujt('LANDSAT/LT05/C02/T1_L2', 'L5')
  .merge(gyujt('LANDSAT/LE07/C02/T1_L2', 'L7'))
  .sort('system:time_start');

var sorok = mind.map(function (k) {
  return k.set('sor', ee.Date(k.get('system:time_start')).format('YYYY-MM-dd')
    .cat(' | ').cat(ee.String(k.get('muhold')))
    .cat(' | pálya/sor ').cat(ee.Number(k.get('WRS_PATH')).int().format('%d'))
    .cat('/').cat(ee.Number(k.get('WRS_ROW')).int().format('%d'))
    .cat(' | felhő ').cat(ee.Number(k.get('CLOUD_COVER')).round().int().format('%d')).cat('%'));
}).aggregate_array('sor');

print('Esemény ablaka:', ABLAK.kezd + ' – ' + ABLAK.veg);
print('Landsat 5/7 felvételek a megyére (nap | műhold | pálya/sor | felhő):', sorok);
Map.centerObject(terulet, 9);
Map.addLayer(ee.Image().paint(megye, 0, 2), {palette: 'ffd400'}, 'Megye');
