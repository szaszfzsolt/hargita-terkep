// =====================================================================
// Hargita megye – T02 Erdőváltozás, interaktív app v2
// - Két év Sentinel-2 nyári képe egymás mellett, húzható „függönnyel"
// - Új vágások / erdőkárok évről évre (NBR-csökkenés), a vágás évével színezve
// - v2: előre kiszámolt évenkénti mozaikok (T02_evi_mozaikok_export.js), gyors
// - Hansen Global Forest Change: évenkénti erdővesztés 2001–2024
// - Községenkénti grafikon: hány hektár erdő tűnt el évente
// Projekt: tidal-velocity-494919-e2 · Mentés: users/szaszfzsolt/T01_proba/erdo_app_v1 (v2 kód)
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var kozsegek = ee.FeatureCollection(PROJEKT + 'hargita_kozsegek_shp');
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

// ---------------------------------------------------------------------
// Adatok
// ---------------------------------------------------------------------
// Előre kiszámolt nyári „legjobb pixel" mozaikok (jún 15 – szept 15), sávok: B2 B3 B4 B8 B11 B12
function evMozaik(ev) { return ee.Image(PROJEKT + 'T02_s2_nyar_' + ev); }
function nbr(kep) { return kep.normalizedDifference(['B8', 'B12']); }
function ndvi(kep) { return kep.normalizedDifference(['B8', 'B4']); }

// Hansen et al. – Global Forest Change 2000–2024 (30 m)
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');
var erdo2000 = gfc.select('treecover2000').gte(30);           // ≥30% lombkorona = erdő
var vesztesEv = gfc.select('lossyear').selfMask();              // 1 = 2001 … 24 = 2024

var NEZETEK = {
  'Valós színek': {bands: ['B4', 'B3', 'B2'], min: 0, max: 1500, gamma: 1.3},
  'Erdőkiemelő (infravörös)': {bands: ['B11', 'B8', 'B4'], min: 100, max: 4500, gamma: 1.0}
};
var EVEK = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
var VESZTES_PALETTA = ['ffff66', 'ffcc33', 'ff9933', 'ff6633', 'e6194b', 'b3003c', '800080'];
var S2_PALETTA = ['00e5ff', '2979ff', '651fff', 'd500f9', 'ff1744', 'ff9100', 'ffea00'];   // 2019 … 2025

// Évről évre: ahol az előző nyáron erdő volt (NDVI > 0,65) és a következő nyárra
// az NBR több mint 0,2-vel csökkent → vágás/kár; értéke a vágás éve.
function vagasEvenkent(evA, evB) {
  if (evA >= evB) { return ee.Image.constant(0).toInt16().rename('ev').selfMask(); }  // nincs mit összevetni
  var lista = [];
  for (var ev = evA; ev < evB; ev++) {
    var elozo = evMozaik(ev), kovetkezo = evMozaik(ev + 1);
    var esett = nbr(elozo).subtract(nbr(kovetkezo)).gt(0.2).and(ndvi(elozo).gt(0.65));
    lista.push(ee.Image.constant(ev + 1).toInt16().updateMask(esett).rename('ev'));
  }
  var elso = ee.ImageCollection(lista).min();                       // az első vágás éve
  return elso.updateMask(elso.mask().connectedPixelCount(30).gte(10)); // min. ~0,1 ha
}

// ---------------------------------------------------------------------
// Állapot
// ---------------------------------------------------------------------
var allapot = {evA: '2018', evB: '2025', nezet: 'Erdőkiemelő (infravörös)',
               kozseg: null, hansen: false, ujVagas: true, hatarok: true};

// ---------------------------------------------------------------------
// Két összekapcsolt térkép, függönnyel
// ---------------------------------------------------------------------
function ujTerkep() {
  var t = ui.Map();
  t.setOptions('HYBRID');
  t.setControlVisibility({layerList: false, drawingToolsControl: false, mapTypeControl: false});
  return t;
}
var bal = ujTerkep();
var jobb = ujTerkep();
ui.Map.Linker([bal, jobb]);
var cimkeA = ui.Label('', {position: 'bottom-left', fontWeight: 'bold', fontSize: '18px'});
var cimkeB = ui.Label('', {position: 'bottom-right', fontWeight: 'bold', fontSize: '18px'});
bal.add(cimkeA);
jobb.add(cimkeB);

function rajzol() {
  var ter = allapot.kozseg ? allapot.kozseg.geometry() : terulet;
  var kepA = evMozaik(allapot.evA);
  var kepB = evMozaik(allapot.evB);
  var vis = NEZETEK[allapot.nezet];

  var ujVagas = vagasEvenkent(Number(allapot.evA), Number(allapot.evB));

  [[bal, kepA, allapot.evA, cimkeA], [jobb, kepB, allapot.evB, cimkeB]].forEach(function (x) {
    var t = x[0];
    t.layers().reset();
    t.addLayer(x[1].clip(ter), vis, x[2]);
    if (allapot.hansen) {
      t.addLayer(vesztesEv.clip(ter), {min: 1, max: 24, palette: VESZTES_PALETTA}, 'Erdővesztés 2001–2024');
    }
    if (allapot.hatarok) {
      t.addLayer(ee.Image().paint(kozsegek, 0, 1), {palette: 'ffffff'}, 'Községhatárok', true, 0.6);
    }
    t.addLayer(ee.Image().paint(megye, 0, 2.5), {palette: 'ffd400'}, 'Megyehatár');
    x[3].setValue(x[2] + ' nyara');
  });
  // Az új vágásokat a „később" (jobb) oldalon mutatjuk
  if (allapot.ujVagas) {
    jobb.addLayer(ujVagas.clip(ter), {min: 2019, max: 2025, palette: S2_PALETTA}, 'Új vágás / kár', true);
  }
  frissitStatisztika(ter, ujVagas);
}

// ---------------------------------------------------------------------
// Oldalpanel
// ---------------------------------------------------------------------
var CIM = {fontSize: '22px', fontWeight: 'bold', margin: '8px 8px 0 8px', color: '1b3a4b'};
var ALCIM = {fontSize: '13px', fontWeight: 'bold', margin: '14px 8px 4px 8px', color: '1b3a4b'};
var SZOVEG = {fontSize: '12px', margin: '2px 8px', color: '444444', whiteSpace: 'pre-wrap'};

var panel = ui.Panel({style: {width: '340px', padding: '6px'}});
panel.add(ui.Label('Hargita erdei – változás műholdról', CIM));
panel.add(ui.Label('Húzd a térkép közepén a függőleges vonalat: bal oldalt a korábbi, ' +
  'jobb oldalt a későbbi év nyara látszik.', SZOVEG));

// Évválasztók
panel.add(ui.Label('Melyik két évet hasonlítsuk össze?', ALCIM));
var evAValaszto = ui.Select({items: EVEK, value: allapot.evA, style: {width: '130px'},
  onChange: function (v) { allapot.evA = v; rajzol(); }});
var evBValaszto = ui.Select({items: EVEK, value: allapot.evB, style: {width: '130px'},
  onChange: function (v) { allapot.evB = v; rajzol(); }});
panel.add(ui.Panel([ui.Label('Előtte:', {margin: '14px 4px 0 8px'}), evAValaszto,
                    ui.Label('Utána:', {margin: '14px 4px 0 8px'}), evBValaszto],
                   ui.Panel.Layout.flow('horizontal', true)));

// Nézet
panel.add(ui.Label('Színezés', ALCIM));
panel.add(ui.Select({items: Object.keys(NEZETEK), value: allapot.nezet,
  style: {stretch: 'horizontal', margin: '0 8px'},
  onChange: function (v) { allapot.nezet = v; rajzol(); }}));
panel.add(ui.Label('Erdőkiemelő: az erdő sötétzöld, a rét világoszöld, a friss vágás ' +
  'és a csupasz talaj rózsaszín-lila.', SZOVEG));

// Rétegek
panel.add(ui.Label('Rétegek', ALCIM));
panel.add(ui.Checkbox({label: 'Vágás / erdőkár évről évre (Sentinel-2)', value: allapot.ujVagas,
  style: {margin: '2px 8px'},
  onChange: function (v) { allapot.ujVagas = v; rajzol(); }}));
panel.add(ui.Thumbnail({image: ee.Image.pixelLonLat().select(0),
  params: {bbox: [0, 0, 1, 0.1], dimensions: '220x12', format: 'png', min: 0, max: 1, palette: S2_PALETTA},
  style: {margin: '2px 8px 0 30px'}}));
panel.add(ui.Panel([ui.Label('2019', {margin: '0 0 0 30px', fontSize: '11px'}),
                    ui.Label('2025', {margin: '0 0 0 160px', fontSize: '11px'})],
                   ui.Panel.Layout.flow('horizontal')));
panel.add(ui.Checkbox({label: 'Erdővesztés évenként 2001–2024 (Hansen)', value: allapot.hansen,
  style: {margin: '2px 8px'},
  onChange: function (v) { allapot.hansen = v; rajzol(); }}));
// Hansen jelmagyarázat
var szinsav = ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: {bbox: [0, 0, 1, 0.1], dimensions: '220x12', format: 'png',
           min: 0, max: 1, palette: VESZTES_PALETTA},
  style: {margin: '2px 8px 0 30px'}});
panel.add(szinsav);
panel.add(ui.Panel([ui.Label('2001', {margin: '0 0 0 30px', fontSize: '11px'}),
                    ui.Label('2024', {margin: '0 0 0 160px', fontSize: '11px'})],
                   ui.Panel.Layout.flow('horizontal')));
panel.add(ui.Checkbox({label: 'Községhatárok', value: allapot.hatarok, style: {margin: '2px 8px'},
  onChange: function (v) { allapot.hatarok = v; rajzol(); }}));

// Községválasztó
panel.add(ui.Label('Község, város', ALCIM));
var kozsegValaszto = ui.Select({placeholder: 'Betöltés…', style: {stretch: 'horizontal', margin: '0 8px'}});
panel.add(kozsegValaszto);
panel.add(ui.Button({label: '↺ Az egész megye', style: {margin: '6px 8px'},
  onClick: function () {
    allapot.kozseg = null; kozsegValaszto.setValue(null, false);
    bal.centerObject(megye, 9); rajzol();
  }}));
kozsegek.aggregate_array('nev_hu').evaluate(function (nevek) {
  nevek.sort(function (a, b) { return a.localeCompare(b, 'hu'); });
  kozsegValaszto.items().reset(nevek);
  kozsegValaszto.setPlaceholder('Válassz települést… (' + nevek.length + ')');
});
kozsegValaszto.onChange(function (nev) {
  if (!nev) { return; }
  var f = ee.Feature(kozsegek.filter(ee.Filter.eq('nev_hu', nev)).first());
  allapot.kozseg = f;
  bal.centerObject(f, 12);
  rajzol();
});
bal.onClick(kattintas);
jobb.onClick(kattintas);
function kattintas(k) {
  kozsegek.filterBounds(ee.Geometry.Point([k.lon, k.lat])).aggregate_array('nev_hu')
    .evaluate(function (n) { if (n && n.length) { kozsegValaszto.setValue(n[0]); } });
}

// Statisztika
panel.add(ui.Label('Számok', ALCIM));
var statSzoveg = ui.Label('', SZOVEG);
panel.add(statSzoveg);
var grafikonHely = ui.Panel();
panel.add(grafikonHely);

function frissitStatisztika(ter, ujVagas) {
  statSzoveg.setValue('Számolás…');
  grafikonHely.clear();
  var ha = ee.Image.pixelArea().divide(1e4);

  // Erdő 2000-ben és összes vesztés 2001–2024 (Hansen, 30 m)
  var hansenOssz = ha.updateMask(erdo2000).rename('erdo')
    .addBands(ha.updateMask(vesztesEv.gt(0)).rename('vesztes'))
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: ter, scale: 30, maxPixels: 1e10, tileScale: 4});
  // Új vágás a két kiválasztott év között (Sentinel-2, 10 m)
  var s2Csoport = ha.addBands(ujVagas).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'ev'}),
    geometry: ter, scale: 20, maxPixels: 1e10, tileScale: 4});
  var ujHa = ee.Dictionary({area: ee.List(s2Csoport.get('groups')).iterate(function (g, acc) {
    return ee.Number(acc).add(ee.Dictionary(g).get('sum')); }, 0)});

  var nevKerdes = allapot.kozseg ? allapot.kozseg.get('nev_hu') : ee.String('Hargita megye');
  ee.Dictionary({nev: nevKerdes, h: hansenOssz, u: ujHa}).evaluate(function (d) {
    if (!d) { statSzoveg.setValue('Nem sikerült számolni – közelíts rá egy községre.'); return; }
    var erdo = d.h.erdo, vesz = d.h.vesztes, uj = d.u.area;
    statSzoveg.setValue(
      d.nev + '\n' +
      'Erdő 2000-ben: ' + Math.round(erdo).toLocaleString('hu') + ' ha\n' +
      'Erdővesztés 2001–2024: ' + Math.round(vesz).toLocaleString('hu') + ' ha (' +
        (erdo ? (100 * vesz / erdo).toFixed(1) : '–') + '%)\n' +
      'Vágás/kár ' + allapot.evA + '–' + allapot.evB + ' között: ' +
        Math.round(uj || 0).toLocaleString('hu') + ' ha (Sentinel-2 becslés)');
  });

  // Évenkénti grafikon: Hansen (2001–2024) és Sentinel-2 becslés egymás mellett
  var hCsoport = ha.addBands(vesztesEv).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'ev'}),
    geometry: ter, scale: 30, maxPixels: 1e10, tileScale: 4});
  function szotar(csoport, eltolas) {
    return ee.Dictionary(ee.List(csoport.get('groups')).iterate(function (g, acc) {
      g = ee.Dictionary(g);
      return ee.Dictionary(acc).set(ee.Number(g.get('ev')).add(eltolas).format('%d'), g.get('sum'));
    }, ee.Dictionary({})));
  }
  var hSz = szotar(hCsoport, 2000), sSz = szotar(s2Csoport, 0);
  var sorok = ee.FeatureCollection(ee.List.sequence(2001, 2025).map(function (y) {
    var k = ee.Number(y).format('%d');
    return ee.Feature(null, {ev: y, 'Hansen (30 m)': hSz.get(k, 0), 'Sentinel-2 (10–20 m)': sSz.get(k, 0)});
  }));
  var grafikon = ui.Chart.feature.byFeature(sorok, 'ev', ['Hansen (30 m)', 'Sentinel-2 (10–20 m)'])
    .setChartType('ColumnChart')
    .setOptions({title: 'Erdővesztés évente (ha)', legend: {position: 'bottom'},
      hAxis: {format: '####', slantedText: true}, vAxis: {title: 'hektár'},
      colors: ['b3003c', '2979ff'], height: 240});
  grafikonHely.add(grafikon);
}

panel.add(ui.Label('Figyelem: az erdővesztés nem mindig irtás – lehet széldöntés, ' +
  'szúkár, tervszerű vágás vagy erdőtűz is. A Hansen-adat 30 m-es, a Sentinel-becslés 10–20 m-es.',
  {fontSize: '11px', margin: '10px 8px', color: '777777', whiteSpace: 'pre-wrap'}));
panel.add(ui.Label('Adatok: Copernicus Sentinel-2 (ESA); Hansen et al. 2013, Global Forest Change ' +
  '2000–2024 v1.12 (UMD); geoBoundaries / geo-spatial.org · Készítette: Szász Ferenc Zsolt',
  {fontSize: '10px', margin: '8px 8px 4px 8px', color: '888888'}));

// ---------------------------------------------------------------------
// Összeállítás
// ---------------------------------------------------------------------
// (Osztott panel nem tehető újabb osztott panelbe → a gyökérbe egymás mellé tesszük)
var terkepek = ui.SplitPanel({firstPanel: bal, secondPanel: jobb, orientation: 'horizontal',
  wipe: true, style: {stretch: 'both'}});
ui.root.clear();
ui.root.setLayout(ui.Panel.Layout.flow('horizontal'));
ui.root.add(panel);
ui.root.add(terkepek);
bal.centerObject(megye, 9);
rajzol();
