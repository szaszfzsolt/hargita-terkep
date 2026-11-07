// =====================================================================
// Hargita megye – T03 Hőmérsékleti inverzió
// 2. lépés: derült NYÁRI Landsat-napok keresése (a téli napokkal való összehasonlításhoz)
// Nyáron délelőtt a medencealj általában melegebb a hegyoldalnál (a különbség pozitív).
// Használat: másold a Code Editorba, Run. Futás: néhány perc.
// =====================================================================

// A Csíki-medence és a környező hegyoldalak (nyugat–kelet: Hargita ↔ Csíki-havasok)
var teruletMedence = ee.Geometry.Rectangle([25.55, 46.15, 26.05, 46.65]);

var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic().setDefaultProjection('EPSG:4326', null, 30);
var alj = dem.lt(720);                                    // medencealj
var oldal = dem.gte(850).and(dem.lt(1150));               // hegyoldal

// Landsat 8 + 9, Collection 2 Level 2, téli hónapok
var tel = ee.Filter.or(
  ee.Filter.calendarRange(6, 8, 'month'),
  ee.Filter.calendarRange(6, 8, 'month'));

var gyujtemeny = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(teruletMedence)
  .filterDate('2014-06-01', '2026-09-01')
  .filter(tel);
print('Nyári felvételek száma:', gyujtemeny.size());

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

  // Teljesen felhős felvételnél a hőmérséklet null → -999 jelzőérték, később kiszűrjük
  function szam(kulcs) {
    var v = stat.get(kulcs);
    return ee.Number(ee.Algorithms.If(v, v, -999));
  }
  var derultArany = szam('derult');
  var hoArany = szam('ho').divide(derultArany.max(0.0001));
  var stAlj = szam('st_alj');
  var stOldal = szam('st_oldal');
  return ee.Feature(null, {
    datum: ee.Date(kep.get('system:time_start')).format('YYYY-MM-dd'),
    muhold: ee.String(kep.get('SPACECRAFT_ID')).replace('LANDSAT_', 'L'),
    derult: derultArany,
    ho: hoArany,
    st_alj: stAlj,
    st_oldal: stOldal,
    kulonbseg: stAlj.subtract(stOldal)
  });
}

// érvényes: volt mérhető hőmérséklet mindkét sávban
var tabla = gyujtemeny.map(elemez)
  .filter(ee.Filter.and(ee.Filter.gt('st_alj', -900), ee.Filter.gt('st_oldal', -900)));

// Jó napok: legalább 95% derült
var jok = tabla.filter(ee.Filter.gte('derult', 0.95))
  .sort('kulonbseg', false);   // a legpozitívabb (medencealj a legmelegebb) elöl

print('Jó (derült) nyári napok száma:', jok.size());
print('Legmelegebb medencealj (dátum | műhold | derült | havas | alj °C | oldal °C | különbség)',
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
var derultNapok = tabla.filter(ee.Filter.gte('derult', 0.95));
print(ui.Chart.feature.byFeature(derultNapok, 'datum', ['kulonbseg'])
  .setChartType('ColumnChart')
  .setOptions({title: 'Medencealj − hegyoldal felszínhőmérséklet (°C), derült nyári napok',
    legend: {position: 'none'}, vAxis: {title: '°C'}, hAxis: {slantedText: true}}));

// Térkép: a medence és a két magassági sáv (ellenőrzéshez)
Map.centerObject(teruletMedence, 10);
Map.addLayer(alj.selfMask(), {palette: ['2979ff']}, 'Medencealj (< 720 m)', true, 0.5);
Map.addLayer(oldal.selfMask(), {palette: ['ff9100']}, 'Hegyoldal (850–1150 m)', true, 0.5);
