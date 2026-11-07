// T03 – MODIS éjszakai felszínhőmérséklet-átlag (téli és nyári éjszakák), egész Hargita megye, 1 km
// Mentés új szkriptként: NEW → File → név: T03_modis_export
//
// Mit csinál: a MODIS Terra (MOD11A1, ~22:30) és Aqua (MYD11A1, ~01:30) éjszakai
// felszínhőmérsékletéből átlagot számol a derült éjszakákra:
//   tél:  2014. dec. – 2025. febr. (decembertől februárig)
//   nyár: 2015. jún. – 2025. aug.  (júniustól augusztusig)
// Az eredmény két asset (°C): sáv 't' = átlag, sáv 'n' = a felhasznált éjszakák száma.
// Az éjszakai adat azért jó az inverzióhoz, mert hajnal felé a medence hideglevegő-tava a
// legmélyebb, és nincs napsugárzás, ami elfedné. A felbontás durva (1 km), de MINDEN
// medencét egyszerre mutat, felhős napok hiánya nélkül (sok éjszaka átlaga).
//
// Futtatás után: Tasks fül → mindkét feladat Run. Utána az assetet ÉS KÉZZEL meg kell osztani
// (Assets → asset → SHARE → Anyone can read), lásd U02 útmutató.

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();
var MIN_ET = 100;   // legalább ennyi derült éjszaka kell egy képponthoz

// kezd/veg: időszak; hónapok: pl. [[12, 12], [1, 2]] (naptári hónaptartományok, évváltás miatt több rész lehet)
function gyujt(kezd, veg, honapok, minosegBitek) {
  var mind = null;
  honapok.forEach(function (h) {
    ['MODIS/061/MOD11A1', 'MODIS/061/MYD11A1'].forEach(function (az) {
      var gy = ee.ImageCollection(az).filterDate(kezd, veg)
        .filter(ee.Filter.calendarRange(h[0], h[1], 'month')).filterBounds(terulet)
        .map(function (k) {
          // LST_Night_1km: a 0 érték = nincs adat (felhő), ezt kihagyjuk; QC bitek: minosegBitek szerint
          var lst = k.select('LST_Night_1km');
          var jo = lst.gt(0);
          if (minosegBitek) { jo = jo.and(k.select('QC_Night').bitwiseAnd(3).lte(1)); }   // 0 és 1 is jó (1 = más minőség, de van érték)
          return lst.multiply(0.02).subtract(273.15).updateMask(jo).rename('t');
        });
      mind = mind ? mind.merge(gy) : gy;
    });
  });
  return mind;
}
function atlag(mind) {   // kimenet: sávok t (átlag) és n (éjszakák száma), maszkolás nélkül
  return mind.mean().addBands(mind.count().rename('n')).float();
}

var telGy = gyujt('2014-12-01', '2025-03-01', [[12, 12], [1, 2]], true);
var nyarGy = gyujt('2015-06-01', '2025-09-01', [[6, 8]], true);
var telNyers = atlag(telGy), nyarNyers = atlag(nyarGy);

// Ellenőrzés: hány kép és hány derült éjszaka jut egy képpontra (maszkolás ELŐTT)
print('Téli képek száma:', telGy.size());
print('Nyári képek száma:', nyarGy.size());
var stat = ee.Reducer.mean().combine(ee.Reducer.max(), '', true);
print('Téli éjszakák/képpont:', telNyers.select('n').reduceRegion({reducer: stat, geometry: terulet, scale: 1000, maxPixels: 1e9}));
print('Nyári éjszakák/képpont:', nyarNyers.select('n').reduceRegion({reducer: stat, geometry: terulet, scale: 1000, maxPixels: 1e9}));

var tel = telNyers.updateMask(telNyers.select('n').gte(MIN_ET)).clip(terulet);
var nyar = nyarNyers.updateMask(nyarNyers.select('n').gte(MIN_ET)).clip(terulet);

Map.centerObject(terulet, 9);
Map.addLayer(tel.select('t'), {min: -14, max: 0, palette: ['08306b', '6baed6', 'ffffff', 'fed976']}, 'Téli éjszakák átlaga (°C)');
Map.addLayer(nyar.select('t'), {min: 0, max: 25, palette: ['08306b', '6baed6', 'ffffb2', 'fd8d3c', '800026']}, 'Nyári éjszakák átlaga (°C)', false);

Export.image.toAsset({image: tel, description: 'T03_modis_tel_ej', assetId: PROJEKT + 'T03_modis_tel_ej',
  region: terulet, scale: 1000, crs: 'EPSG:3844', maxPixels: 1e9});
Export.image.toAsset({image: nyar, description: 'T03_modis_nyar_ej', assetId: PROJEKT + 'T03_modis_nyar_ej',
  region: terulet, scale: 1000, crs: 'EPSG:3844', maxPixels: 1e9});
