// T07 – Miért tudott egy kis patak 16 életet követelni? (Nyikó-völgy, 2005. aug. 23.)
// Tartalék térkép: a 2005-ös Landsat-felvétel (SLC-off csíkok, 30 m) nem használható előtte–utána képnek,
// ezért a TERMÉSZETI ADOTTSÁGOKAT mutatjuk meg: a vízgyűjtőt, a völgyfenéket (HAND) és a lejtést.
// Nem elöntési térkép! A HAND < X m terület "ennyi méterrel van a legközelebbi vízfolyás fölött".
// Adatok: MERIT Hydro (hnd, upa), Copernicus DEM GLO30. Falvak: hargita_falvak.csv.

var KOZEP = ee.Geometry.Point([25.22, 46.37]);
var TER = ee.Geometry.Rectangle([25.02, 46.26, 25.38, 46.50]);

// Falvak: [név, szélesség, hosszúság]  (hargita_falvak.csv)
var FALVAK = [
  ['Farkaslaka', 46.37906, 25.22349], ['Szentlélek', 46.36449, 25.24196],
  ['Bogárfalva', 46.36745, 25.25382], ['Nyikómalomfalva', 46.35713, 25.21891],
  ['Kecsed', 46.38637, 25.19514], ['Kecsetkisfalud', 46.37109, 25.19484],
  ['Székelypálfalva', 46.42643, 25.18252], ['Firtosváralja', 46.42633, 25.15021],
  ['Bencéd', 46.3769, 25.17013], ['Siménfalva', 46.35661, 25.0958],
  ['Farcád', 46.30709, 25.23608], ['Hodgya', 46.28555, 25.24892]
];

var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').select('DEM').mosaic()
  .setDefaultProjection('EPSG:4326', null, 30).reproject('EPSG:32635', null, 30).clip(TER);
var arnyek = ee.Terrain.hillshade(dem, 315, 40);
var lejto = ee.Terrain.slope(dem);

var hydro = ee.Image('MERIT/Hydro/v1_0_1');
var hand = hydro.select('hnd').clip(TER);
var upa = hydro.select('upa').clip(TER);          // vízgyűjtő terület, km²

// Vízfolyások: ahol legalább 5 km² vízgyűjtő tartozik fölé
var patak = upa.gt(5).selfMask();
// Völgyfenék: HAND szerint
var vf2 = hand.lt(2).and(upa.gt(2)).selfMask();
var vf5 = hand.lt(5).and(upa.gt(2)).selfMask();

Map.setOptions('HYBRID');
Map.centerObject(KOZEP, 12);
Map.addLayer(arnyek, {min: 0, max: 255}, 'Domborzat (árnyékolt)', true, 0.6);
Map.addLayer(lejto, {min: 0, max: 30, palette: ['ffffff', 'fdae61', 'd73027', '7f0000']}, 'Lejtés (°)', false, 0.6);
Map.addLayer(vf5, {palette: ['9ecae1']}, 'Völgyfenék: legfeljebb 5 m-rel a patak fölött', true, 0.7);
Map.addLayer(vf2, {palette: ['08519c']}, 'Völgyfenék: legfeljebb 2 m-rel a patak fölött', true, 0.9);
Map.addLayer(patak, {palette: ['00ffff']}, 'Vízfolyások (>5 km² vízgyűjtő)', true);

var pontok = ee.FeatureCollection(FALVAK.map(function (f) {
  return ee.Feature(ee.Geometry.Point([f[2], f[1]]), {nev: f[0]});
}));
Map.addLayer(pontok.style({color: 'ffff00', pointSize: 5}), {}, 'Falvak');

// Falvak a Console-ban: patak feletti magasság, vízgyűjtő, lejtés
var minta = hand.rename('hand_m').addBands(upa.rename('vizgyujto_km2')).addBands(lejto.rename('lejtes'))
  .reduceRegions({collection: pontok, reducer: ee.Reducer.first(), scale: 30});
print('Falvak: patak feletti magasság (m), vízgyűjtő (km²), lejtés (°)', minta.map(function (f) {
  return ee.Feature(null, {
    nev: f.get('nev'), hand_m: ee.Number(f.get('hand_m')).format('%.1f'),
    vizgyujto_km2: ee.Number(f.get('vizgyujto_km2')).format('%.0f'), lejtes: ee.Number(f.get('lejtes')).format('%.1f')
  });
}));

// Nyikó vízgyűjtő mérete a Farkaslaka melletti szelvényben
var farkas = ee.Geometry.Point([25.22349, 46.37906]).buffer(400);
print('Legnagyobb vízgyűjtő Farkaslaka mellett (km²)',
  upa.reduceRegion({reducer: ee.Reducer.max(), geometry: farkas, scale: 90, maxPixels: 1e9}));

// Információs panel
var p = ui.Panel({style: {position: 'bottom-left', padding: '8px', width: '320px'}});
p.add(ui.Label('Nyikó-völgy – miért volt végzetes a 2005-ös áradás?', {fontWeight: 'bold'}));
p.add(ui.Label('2005. aug. 23.: a patak a keskeny, lapos völgyfenéken áradt ki. A sötétkék sáv a patak fölött legfeljebb 2 m-rel, a világoskék 5 m-rel lévő terület – itt a legkisebb áradás is elönti a házakat. A kopár, meredek oldalakról gyorsan lefut a víz (Lejtés réteg).', {fontSize: '12px'}));
p.add(ui.Label('Nem elöntési térkép, hanem természeti adottság. Forrás: MERIT Hydro, Copernicus DEM; falvak: hargita_falvak.csv.', {fontSize: '11px', color: '666666'}));
Map.add(p);
