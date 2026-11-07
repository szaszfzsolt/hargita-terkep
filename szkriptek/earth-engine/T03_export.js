// =====================================================================
// Hargita megye – T03 Hőmérsékleti inverzió
// 3. lépés: a kiválasztott napok felszínhőmérséklet-képeinek exportja assetként
// Minden napból egy kép: 'st' sáv = felszínhőmérséklet °C-ban (Landsat ST_B10),
// a felhős / felhőárnyékos pixelek maszkolva. Két szomszédos Landsat-sáv képét
// az azonos napon egy mozaikká egyesíti. 30 m, a megye határára vágva.
// Futtatás: Run, majd a jobb oldali Tasks fülön minden feladatnál a RUN gomb.
// Az elkészült assetet nyilvánossá kell tenni (Anyone can read)!
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

// téli napok (derült, havas) és nyári napok (derült, forró)
var NAPOK = ['2014-02-03', '2017-01-10', '2017-02-11', '2021-01-21', '2026-01-19',
             '2025-07-03', '2026-08-23'];

var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(terulet);

function stKep(nap) {
  var d = ee.Date(nap);
  var kepek = landsat.filterDate(d, d.advance(1, 'day')).map(function (k) {
    var derult = k.select('QA_PIXEL').bitwiseAnd(0x1E).eq(0);   // nem felhő/árnyék/cirrus
    return k.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
      .updateMask(derult).rename('st');
  });
  return kepek.mosaic().clip(terulet).toFloat().set({nap: nap});
}

NAPOK.forEach(function (nap) {
  var kep = stKep(nap);
  var nev = 'T03_st_' + nap.replace(/-/g, '');
  print(nap + ' – felvételek száma:', landsat.filterDate(ee.Date(nap), ee.Date(nap).advance(1, 'day')).size());
  Map.addLayer(kep, {min: -25, max: 40, palette: ['08306b', '2979ff', '00e5ff', 'ffffff', 'ffea00', 'ff9100', 'e6194b']}, nev, false);
  Export.image.toAsset({
    image: kep, description: nev, assetId: PROJEKT + nev,
    region: terulet, scale: 30, maxPixels: 1e10
  });
});
Map.centerObject(terulet, 9);
