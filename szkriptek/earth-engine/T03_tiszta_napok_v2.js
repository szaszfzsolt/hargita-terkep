// =====================================================================
// Hargita megye – T03 Hőmérsékleti inverzió
// Napkereső v2: derült, havas téli Landsat-napok, TELJES LEFEDETTSÉG ellenőrzéssel
//
// Mit javít a v1-hez képest: a v1 a derült arányt csak a lefedett pixelekre számolta, ezért olyan
// napok is átmentek, amelyeken a terület fele nem is szerepelt a képen (a Landsat-felvétel kb.
// 185 km széles). A v2 egy napra az összes aznapi felvételt (szomszédos sorok, sávok) egyesíti,
// és a megye, a Csíki- és a Gyergyói-medence lefedettségét külön kiszámolja.
//
// Kimenet (Console), két lista:
//  1. „Teljes megye”: a megye ≥ 90%-a lefedett és ≥ 50%-a derült (egy térképen az összes medence)
//  2. „Két nagy medence”: mindkét medence ≥ 97%-ban lefedett és ≥ 80%-ban derült (erős inverzió elöl)
// Oszlopok: dátum | megye fedett% | megye derült% | havas% (a derültből) | Csíki Δ°C | Gyergyói Δ°C
// (Δ = medencealj (<800 m) mínusz hegyoldal (900–1200 m) felszínhőmérséklete; negatív = inverzió)
// Mentés új szkriptként: NEW → File → név: T03_tiszta_napok_v2  (NE írj felül meglévőt – lásd jegyzetek/Utmutatok/U02)
// Futás: néhány perc (kb. 150 nap × 3 terület).
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp').geometry();
var csiki = ee.Geometry.Rectangle([25.55, 46.15, 26.05, 46.60]);    // Csíki-medence és hegyoldalai
var gyergyoi = ee.Geometry.Rectangle([25.38, 46.62, 25.78, 46.90]); // Gyergyói-medence és hegyoldalai
var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic().setDefaultProjection('EPSG:4326', null, 30);

var tel = ee.Filter.or(ee.Filter.calendarRange(12, 12, 'month'), ee.Filter.calendarRange(1, 2, 'month'));
var gyujtemeny = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(megye).filterDate('2013-12-01', '2026-03-01').filter(tel);

var napok = gyujtemeny.map(function (k) {
  return k.set('nap', ee.Date(k.get('system:time_start')).format('YYYY-MM-dd'));
}).aggregate_array('nap').distinct();
print('Téli napok száma (legalább egy felvétel a megyén):', napok.size());

function szam(d, kulcs) {   // null (teljesen felhős) helyett jelzőérték
  var v = d.get(kulcs);
  return ee.Number(ee.Algorithms.If(ee.Algorithms.IsEqual(v, null), -999, v));
}

function elemez(nap) {
  var d = ee.Date(nap);
  var kepek = gyujtemeny.filterDate(d, d.advance(1, 'day'));
  // minőségi sáv: a kitöltő (fill) pixelek kimaszkolva, utána egy napra mozaik
  var qa = kepek.map(function (k) {
    var q = k.select('QA_PIXEL');
    return q.updateMask(q.bitwiseAnd(1).eq(0));
  }).mosaic();
  var derult = qa.bitwiseAnd(0x1E).eq(0);                 // nem felhő, árnyék, cirrus (a lefedett részen)
  var ho = derult.and(qa.bitwiseAnd(0x20).neq(0));
  var st = kepek.map(function (k) {
    var q = k.select('QA_PIXEL');
    return k.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15)
      .updateMask(q.bitwiseAnd(0x1F).eq(0)).rename('st');
  }).mosaic();

  function terulet(ter, alj, oldal) {
    var kep = ee.Image.cat([
      qa.mask().rename('fedett').unmask(0),
      derult.rename('derult').unmask(0),
      ho.rename('ho').unmask(0),
      st.updateMask(dem.lt(alj)).rename('alj'),
      st.updateMask(dem.gte(900).and(dem.lt(oldal))).rename('oldal')]);
    return kep.reduceRegion({reducer: ee.Reducer.mean(), geometry: ter, scale: 250,
                             maxPixels: 1e9, bestEffort: true});
  }
  var m = terulet(megye, 800, 1200), cs = terulet(csiki, 800, 1200), gy = terulet(gyergyoi, 800, 1200);
  var dm = szam(m, 'derult');
  var csDiff = szam(cs, 'alj').subtract(szam(cs, 'oldal'));
  var gyDiff = szam(gy, 'alj').subtract(szam(gy, 'oldal'));
  return ee.Feature(null, {
    nap: nap,
    m_fed: szam(m, 'fedett'), m_der: dm, m_ho: szam(m, 'ho').divide(dm.max(0.0001)),
    cs_fed: szam(cs, 'fedett'), cs_der: szam(cs, 'derult'), cs_ho: szam(cs, 'ho').divide(szam(cs, 'derult').max(0.0001)),
    cs_diff: ee.Number(ee.Algorithms.If(szam(cs, 'alj').gt(-900).and(szam(cs, 'oldal').gt(-900)), csDiff, 999)),
    gy_fed: szam(gy, 'fedett'), gy_der: szam(gy, 'derult'),
    gy_diff: ee.Number(ee.Algorithms.If(szam(gy, 'alj').gt(-900).and(szam(gy, 'oldal').gt(-900)), gyDiff, 999))
  });
}

var tabla = ee.FeatureCollection(napok.map(elemez));

function sor(f) {
  function p(k) { return ee.Number(f.get(k)).multiply(100).format('%.0f').cat('%'); }
  function t(k) { return ee.Number(f.get(k)).format('%+.1f'); }
  return ee.Feature(null, {s: ee.String(f.get('nap')).cat(' | ').cat(p('m_fed')).cat(' | ').cat(p('m_der'))
    .cat(' | ').cat(p('m_ho')).cat(' | ').cat(t('cs_diff')).cat(' | ').cat(t('gy_diff'))});
}

var teljes = tabla.filter(ee.Filter.and(ee.Filter.gte('m_fed', 0.9), ee.Filter.gte('m_der', 0.5)))
  .sort('m_der', false);
print('1. Teljes megye (dátum | fedett | derült | havas | Csíki Δ | Gyergyói Δ):', teljes.size(),
  teljes.limit(30).map(sor).aggregate_array('s'));

var ketMedence = tabla.filter(ee.Filter.and(ee.Filter.gte('cs_fed', 0.97), ee.Filter.gte('gy_fed', 0.97),
    ee.Filter.gte('cs_der', 0.8), ee.Filter.gte('gy_der', 0.8))).sort('cs_diff');
print('2. Két nagy medence teljesen látszik és derült:', ketMedence.size(),
  ketMedence.limit(30).map(sor).aggregate_array('s'));

Map.centerObject(megye, 8);
Map.addLayer(ee.Image().paint(megye, 0, 2), {palette: 'ffd400'}, 'Megye');
Map.addLayer(ee.Image().paint(csiki, 0, 2), {palette: '00e5ff'}, 'Csíki-medence (számolási terület)');
Map.addLayer(ee.Image().paint(gyergyoi, 0, 2), {palette: 'ff6a00'}, 'Gyergyói-medence (számolási terület)');
