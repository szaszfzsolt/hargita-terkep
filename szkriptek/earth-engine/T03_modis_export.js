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

function ejszaka(kezdet, veg, honapok) {
  function gyujtemeny(az) {
    return ee.ImageCollection(az)
      .filterDate(kezdet, veg)
      .filter(ee.Filter.calendarRange(honapok[0], honapok[1], 'month'))
      .filterBounds(terulet)
      .map(function (k) {
        var jo = k.select('QC_Night').bitwiseAnd(3).eq(0);   // 0 = jó minőségű LST
        var t = k.select('LST_Night_1km').multiply(0.02).subtract(273.15).updateMask(jo);
        return t.rename('t');
      });
  }
  var mind = gyujtemeny('MODIS/061/MOD11A1').merge(gyujtemeny('MODIS/061/MYD11A1'));
  var atlag = mind.mean();
  var db = mind.count().rename('n');
  return atlag.addBands(db).updateMask(db.gte(MIN_ET)).float().clip(terulet);
}

// A decembertől februárig tartó időszakot két naptári tartomány adja: dec (12) és jan–feb (1–2).
// A calendarRange(12, 2) nem fordul át az éven, ezért külön számoljuk:
function telKetResz() {
  function resz(a, b) {
    var kezd = '2014-12-01', veg = '2025-03-01';
    function gy(az) {
      return ee.ImageCollection(az).filterDate(kezd, veg)
        .filter(ee.Filter.calendarRange(a, b, 'month')).filterBounds(terulet)
        .map(function (k) {
          var jo = k.select('QC_Night').bitwiseAnd(3).eq(0);
          return k.select('LST_Night_1km').multiply(0.02).subtract(273.15).updateMask(jo).rename('t');
        });
    }
    return gy('MODIS/061/MOD11A1').merge(gy('MODIS/061/MYD11A1'));
  }
  var mind = resz(12, 12).merge(resz(1, 2));
  var db = mind.count().rename('n');
  return mind.mean().addBands(db).updateMask(db.gte(MIN_ET)).float().clip(terulet);
}
var tel = telKetResz();
var nyar = ejszaka('2015-06-01', '2025-09-01', [6, 8]);

Map.centerObject(terulet, 9);
Map.addLayer(tel.select('t'), {min: -14, max: 0, palette: ['08306b', '6baed6', 'ffffff', 'fed976']}, 'Téli éjszakák átlaga (°C)');
Map.addLayer(nyar.select('t'), {min: 0, max: 25, palette: ['08306b', '6baed6', 'ffffb2', 'fd8d3c', '800026']}, 'Nyári éjszakák átlaga (°C)', false);
print('Téli minta (átlagos éjszakaszám a megyében):', tel.select('n').reduceRegion({reducer: ee.Reducer.mean(), geometry: terulet, scale: 1000, maxPixels: 1e9}));
print('Nyári minta:', nyar.select('n').reduceRegion({reducer: ee.Reducer.mean(), geometry: terulet, scale: 1000, maxPixels: 1e9}));

Export.image.toAsset({image: tel, description: 'T03_modis_tel_ej', assetId: PROJEKT + 'T03_modis_tel_ej',
  region: terulet, scale: 1000, crs: 'EPSG:3844', maxPixels: 1e9});
Export.image.toAsset({image: nyar, description: 'T03_modis_nyar_ej', assetId: PROJEKT + 'T03_modis_nyar_ej',
  region: terulet, scale: 1000, crs: 'EPSG:3844', maxPixels: 1e9});
