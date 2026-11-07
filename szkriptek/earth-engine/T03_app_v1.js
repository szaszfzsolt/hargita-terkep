// =====================================================================
// Hargita megye – T03 Hőmérsékleti inverzió – a Csíki-medence hidegtava, interaktív app v1
// - Két nap felszínhőmérséklete (Landsat 8/9) egymás mellett, húzható „függönnyel":
//   téli derült napok (a medencealj hidegebb) ↔ nyári napok (a medencealj melegebb)
// - Magasság–hőmérséklet grafikon (Copernicus DEM, 100 m-es sávok) a megyére / kiválasztott községre
// - Községválasztó, „csak a kiválasztott község" kapcsoló (a T02 appból átvéve)
// Adatok: T03_export.js assetei (T03_st_ÉÉÉÉHHNN, °C, 30 m) – nyilvánosnak kell lenniük (T03_megosztas.js)
// Mentés új szkriptként: NEW → File → név: T03_app_v1  (NE írj felül meglévőt – lásd jegyzetek/Utmutatok/U02)
// Projekt: tidal-velocity-494919-e2
// =====================================================================

var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var kozsegek = ee.FeatureCollection(PROJEKT + 'hargita_kozsegek_shp');
var megye = ee.FeatureCollection(PROJEKT + 'hargita_megye_shp');
var terulet = megye.geometry();

// ---------------------------------------------------------------------
// Adatok
// ---------------------------------------------------------------------
var NAPOK = {
  '2014. február 3. (tél)': '20140203',
  '2017. január 10. (tél)': '20170110',
  '2017. február 11. (tél)': '20170211',
  '2021. január 21. (tél)': '20210121',
  '2026. január 19. (tél)': '20260119',
  '2025. július 3. (nyár)': '20250703',
  '2026. augusztus 23. (nyár)': '20260823'
};
var NAP_NEVEK = Object.keys(NAPOK);
function stKep(cim) { return ee.Image(PROJEKT + 'T03_st_' + NAPOK[cim]).select('st'); }

var ST_MIN = -25, ST_MAX = 40;
var PALETTA = ['08306b', '2171b5', '6baed6', 'c6dbef', 'ffffff', 'ffffb2', 'fed976', 'fd8d3c', 'e31a1c', '800026'];

var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic()
  .setDefaultProjection('EPSG:4326', null, 30);
var arnyek = ee.Terrain.hillshade(dem.multiply(2), 315, 40);       // árnyékolt domborzat háttérnek
var magSav = dem.divide(100).floor().multiply(100).rename('mag');   // 100 m-es magassági sávok

// ---------------------------------------------------------------------
// Állapot és térképek
// ---------------------------------------------------------------------
var allapot = {napA: NAP_NEVEK[0], napB: '2025. július 3. (nyár)', kozseg: null, kozsegNev: null,
               csakKozseg: true, hatarok: true, arnyek: true, medence: true};
var frissitesSzam = 0;
// A Csíki-medence és a környező hegyoldalak: ide számoljuk a grafikont, ha nincs kiválasztott község
var medenceTer = ee.Geometry.Rectangle([25.55, 46.15, 26.05, 46.65]).intersection(terulet, ee.ErrorMargin(100));

function ujTerkep() {
  var t = ui.Map();
  t.setOptions('HYBRID');
  t.setControlVisibility({layerList: false, drawingToolsControl: false, mapTypeControl: false});
  return t;
}
var bal = ujTerkep();
var jobb = ujTerkep();
ui.Map.Linker([bal, jobb]);

var CIMKE = {position: 'top-center', fontWeight: 'bold', fontSize: '15px', padding: '4px 10px',
             backgroundColor: 'rgba(0,0,0,0.65)', color: 'white'};
var cimkeA = ui.Label('', CIMKE);
var cimkeB = ui.Label('', CIMKE);
bal.add(cimkeA);
jobb.add(cimkeB);

function rajzol() {
  var statTer = allapot.kozseg ? allapot.kozseg.geometry() : (allapot.medence ? medenceTer : terulet);
  var kivag = Boolean(allapot.kozseg && allapot.csakKozseg);
  var ter = kivag ? statTer : terulet;

  [[bal, allapot.napA, cimkeA], [jobb, allapot.napB, cimkeB]].forEach(function (x) {
    var t = x[0];
    t.layers().reset();
    if (allapot.arnyek) {
      t.addLayer(arnyek.clip(ter), {min: 0, max: 255}, 'Domborzat (árnyékolt)');
    }
    t.addLayer(stKep(x[1]).clip(ter), {min: ST_MIN, max: ST_MAX, palette: PALETTA},
               'Felszínhőmérséklet', true, allapot.arnyek ? 0.8 : 1);
    if (allapot.hatarok) {
      t.addLayer(ee.Image().paint(kozsegek, 0, 1), {palette: 'ffffff'}, 'Községhatárok', true, 0.5);
    }
    t.addLayer(ee.Image().paint(megye, 0, 2.5), {palette: 'ffd400'}, 'Megyehatár');
    if (kivag) {
      var kint = ee.Image(1).paint(ee.FeatureCollection([allapot.kozseg]), 0).selfMask();
      t.addLayer(kint, {palette: '000000'}, 'Községen kívül', true, 0.6);
    }
    if (allapot.kozseg) {
      t.addLayer(ee.Image().paint(ee.FeatureCollection([allapot.kozseg]), 0, 3.5),
                 {palette: 'ff6a00'}, 'Kiválasztott község');
    }
    x[2].setValue(x[1]);
  });
  frissitStatisztika(statTer);
}

// ---------------------------------------------------------------------
// Oldalpanel
// ---------------------------------------------------------------------
var CIM = {fontSize: '22px', fontWeight: 'bold', margin: '8px 8px 0 8px', color: '1b3a4b'};
var ALCIM = {fontSize: '13px', fontWeight: 'bold', margin: '14px 8px 4px 8px', color: '1b3a4b'};
var SZOVEG = {fontSize: '12px', margin: '2px 8px', color: '444444', whiteSpace: 'pre-wrap'};

var panel = ui.Panel({style: {width: '350px', padding: '6px'}});
panel.add(ui.Label('Hőmérsékleti inverzió – a Csíki-medence hidegtava', CIM));
panel.add(ui.Label('Húzd a térkép közepén a függőleges vonalat: bal oldalt az egyik, ' +
  'jobb oldalt a másik nap felszínhőmérséklete látszik. Alapból télen a medencealj ' +
  '(kék) hidegebb a hegyoldalnál, nyáron melegebb (piros).', SZOVEG));

panel.add(ui.Label('Melyik két napot hasonlítsuk össze?', ALCIM));
panel.add(ui.Label('Bal oldal:', {margin: '4px 8px 0 8px', fontSize: '12px'}));
panel.add(ui.Select({items: NAP_NEVEK, value: allapot.napA, style: {stretch: 'horizontal', margin: '0 8px'},
  onChange: function (v) { allapot.napA = v; rajzol(); }}));
panel.add(ui.Label('Jobb oldal:', {margin: '6px 8px 0 8px', fontSize: '12px'}));
panel.add(ui.Select({items: NAP_NEVEK, value: allapot.napB, style: {stretch: 'horizontal', margin: '0 8px'},
  onChange: function (v) { allapot.napB = v; rajzol(); }}));

// Jelmagyarázat
panel.add(ui.Label('Felszínhőmérséklet (°C)', ALCIM));
var grad = ee.Image.pixelLonLat().select('longitude').multiply((ST_MAX - ST_MIN) / 100).add(ST_MIN);
panel.add(ui.Thumbnail({image: grad,
  params: {bbox: [0, 0, 100, 8], dimensions: '300x16', format: 'png', min: ST_MIN, max: ST_MAX, palette: PALETTA},
  style: {margin: '2px 8px'}}));
panel.add(ui.Panel([ui.Label('−25', {fontSize: '11px', margin: '0 0 0 8px', width: '75px'}),
                    ui.Label('0', {fontSize: '11px', width: '85px'}),
                    ui.Label('+20', {fontSize: '11px', width: '85px'}),
                    ui.Label('+40', {fontSize: '11px'})], ui.Panel.Layout.flow('horizontal')));

panel.add(ui.Label('Szürke (csak domborzat) = nincs adat: felhő, vagy a terület kívül esik a műhold ' +
  'aznapi sávján. A Landsat egy felvétele kb. 185 km széles, ezért a megye keleti széle (Gyimes, ' +
  'Úz-völgye, Kászon) a legtöbb napon hiányzik. A Csíki-medence teljesen látszik.', SZOVEG));

// Kapcsolók
panel.add(ui.Label('Megjelenítés', ALCIM));
panel.add(ui.Checkbox({label: 'Árnyékolt domborzat a háttérben', value: allapot.arnyek,
  style: {margin: '2px 8px'}, onChange: function (v) { allapot.arnyek = v; rajzol(); }}));
panel.add(ui.Checkbox({label: 'Községhatárok', value: allapot.hatarok,
  style: {margin: '2px 8px'}, onChange: function (v) { allapot.hatarok = v; rajzol(); }}));

// Községválasztó
panel.add(ui.Label('Község, város', ALCIM));
var kozsegValaszto = ui.Select({placeholder: 'Betöltés…', style: {stretch: 'horizontal', margin: '0 8px'}});
panel.add(kozsegValaszto);
panel.add(ui.Checkbox({label: 'Csak a kiválasztott község (a környék elsötétítve)',
  value: allapot.csakKozseg, style: {margin: '6px 8px 0 8px'},
  onChange: function (v) { allapot.csakKozseg = v; rajzol(); }}));
panel.add(ui.Button({label: '↺ Az egész megye', style: {margin: '6px 8px'},
  onClick: function () {
    allapot.kozseg = null; allapot.kozsegNev = null; kozsegValaszto.setValue(null, false);
    bal.setCenter(25.80, 46.38, 10); rajzol();
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
  allapot.kozsegNev = nev;
  bal.centerObject(f, 12);
  rajzol();
});
function kattintas(k) {
  kozsegek.filterBounds(ee.Geometry.Point([k.lon, k.lat])).aggregate_array('nev_hu')
    .evaluate(function (n) { if (n && n.length) { kozsegValaszto.setValue(n[0]); } });
}
bal.onClick(kattintas);
jobb.onClick(kattintas);

// Statisztika és grafikon
panel.add(ui.Label('Számok', ALCIM));
panel.add(ui.Checkbox({label: 'Kiválasztott község nélkül a Csíki-medencére számoljon (nem az egész megyére)',
  value: allapot.medence, style: {margin: '2px 8px'},
  onChange: function (v) { allapot.medence = v; rajzol(); }}));
var statSzoveg = ui.Label('', SZOVEG);
panel.add(statSzoveg);
var grafikonHely = ui.Panel();
panel.add(grafikonHely);
panel.add(ui.Label('Fontos: a műhold a talaj, a hó vagy a növényzet FELSZÍNÉNEK hőmérsékletét méri ' +
  'kb. délelőtt fél 11-kor, nem a 2 méteren mért léghőmérsékletet. A hó felszíne hidegebb a levegőnél, ' +
  'de a két érték együtt mozog. A felhős pixelek kimaradnak.', SZOVEG));
panel.add(ui.Label('Adatok: Landsat 8–9 (USGS/NASA), Copernicus DEM (ESA). Készítette: Szász Ferenc Zsolt.',
  {fontSize: '11px', color: '777777', margin: '10px 8px'}));

function profil(kep, ter) {   // átlaghőmérséklet 100 m-es magassági sávonként
  return ee.Image.cat([kep.rename('t'), magSav]).reduceRegion({
    reducer: ee.Reducer.mean().group({groupField: 1, groupName: 'mag'}),
    geometry: ter, scale: 90, maxPixels: 1e9, bestEffort: true}).get('groups');
}
function osszegzes(kep, ter) {
  return kep.rename('t').reduceRegion({
    reducer: ee.Reducer.mean().combine(ee.Reducer.min(), '', true),
    geometry: ter, scale: 90, maxPixels: 1e9, bestEffort: true});
}

function frissitStatisztika(ter) {
  var szam = ++frissitesSzam;
  var a = stKep(allapot.napA), b = stKep(allapot.napB);
  statSzoveg.setValue('Számolás…');
  grafikonHely.clear();
  ee.Dictionary({
    nev: allapot.kozseg ? allapot.kozseg.get('nev_hu') : (allapot.medence ? 'Csíki-medence és környéke' : 'Hargita megye'),
    pa: profil(a, ter), pb: profil(b, ter),
    sa: osszegzes(a, ter), sb: osszegzes(b, ter)
  }).evaluate(function (d) {
    if (szam !== frissitesSzam || !d) { return; }   // közben másik választás történt
    function f1(v) { return (v === null || v === undefined) ? '–' : v.toFixed(1).replace('.', ',') + ' °C'; }
    statSzoveg.setValue(d.nev + ':\n' +
      'Bal (' + allapot.napA + '): átlag ' + f1(d.sa.t_mean) + ', leghidegebb pont ' + f1(d.sa.t_min) + '\n' +
      'Jobb (' + allapot.napB + '): átlag ' + f1(d.sb.t_mean) + ', leghidegebb pont ' + f1(d.sb.t_min));
    // grafikon: magasság (x) – átlagos felszínhőmérséklet (y), a két napra
    var sor = {};
    (d.pa || []).forEach(function (g) { sor[g.mag] = sor[g.mag] || {}; sor[g.mag].a = g.mean; });
    (d.pb || []).forEach(function (g) { sor[g.mag] = sor[g.mag] || {}; sor[g.mag].b = g.mean; });
    var magok = Object.keys(sor).map(Number).sort(function (x, y) { return x - y; });
    if (!magok.length) { grafikonHely.add(ui.Label('Ehhez a területhez nincs elég derült adat.', SZOVEG)); return; }
    var rows = magok.map(function (m) {
      var s = sor[m];
      return {c: [{v: m}, {v: s.a === undefined ? null : s.a}, {v: s.b === undefined ? null : s.b}]};
    });
    function rovid(c) {   // '2014. február 3. (tél)' → '2014-02-03 tél'
    var az = NAPOK[c];
    return az.substr(0, 4) + '-' + az.substr(4, 2) + '-' + az.substr(6, 2) + (c.indexOf('(tél)') >= 0 ? ' tél' : ' nyár');
  }
  var cimA = rovid(allapot.napA) + (allapot.napA === allapot.napB ? ' (bal)' : ''),
      cimB = rovid(allapot.napB) + (allapot.napA === allapot.napB ? ' (jobb)' : '');
    grafikonHely.add(ui.Chart({
      cols: [{id: 'm', label: 'Magasság (m)', type: 'number'},
             {id: 'a', label: cimA, type: 'number'}, {id: 'b', label: cimB, type: 'number'}],
      rows: rows
    }, 'LineChart', {
      title: 'Felszínhőmérséklet a magasság szerint',
      hAxis: {title: 'Tengerszint feletti magasság (m)', gridlines: {count: 8}, minorGridlines: {count: 0}, format: '#'},
      vAxis: {title: 'Átlagos felszínhőmérséklet (°C)'},
      legend: {position: 'top', maxLines: 3, textStyle: {fontSize: 11}}, lineWidth: 2, pointSize: 3, interpolateNulls: true,
      series: {0: {color: '2171b5'}, 1: {color: 'e31a1c'}}, height: 280
    }));
  });
}

// ---------------------------------------------------------------------
// Összeállítás
// ---------------------------------------------------------------------
var terkepek = ui.SplitPanel({firstPanel: bal, secondPanel: jobb, orientation: 'horizontal',
  wipe: true, style: {stretch: 'both'}});
ui.root.clear();
ui.root.setLayout(ui.Panel.Layout.flow('horizontal'));
ui.root.add(panel);
ui.root.add(terkepek);
bal.setCenter(25.80, 46.38, 10);   // a Csíki-medence
rajzol();
