// =====================================================================
// Hargita megye – T03 Hőmérsékleti inverzió (Csíki-medence hidegtava)
// 1. lépés: derült, havas téli Landsat-napok keresése
//
// Mit csinál: minden téli (dec–feb) Landsat 8/9 felvételre kiszámolja
//  - a Csíki-medence derült (felhőtlen) területének arányát,
//  - ebből a havas terület arányát,
//  - a medencealj (< 720 m) és a hegyoldal (850–1150 m) átlagos felszínhőmérsékletét,
//  - a kettő különbségét (negatív = a medencealj hidegebb = inverzió).
// A Console-ra kiírja a legjobb napokat (sok derült terület, havas, erős inverzió).
// Használat: másold a Code Editorba, Run. Futás: néhány perc.
// Projekt: tidal-velocity-494919-e2
// =====================================================================

// A Csíki-medence és a környező hegyoldalak (nyugat–kelet: Hargita ↔ Csíki-havasok)
var teruletMedence = ee.Geometry.Rectangle([25.55, 46.15, 26.05, 46.65]);

var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic().setDefaultProjection('EPSG:4326', null, 30);
var alj = dem.lt(720);                                    // medencealj
var oldal = dem.gte(850).and(dem.lt(1150));               // hegyoldal

// Landsat 8 + 9, Collection 2 Level 2, téli hónapok
var tel = ee.Filter.or(
  ee.Filter.calendarRange(12, 12, 'month'),
  ee.Filter.calendarRange(1, 2, 'month'));

var gyujtemeny = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(teruletMedence)
  .filterDate('2013-12-01', '2026-03-01')
  .filter(tel);
print('Téli felvételek száma:', gyujtemeny.size());

function elemez(kep) {
  var qa = kep.select('QA_PIXEL');
  // bitek: 1 kiterjesztett felhő, 2 cirrus, 3 felhő, 4 felhőárnyék, 5 hó/jég
  var derult = qa.bitwiseAnd(0x1E).eq(0);
  var ho = qa.bitwiseAnd(0x20).neq(0);
  var st = kep.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)   // °C
      .updateMask(derult).rename('st');

  var stat = ee.Image.cat([
    derult.rename('derult'),
    ho.and(derult).rename('ho'),
    st.updateMask(alj).rename('st_alj'),
    st.updateMask(oldal).rename('st_oldal')
  ]).reduceRegion({
    reducer: ee.Reducer.mean(), geometry: teruletMedence, scale: 120,
    maxPixels: 1e9, bestEffort: true
  });

  var derultArany = ee.Number(stat.get('derult'));
  var hoArany = ee.Number(stat.get('ho')).divide(derultArany.max(0.0001));
  var kul = ee.Number(stat.get('st_alj')).subtract(ee.Number(stat.get('st_oldal')));
  return ee.Feature(null, {
    datum: ee.Date(kep.get('system:time_start')).format('YYYY-MM-dd'),
    muhold: ee.String(kep.get('SPACECRAFT_ID')).replace('LANDSAT_', 'L'),
    derult: derultArany,
    ho: hoArany,
    st_alj: stat.get('st_alj'),
    st_oldal: stat.get('st_oldal'),
    kulonbseg: kul
  });
}

var tabla = gyujtemeny.map(elemez)
  .filter(ee.Filter.notNull(['derult', 'ho', 'st_alj', 'st_oldal', 'kulonbseg']));

// Jó napok: legalább 85% derült, és a derült terület legalább 70%-a havas
var jok = tabla.filter(ee.Filter.and(ee.Filter.gte('derult', 0.85), ee.Filter.gte('ho', 0.7)))
  .sort('kulonbseg');   // a legnegatívabb (legerősebb inverzió) elöl

print('Jó (derült, havas) napok száma:', jok.size());
print('Legerősebb inverziók (dátum | műhold | derült | havas | alj °C | oldal °C | különbség)',
  jok.limit(40).map(function (f) {
    var s = ee.String(f.get('datum')).cat(' | ').cat(f.get('muhold'))
      .cat(' | ').cat(ee.Number(f.get('derult')).multiply(100).format('%.0f')).cat('%')
      .cat(' | ').cat(ee.Number(f.get('ho')).multiply(100).format('%.0f')).cat('%')
      .cat(' | ').cat(ee.Number(f.get('st_alj')).format('%.1f'))
      .cat(' | ').cat(ee.Number(f.get('st_oldal')).format('%.1f'))
      .cat(' | ').cat(ee.Number(f.get('kulonbseg')).format('%+.1f'));
    return ee.Feature(null, {sor: s});
  }).aggregate_array('sor'));

// Áttekintő grafikon: az összes derült nap (≥85%) – hány fokkal hidegebb a medencealj?
var derultNapok = tabla.filter(ee.Filter.gte('derult', 0.85));
print(ui.Chart.feature.byFeature(derultNapok, 'datum', ['kulonbseg'])
  .setChartType('ColumnChart')
  .setOptions({title: 'Medencealj − hegyoldal felszínhőmérséklet (°C), derült téli napok',
    legend: {position: 'none'}, vAxis: {title: '°C'}, hAxis: {slantedText: true}}));

// Térkép: a medence és a két magassági sáv (ellenőrzéshez)
Map.centerObject(teruletMedence, 10);
Map.addLayer(alj.selfMask(), {palette: ['2979ff']}, 'Medencealj (< 720 m)', true, 0.5);
Map.addLayer(oldal.selfMask(), {palette: ['ff9100']}, 'Hegyoldal (850–1150 m)', true, 0.5);
