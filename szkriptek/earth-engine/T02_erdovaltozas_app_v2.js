// =====================================================================
// Hargita megye – T02 Erdőváltozás, interaktív app v2
// - Két év Sentinel-2 nyári képe egymás mellett, húzható „függönnyel"
// - Új vágások / erdőkárok évről évre (NBR-csökkenés), a vágás évével színezve
// - v2: előre kiszámolt évenkénti mozaikok (T02_evi_mozaikok_export.js), gyors
// - v2.1: erdőmaszk (WorldCover + Hansen) és tartóssági feltétel → nincs rét/szántó téves jelzés
// - v2.4: saját vonalas betűkészlet a nevekhez (helyes magyar ékezetek)
// - v2.3: kapcsolható beépített terület / épületek és magyar településnevek
// - v2.2: kapcsoló – csak a kiválasztott község, a környék elsötétítve
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

// Erdőmaszk: csak itt keresünk vágást (különben a kaszált rét, learatott szántó is „vágásnak" látszik).
// Erdő = ESA WorldCover 2020 fa-borítás (10 m) VAGY Hansen 2000-es erdő (≥30% lombkorona).
var worldcover = ee.ImageCollection('ESA/WorldCover/v100').first().select('Map');
var erdoMaszk = worldcover.eq(10).or(erdo2000.unmask(0)).selfMask();

// Évről évre: ahol erdő van, az előző nyáron zöld volt (NDVI > 0,65), a következő nyárra
// az NBR több mint 0,2-vel csökkent, ÉS egy évvel később sem nőtt vissza (tartós) → vágás/kár.
function vagasEvenkent(evA, evB) {
  if (evA >= evB) { return ee.Image.constant(0).toInt16().rename('ev').selfMask(); }  // nincs mit összevetni
  var lista = [];
  for (var ev = evA; ev < evB; ev++) {
    var elozo = evMozaik(ev), kovetkezo = evMozaik(ev + 1);
    var esett = nbr(elozo).subtract(nbr(kovetkezo)).gt(0.2).and(ndvi(elozo).gt(0.65));
    if (ev + 2 <= 2025) {                                           // tartósság: 2 év múlva is lejjebb
      esett = esett.and(nbr(elozo).subtract(nbr(evMozaik(ev + 2))).gt(0.1));
    }
    esett = esett.and(erdoMaszk.unmask(0));
    lista.push(ee.Image.constant(ev + 1).toInt16().updateMask(esett).rename('ev'));
  }
  var elso = ee.ImageCollection(lista).min();                       // az első vágás éve
  var folt = elso.gt(0).toByte();                                   // egész típus kell a foltméréshez
  return elso.updateMask(folt.connectedPixelCount(30, true).gte(10)); // min. ~0,1 ha
}

// ---------------------------------------------------------------------
// Állapot
// ---------------------------------------------------------------------
var allapot = {evA: '2018', evB: '2025', nezet: 'Erdőkiemelő (infravörös)',
               kozseg: null, hansen: false, ujVagas: true, hatarok: true, csakKozseg: true,
               beepitett: false, nevek: true};

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

// ---------------------------------------------------------------------
// Települések: beépített terület / épületek, falunevek
// ---------------------------------------------------------------------
// Épületkörvonalak (Google + Microsoft, VIDA egyesített adat, GEE közösségi katalógus)
var EPULETEK = ee.FeatureCollection('projects/sat-io/open-datasets/VIDA_COMBINED/ROU');
var beepitettFolt = worldcover.eq(50).selfMask();            // ESA WorldCover 2020: beépített (10 m)
var EPULET_ZOOM = 14;                                        // innen épületenként, alatta foltként

// Falvak: [magyar név, szél., hossz., szint (2 = város, 1 = községközpont, 0 = falu)]
// Forrás: baza-de-date-localitati-romania (koordináták, public domain); magyar nevek: Szász F. Zsolt névlistája
// (adatok/kesz/telepulesek/hargita_telepulesek_nevek.csv) → összevonva: hargita_falvak.csv
var FALVAK_ADAT = [
  ["Balánbánya", 46.65858, 25.80767, 2],
  ["Borszék", 46.97028, 25.55979, 2],
  ["Bélbor", 47.06561, 25.4864, 1],
  ["Rakottyás", 47.04428, 25.50513, 0],
  ["Bögöz", 46.25704, 25.22101, 1],
  ["Agyagfalva", 46.24496, 25.18556, 0],
  ["Béta", 46.27898, 25.22263, 0],
  ["Décsfalva", 46.25506, 25.17651, 0],
  ["Mátisfalva", 46.23508, 25.16523, 0],
  ["Székelydobó", 46.28688, 25.18087, 0],
  ["Székelymagyaros", 46.26377, 25.18421, 0],
  ["Vágás", 46.29755, 25.19794, 0],
  ["Csíkcsicsó", 46.41047, 25.77999, 1],
  ["Csaracsó", 46.41219, 25.74756, 0],
  ["Csíkdánfalva", 46.51581, 25.7534, 1],
  ["Csíkkozmás", 46.20046, 25.96463, 1],
  ["Lázárfalva", 46.18822, 25.9466, 0],
  ["Csíkmadaras", 46.4932, 25.74583, 1],
  ["Csíkpálfalva", 46.39484, 25.8341, 1],
  ["Csíkcsomortán", 46.395, 25.85464, 0],
  ["Csíkdelne", 46.41211, 25.82639, 0],
  ["Csíkrákos", 46.45157, 25.75862, 1],
  ["Göröcsfalva", 46.45496, 25.77921, 0],
  ["Csíkszentdomokos", 46.57905, 25.79003, 1],
  ["Csíkszentgyörgy", 46.33427, 26.04642, 1],
  ["Csobányos", 46.3852, 26.1667, 0],
  ["Csíkbánkfalva", 46.30169, 25.94323, 0],
  ["Csíkménaság", 46.35372, 25.96132, 0],
  ["Egerszék", 46.33367, 26.06728, 0],
  ["Gyürke", 46.30534, 26.06507, 0],
  ["Kotormány", 46.30443, 25.90822, 0],
  ["Ménaságújfalu", 46.33886, 25.97232, 0],
  ["Pottyond", 46.36324, 25.95121, 0],
  ["Csíkszentimre", 46.28401, 25.86296, 1],
  ["Szentimrefürdő", 46.27182, 25.75977, 0],
  ["Csíkszentkirály", 46.30121, 25.80241, 1],
  ["Csíkszentlélek", 46.33604, 25.85446, 1],
  ["Csíkmindszent", 46.32806, 25.88742, 0],
  ["Fitód", 46.35792, 25.84617, 0],
  ["Hosszúaszó", 46.34354, 25.90553, 0],
  ["Csíkszentmihály", 46.47325, 25.82854, 1],
  ["Ajnád", 46.49648, 25.83881, 0],
  ["Lóvész", 46.52582, 25.86115, 0],
  ["Vacsárcsi", 46.46346, 25.79457, 0],
  ["Csíkszentmárton", 46.26622, 25.93937, 1],
  ["Csíkcsekefalva", 46.2548, 25.94641, 0],
  ["Úzvölgye", 46.34227, 26.24817, 0],
  ["Csíkszentsimon", 46.25786, 25.88635, 1],
  ["Csatószeg", 46.24128, 25.89665, 0],
  ["Csíkszenttamás", 46.55657, 25.77646, 1],
  ["Csíkszereda", 46.36956, 25.79537, 2],
  ["Csiba", 46.38005, 25.74652, 0],
  ["Hargitafürdő", 46.37934, 25.63209, 0],
  ["Zsögödfürdő", 46.33937, 25.80886, 0],
  ["Csíkszépvíz", 46.45484, 25.85151, 1],
  ["Bükklok", 46.46272, 25.95419, 0],
  ["Csíkborzsova", 46.43146, 25.82068, 0],
  ["Csíkszentmiklós", 46.43947, 25.84069, 0],
  ["Ditró", 46.81075, 25.50144, 1],
  ["Csengellér", 46.86847, 25.5495, 0],
  ["Orotva", 46.85936, 25.50901, 0],
  ["Etéd", 46.45347, 25.04787, 1],
  ["Küsmöd", 46.477, 25.04576, 0],
  ["Kőrispatak", 46.41781, 24.97037, 0],
  ["Siklód", 46.51702, 25.03891, 0],
  ["Énlaka", 46.43097, 25.11129, 0],
  ["Farkaslaka", 46.37906, 25.22349, 1],
  ["Bogárfalva", 46.36745, 25.25382, 0],
  ["Firtosváralja", 46.42633, 25.15021, 0],
  ["Kecsed", 46.38637, 25.19514, 0],
  ["Kecsetkisfalud", 46.37109, 25.19484, 0],
  ["Nyikómalomfalva", 46.35713, 25.21891, 0],
  ["Szencsed", 46.47642, 25.29934, 0],
  ["Szentlélek", 46.36449, 25.24196, 0],
  ["Székelypálfalva", 46.42643, 25.18252, 0],
  ["Felsőboldogfalva", 46.33098, 25.24857, 1],
  ["Bikafalva", 46.26832, 25.25978, 0],
  ["Farcád", 46.30709, 25.23608, 0],
  ["Hodgya", 46.28555, 25.24892, 0],
  ["Ocfalva", 46.25925, 25.25222, 0],
  ["Patakfalva", 46.26759, 25.33047, 0],
  ["Székelylengyelfalva", 46.33527, 25.24659, 0],
  ["Sándortelke", 46.23463, 25.31333, 0],
  ["Sükő", 46.32337, 25.20217, 0],
  ["Telekfalva", 46.24479, 25.31893, 0],
  ["Árvátfalva", 46.26846, 25.30515, 0],
  ["Fenyéd", 46.3365, 25.3625, 1],
  ["Küküllőkeményfalva", 46.37275, 25.35865, 0],
  ["Nagygalambfalva", 46.27501, 25.13359, 1],
  ["Kisgalambfalva", 46.27203, 25.10274, 0],
  ["Galócás", 46.89358, 25.39214, 1],
  ["Galócáspatak", 46.89734, 25.38446, 0],
  ["Nucén", 46.92043, 25.3962, 0],
  ["Ploptyis", 46.91324, 25.38014, 0],
  ["Preluka", 46.88862, 25.35572, 0],
  ["Tolésén", 46.9174, 25.40355, 0],
  ["Zápodéa", 46.89864, 25.35706, 0],
  ["Ármándombja", 46.89127, 25.39916, 0],
  ["Gyergyóalfalu", 46.69893, 25.50491, 1],
  ["Borzont", 46.69174, 25.44298, 0],
  ["Bucsin", 46.68896, 25.42352, 0],
  ["Gyergyócsomafalva", 46.68, 25.51945, 1],
  ["Gyergyóholló", 47.04217, 25.6825, 1],
  ["Hollósarka", 46.99851, 25.64251, 0],
  ["Gyergyóremete", 46.7963, 25.44266, 1],
  ["Eszenyő", 46.81442, 25.41802, 0],
  ["Kisbükk", 46.83562, 25.38303, 0],
  ["Martonka", 46.82887, 25.42924, 0],
  ["Gyergyószentmiklós", 46.72121, 25.58553, 2],
  ["Gyilkostó", 46.79383, 25.79597, 0],
  ["Kovácspéter", 46.72668, 25.71923, 0],
  ["Vargatag", 46.7543, 25.6314, 0],
  ["Visszafolyó", 46.70328, 25.63116, 0],
  ["Gyergyószárhegy", 46.7586, 25.5252, 1],
  ["Güdüctelep", 46.77845, 25.53398, 0],
  ["Gyergyótölgyes", 46.92569, 25.73513, 1],
  ["Hágótő", 46.87673, 25.68273, 0],
  ["Péntekpataka", 46.96668, 25.83159, 0],
  ["Récefalva", 46.89796, 25.7238, 0],
  ["Gyergyóvárhegy", 46.85546, 25.42748, 1],
  ["Duda", 46.8465, 25.41076, 0],
  ["Fülpe", 46.87953, 25.4105, 0],
  ["Kalnács", 46.85394, 25.3657, 0],
  ["Gyergyóújfalu", 46.66629, 25.55531, 1],
  ["Gyergyólibántelep", 46.54525, 25.50977, 0],
  ["Kilyénfalva", 46.67953, 25.57004, 0],
  ["Szenéte", 46.6262, 25.5883, 0],
  ["Tekerőpatak", 46.69603, 25.59812, 0],
  ["Gyimesfelsőlok", 46.50716, 25.96989, 1],
  ["Görbepataka", 46.53516, 25.93676, 0],
  ["Komjádpataka", 46.51479, 25.95173, 0],
  ["Nyíresalja", 46.54291, 25.96583, 0],
  ["Sántatelek", 46.49405, 25.94175, 0],
  ["Ugrapataka", 46.52349, 25.9848, 0],
  ["Gyimesközéplok", 46.64455, 25.95618, 1],
  ["Antalokpataka", 46.56934, 25.96444, 0],
  ["Barackospatak", 46.63673, 25.9804, 0],
  ["Borospataka", 46.54585, 25.98818, 0],
  ["Bothavaspataka", 46.644, 25.9505, 0],
  ["Farkaspalló", 46.68909, 25.92301, 0],
  ["Hidegség", 46.60711, 25.9669, 0],
  ["Kápolnapatak", 46.55747, 25.99338, 0],
  ["Sötétpatak", 46.55929, 25.95412, 0],
  ["Homoródalmás", 46.22384, 25.48523, 1],
  ["Homoródszentmárton", 46.28217, 25.41178, 1],
  ["Abásfalva", 46.25229, 25.43273, 0],
  ["Bágy", 46.21769, 25.34451, 0],
  ["Gyepes", 46.26426, 25.40382, 0],
  ["Homoródkeményfalva", 46.26492, 25.43871, 0],
  ["Homoródremete", 46.29265, 25.4026, 0],
  ["Homoródszentpál", 46.19178, 25.38124, 0],
  ["Homoródszentpéter", 46.1767, 25.37495, 0],
  ["Kénos", 46.25668, 25.36038, 0],
  ["Lókod", 46.24119, 25.35574, 0],
  ["Recsenyéd", 46.20622, 25.38489, 0],
  ["Városfalva", 46.16279, 25.36376, 0],
  ["Karcfalva", 46.53057, 25.76154, 1],
  ["Csíkjenőfalva", 46.54404, 25.76435, 0],
  ["Korond", 46.4716, 25.18373, 1],
  ["Atyha", 46.48621, 25.12689, 0],
  ["Fenyőkút", 46.4817, 25.24977, 0],
  ["Kalonda", 46.4436, 25.2176, 0],
  ["Pálpataka", 46.51093, 25.21271, 0],
  ["Kányád", 46.19979, 25.28539, 1],
  ["Homoródszentlászló", 46.22805, 25.27095, 0],
  ["Jásfalva", 46.20939, 25.25683, 0],
  ["Miklósfalva", 46.24143, 25.25748, 0],
  ["Petek", 46.17252, 25.23355, 0],
  ["Székelydálya", 46.19371, 25.30573, 0],
  ["Ábránfalva", 46.22835, 25.29131, 0],
  ["Ége", 46.20441, 25.28473, 0],
  ["Kápolnásfalu", 46.41047, 25.51795, 1],
  ["Kászonaltíz", 46.22942, 26.13959, 1],
  ["Kászonfeltíz", 46.23604, 26.10733, 0],
  ["Kászonimpér", 46.21836, 26.1063, 0],
  ["Kászonjakabfalva", 46.20069, 26.10527, 0],
  ["Kászonújfalu", 46.19588, 26.05167, 0],
  ["Lövéte", 46.27473, 25.49144, 1],
  ["Királyfürdő", 46.29548, 25.57594, 0],
  ["Madéfalva", 46.43748, 25.75315, 1],
  ["Maroshévíz", 46.92603, 25.3534, 2],
  ["Kelemenpatak", 46.9523, 25.33535, 0],
  ["Lunkány", 46.9124, 25.3568, 0],
  ["Magyaros", 46.9183, 25.34504, 0],
  ["Moglán", 46.924, 25.38116, 0],
  ["Székpatak", 46.99292, 25.48379, 0],
  ["Vigán", 46.94538, 25.28786, 0],
  ["Válya", 46.94783, 25.37617, 0],
  ["Zsákhegy", 46.927, 25.3341, 0],
  ["Máréfalva", 46.33963, 25.37968, 1],
  ["Oklánd", 46.1625, 25.44286, 1],
  ["Homoródkarácsonyfalva", 46.18394, 25.4331, 0],
  ["Homoródújfalu", 46.14541, 25.41554, 0],
  ["Oroszhegy", 46.39592, 25.30393, 1],
  ["Székelyfancsal", 46.3687, 25.29732, 0],
  ["Székelyszentkirály", 46.36567, 25.32369, 0],
  ["Székelyszenttamás", 46.34794, 25.28776, 0],
  ["Tibód", 46.34817, 25.31115, 0],
  ["Uknyéd", 46.407, 25.3274, 0],
  ["Ülke", 46.35615, 25.28545, 0],
  ["Parajd", 46.55534, 25.12727, 1],
  ["Alsósófalva", 46.52469, 25.12674, 0],
  ["Bucsin", 46.5735, 25.2049, 0],
  ["Békástelep", 46.51493, 25.19023, 0],
  ["Felsősófalva", 46.52424, 25.15053, 0],
  ["Szászveres", 46.5703, 25.0857, 0],
  ["Salamás", 46.87998, 25.45494, 1],
  ["Fundoja", 46.88524, 25.46595, 0],
  ["Gyergyóhodos", 46.86798, 25.44555, 0],
  ["Platonest", 46.90664, 25.41891, 0],
  ["Runk", 46.88989, 25.44154, 0],
  ["Siménfalva", 46.35661, 25.0958, 1],
  ["Bencéd", 46.3769, 25.17013, 0],
  ["Csehétfalva", 46.39875, 25.14239, 0],
  ["Kiskadács", 46.34659, 25.11953, 0],
  ["Kiskede", 46.34166, 25.05871, 0],
  ["Kobátfalva", 46.35711, 25.14549, 0],
  ["Medesér", 46.36057, 25.07341, 0],
  ["Nagykadács", 46.3542, 25.13069, 0],
  ["Nagykede", 46.33548, 25.04691, 0],
  ["Rugonfalva", 46.30416, 25.07172, 0],
  ["Székelyszentmihály", 46.36008, 25.17643, 0],
  ["Székelyszentmiklós", 46.33903, 25.08634, 0],
  ["Tarcsafalva", 46.37586, 25.13094, 0],
  ["Tordátfalva", 46.38098, 25.10359, 0],
  ["Szentegyháza", 46.3267, 25.51481, 2],
  ["Homoródfürdő", 46.34981, 25.46611, 0],
  ["Szentkeresztbánya", 46.30631, 25.50644, 0],
  ["Szentábrahám", 46.33472, 25.00912, 1],
  ["Csekefalva", 46.31468, 25.01844, 0],
  ["Firtosiláz", 46.39402, 25.04098, 0],
  ["Firtosmartonos", 46.40636, 25.09623, 0],
  ["Gagy", 46.36279, 25.02833, 0],
  ["Kismedesér", 46.3873, 25.04925, 0],
  ["Magyarandrásfalva", 46.34763, 25.02218, 0],
  ["Solymosiláz", 46.36069, 24.98527, 0],
  ["Székelyandrásfalva", 46.34842, 24.91176, 1],
  ["Hidegkút", 46.33592, 24.89414, 0],
  ["Kissolymos", 46.33838, 24.96046, 0],
  ["Nagysolymos", 46.34713, 24.92557, 0],
  ["Újlaktelep", 46.30966, 24.87126, 0],
  ["Székelyderzs", 46.20782, 25.16464, 1],
  ["Székelymuzsna", 46.2053, 25.14825, 0],
  ["Székelykeresztúr", 46.29245, 25.03171, 2],
  ["Betfalva", 46.28941, 25.08296, 0],
  ["Fiatfalva", 46.26932, 25.0161, 0],
  ["Székelyudvarhely", 46.305, 25.29265, 2],
  ["Székelyvarság", 46.50907, 25.37281, 1],
  ["Tusnád", 46.14608, 25.85696, 1],
  ["Csíkverebes", 46.22327, 25.90759, 0],
  ["Újtusnád", 46.19381, 25.89723, 0],
  ["Tusnádfürdő", 46.14608, 25.85696, 2],
  ["Kárpitusz", 46.12191, 25.85528, 0],
  ["Vasláb", 46.64607, 25.62371, 1],
  ["Marosfő", 46.62746, 25.71206, 0],
  ["Zetelaka", 46.39103, 25.36793, 1],
  ["Desághátja", 46.43337, 25.44865, 0],
  ["Ivómezeje", 46.46238, 25.45604, 0],
  ["Küküllőmező", 46.50797, 25.39101, 0],
  ["Sikaszómezeje", 46.51432, 25.45891, 0],
  ["Zeteváralja", 46.4416, 25.39778, 0],
  ["Újszékely", 46.26084, 24.97319, 1],
  ["Alsóboldogfalva", 46.27391, 24.99639, 0],
  ["Székelyszenterzsébet", 46.29053, 24.9359, 0]
];
var falvak = ee.FeatureCollection(FALVAK_ADAT.map(function (f) {
  return ee.Feature(ee.Geometry.Point([f[2], f[1]]), {nev: f[0], kiemelt: f[3]});
}));
// Saját vonalas betűkészlet (Hershey „futural”, közkincs) – a magyar ékezeteket (á, é, í, ó, ö, ő, ú, ü, ű)
// a program rajzolja rá a betűkre, így minden név helyesen jelenik meg.
var BETUK = {"A":[18,[[9,-12,1,9],[9,-12,17,9],[4,2,14,2]]],"B":[21,[[4,-12,4,9],[4,-12,13,-12,16,-11,17,-10,18,-8,18,-6,17,-4,16,-3,13,-2],[4,-2,13,-2,16,-1,17,0,18,2,18,5,17,7,16,8,13,9,4,9]]],"C":[21,[[18,-7,17,-9,15,-11,13,-12,9,-12,7,-11,5,-9,4,-7,3,-4,3,1,4,4,5,6,7,8,9,9,13,9,15,8,17,6,18,4]]],"D":[21,[[4,-12,4,9],[4,-12,11,-12,14,-11,16,-9,17,-7,18,-4,18,1,17,4,16,6,14,8,11,9,4,9]]],"E":[19,[[4,-12,4,9],[4,-12,17,-12],[4,-2,12,-2],[4,9,17,9]]],"F":[18,[[4,-12,4,9],[4,-12,17,-12],[4,-2,12,-2]]],"G":[21,[[18,-7,17,-9,15,-11,13,-12,9,-12,7,-11,5,-9,4,-7,3,-4,3,1,4,4,5,6,7,8,9,9,13,9,15,8,17,6,18,4,18,1],[13,1,18,1]]],"H":[22,[[4,-12,4,9],[18,-12,18,9],[4,-2,18,-2]]],"I":[8,[[4,-12,4,9]]],"J":[16,[[12,-12,12,4,11,7,10,8,8,9,6,9,4,8,3,7,2,4,2,2]]],"K":[21,[[4,-12,4,9],[18,-12,4,2],[9,-3,18,9]]],"L":[17,[[4,-12,4,9],[4,9,16,9]]],"M":[24,[[4,-12,4,9],[4,-12,12,9],[20,-12,12,9],[20,-12,20,9]]],"N":[22,[[4,-12,4,9],[4,-12,18,9],[18,-12,18,9]]],"O":[22,[[9,-12,7,-11,5,-9,4,-7,3,-4,3,1,4,4,5,6,7,8,9,9,13,9,15,8,17,6,18,4,19,1,19,-4,18,-7,17,-9,15,-11,13,-12,9,-12]]],"P":[21,[[4,-12,4,9],[4,-12,13,-12,16,-11,17,-10,18,-8,18,-5,17,-3,16,-2,13,-1,4,-1]]],"R":[21,[[4,-12,4,9],[4,-12,13,-12,16,-11,17,-10,18,-8,18,-6,17,-4,16,-3,13,-2,4,-2],[11,-2,18,9]]],"S":[20,[[17,-9,15,-11,12,-12,8,-12,5,-11,3,-9,3,-7,4,-5,5,-4,7,-3,13,-1,15,0,16,1,17,3,17,6,15,8,12,9,8,9,5,8,3,6]]],"T":[16,[[8,-12,8,9],[1,-12,15,-12]]],"U":[22,[[4,-12,4,3,5,6,7,8,10,9,12,9,15,8,17,6,18,3,18,-12]]],"V":[18,[[1,-12,9,9],[17,-12,9,9]]],"Z":[20,[[17,-12,3,9],[3,-12,17,-12],[3,9,17,9]]],"a":[19,[[15,-5,15,9],[15,-2,13,-4,11,-5,8,-5,6,-4,4,-2,3,1,3,3,4,6,6,8,8,9,11,9,13,8,15,6]]],"b":[19,[[4,-12,4,9],[4,-2,6,-4,8,-5,11,-5,13,-4,15,-2,16,1,16,3,15,6,13,8,11,9,8,9,6,8,4,6]]],"c":[18,[[15,-2,13,-4,11,-5,8,-5,6,-4,4,-2,3,1,3,3,4,6,6,8,8,9,11,9,13,8,15,6]]],"d":[19,[[15,-12,15,9],[15,-2,13,-4,11,-5,8,-5,6,-4,4,-2,3,1,3,3,4,6,6,8,8,9,11,9,13,8,15,6]]],"e":[18,[[3,1,15,1,15,-1,14,-3,13,-4,11,-5,8,-5,6,-4,4,-2,3,1,3,3,4,6,6,8,8,9,11,9,13,8,15,6]]],"f":[12,[[10,-12,8,-12,6,-11,5,-8,5,9],[2,-5,9,-5]]],"g":[19,[[15,-5,15,11,14,14,13,15,11,16,8,16,6,15],[15,-2,13,-4,11,-5,8,-5,6,-4,4,-2,3,1,3,3,4,6,6,8,8,9,11,9,13,8,15,6]]],"h":[19,[[4,-12,4,9],[4,-1,7,-4,9,-5,12,-5,14,-4,15,-1,15,9]]],"i":[8,[[3,-12,4,-11,5,-12,4,-13,3,-12],[4,-5,4,9]]],"j":[10,[[5,-12,6,-11,7,-12,6,-13,5,-12],[6,-5,6,12,5,15,3,16,1,16]]],"k":[17,[[4,-12,4,9],[14,-5,4,5],[8,1,15,9]]],"l":[8,[[4,-12,4,9]]],"m":[30,[[4,-5,4,9],[4,-1,7,-4,9,-5,12,-5,14,-4,15,-1,15,9],[15,-1,18,-4,20,-5,23,-5,25,-4,26,-1,26,9]]],"n":[19,[[4,-5,4,9],[4,-1,7,-4,9,-5,12,-5,14,-4,15,-1,15,9]]],"o":[19,[[8,-5,6,-4,4,-2,3,1,3,3,4,6,6,8,8,9,11,9,13,8,15,6,16,3,16,1,15,-2,13,-4,11,-5,8,-5]]],"p":[19,[[4,-5,4,16],[4,-2,6,-4,8,-5,11,-5,13,-4,15,-2,16,1,16,3,15,6,13,8,11,9,8,9,6,8,4,6]]],"r":[13,[[4,-5,4,9],[4,1,5,-2,7,-4,9,-5,12,-5]]],"s":[17,[[14,-2,13,-4,10,-5,7,-5,4,-4,3,-2,4,0,6,1,11,2,13,3,14,5,14,6,13,8,10,9,7,9,4,8,3,6]]],"t":[12,[[5,-12,5,5,6,8,8,9,10,9],[2,-5,9,-5]]],"u":[19,[[4,-5,4,5,5,8,7,9,10,9,12,8,15,5],[15,-5,15,9]]],"v":[16,[[2,-5,8,9],[14,-5,8,9]]],"y":[16,[[2,-5,8,9],[14,-5,8,9,6,13,4,15,2,16,1,16]]],"z":[17,[[14,-5,3,9],[3,-5,14,-5],[3,9,14,9]]]};
var EKEZET = {'á': ['a', 'e'], 'é': ['e', 'e'], 'í': ['i', 'e'], 'ó': ['o', 'e'], 'ú': ['u', 'e'],
  'ö': ['o', 'p'], 'ü': ['u', 'p'], 'ő': ['o', 'k'], 'ű': ['u', 'k'],
  'Á': ['A', 'e'], 'É': ['E', 'e'], 'Í': ['I', 'e'], 'Ó': ['O', 'e'], 'Ú': ['U', 'e'],
  'Ö': ['O', 'p'], 'Ü': ['U', 'p'], 'Ő': ['O', 'k'], 'Ű': ['U', 'k']};   // e: vessző, p: pontok, k: két vessző
// Egy név vonalai betűegységben (sormagasság ≈ 21 egység, y lefelé nő)
function nevVonalai(nev) {
  var vonalak = [], x = 0;
  for (var i = 0; i < nev.length; i++) {
    var c = nev.charAt(i), e = EKEZET[c], alap = e ? e[0] : c, g = BETUK[alap];
    if (!g) { x += 10; continue; }
    var xs = [];
    g[1].forEach(function (v) { for (var k = 0; k < v.length; k += 2) { xs.push(v[k]); } });
    var cx = x + (xs.length ? (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2 : 0);
    g[1].forEach(function (v) {
      if (alap === 'i' && e && v[1] < -6) { return; }          // í: pont nélkül
      var pts = [];
      for (var k = 0; k < v.length; k += 2) { pts.push([x + v[k], v[k + 1]]); }
      vonalak.push(pts);
    });
    if (e) {
      var y0 = (alap === alap.toUpperCase()) ? -16 : -8;
      if (e[1] === 'e') { vonalak.push([[cx - 1, y0], [cx + 2, y0 - 4]]); }
      if (e[1] === 'k') { vonalak.push([[cx - 3, y0], [cx, y0 - 4]]); vonalak.push([[cx + 1, y0], [cx + 4, y0 - 4]]); }
      if (e[1] === 'p') { vonalak.push([[cx - 3, y0 - 1], [cx - 3, y0 - 3]]); vonalak.push([[cx + 3, y0 - 1], [cx + 3, y0 - 3]]); }
    }
    x += g[0];
  }
  return {vonalak: vonalak, szel: x};
}
var NEV_VONALAK = FALVAK_ADAT.map(function (f) { return nevVonalai(f[0]); });   // egyszer számoljuk ki

function beepitettKep(zoom, ter) {
  if (zoom >= EPULET_ZOOM) {
    // Csak az épületek kapnak színt: 0 alap → épület = 1 → a 0 eltakarva (selfMask)
    var ep = ee.Image(0).byte().paint(EPULETEK.filterBounds(ter), 1).selfMask().clip(ter);
    var kor = ee.Image(0).byte().paint(EPULETEK.filterBounds(ter), 1, 1).selfMask().clip(ter);
    return ee.ImageCollection([ep.visualize({palette: ['ff9a3c'], opacity: 0.8}),
                               kor.visualize({palette: ['7a2e00']})]).mosaic();
  }
  return beepitettFolt.clip(ter).visualize({palette: ['ff7a00'], opacity: 0.85});
}
function nevekKep(zoom) {
  if (zoom < 9) { return ee.Image(); }
  var mPerPx = 156543.03 * Math.cos(46.4 * Math.PI / 180) / Math.pow(2, zoom);
  // Nagyítás szerint: 9: csak a városok, 10–11: + községközpontok, 12-től: minden falu; a betű is nő
  var minSzint = zoom <= 9 ? 2 : (zoom <= 11 ? 1 : 0);
  var betuPx = {9: 0.42, 10: 0.5, 11: 0.58}[zoom] || 0.7;      // 1 betűegység képpontban (21 egység ≈ betűmagasság)
  var egyseg = mPerPx * betuPx;
  var b = bal.getBounds();                                      // [ny, d, k, é] – csak a látható rész
  var rx = (b[2] - b[0]) * 0.2, ry = (b[3] - b[1]) * 0.2;
  var vonalak = [];
  FALVAK_ADAT.forEach(function (f, i) {
    if (f[3] < minSzint) { return; }
    if (f[2] < b[0] - rx || f[2] > b[2] + rx || f[1] < b[1] - ry || f[1] > b[3] + ry) { return; }
    var nv = NEV_VONALAK[i];
    var dx = egyseg / (111320 * Math.cos(f[1] * Math.PI / 180)), dy = egyseg / 110540;
    nv.vonalak.forEach(function (v) {
      vonalak.push(v.map(function (p) {
        return [f[2] + (p[0] - nv.szel / 2) * dx, f[1] - (p[1] + 1.5) * dy];
      }));
    });
  });
  if (!vonalak.length) { return ee.Image(); }
  var geom = ee.FeatureCollection([ee.Feature(ee.Geometry.MultiLineString(vonalak, null, false))]);
  var kontur = ee.Image().byte().paint(geom, 1, zoom >= 12 ? 4 : 3).visualize({palette: ['000000'], opacity: 0.75});
  var betu = ee.Image().byte().paint(geom, 1, zoom >= 12 ? 1.6 : 1.3).visualize({palette: ['ffffff']});
  return ee.ImageCollection([kontur, betu]).mosaic();
}
var telepRetegek = [];      // [{terkep, beep, nev}] – nagyításkor csak ezek frissülnek
var aktTer = terulet;
function telepulesRetegek() {
  var z = bal.getZoom();
  telepRetegek.forEach(function (r) {
    if (r.beep) { r.beep.setEeObject(beepitettKep(z, aktTer)); }
    if (r.nev) { r.nev.setEeObject(nevekKep(z)); }
  });
}
var zoomElozo = null;
bal.onChangeBounds(function () {
  var z = bal.getZoom();
  var zoomValtozott = (z !== zoomElozo);
  zoomElozo = z;
  telepRetegek.forEach(function (r) {
    if (r.beep && zoomValtozott) { r.beep.setEeObject(beepitettKep(z, aktTer)); }
    if (r.nev) { r.nev.setEeObject(nevekKep(z)); }              // a nevek a látható részhez igazodnak
  });
});
var cimkeA = ui.Label('', {position: 'bottom-left', fontWeight: 'bold', fontSize: '18px'});
var cimkeB = ui.Label('', {position: 'bottom-right', fontWeight: 'bold', fontSize: '18px'});
bal.add(cimkeA);
jobb.add(cimkeB);

function rajzol() {
  // Statisztika mindig a kiválasztott községre; a térképen a kapcsolótól függ, mi látszik
  var statTer = allapot.kozseg ? allapot.kozseg.geometry() : terulet;
  var kivag = Boolean(allapot.kozseg && allapot.csakKozseg);
  var ter = kivag ? statTer : terulet;
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
    if (kivag) {   // a községen kívüli rész elsötétítve
      var kint = ee.Image(1).paint(ee.FeatureCollection([allapot.kozseg]), 0).selfMask();
      t.addLayer(kint, {palette: '000000'}, 'Községen kívül', true, 0.6);
    }
    if (allapot.kozseg) {
      t.addLayer(ee.Image().paint(ee.FeatureCollection([allapot.kozseg]), 0, 3.5),
                 {palette: 'ff6a00'}, 'Kiválasztott község');
    }
    x[3].setValue(x[2] + ' nyara');
  });
  // Az új vágásokat a „később" (jobb) oldalon mutatjuk
  if (allapot.ujVagas) {
    jobb.addLayer(ujVagas.clip(ter), {min: 2019, max: 2025, palette: S2_PALETTA}, 'Új vágás / kár', true);
  }
  // Települések rétegei legfelül, mindkét térképen
  aktTer = ter;
  // Saját nevek mellett a Google-feliratok kikapcsolva (ne legyen minden név kétszer)
  [bal, jobb].forEach(function (t) { t.setOptions(allapot.nevek ? 'SATELLITE' : 'HYBRID'); });
  telepRetegek = [];
  var z = bal.getZoom();
  [bal, jobb].forEach(function (t) {
    var r = {};
    if (allapot.beepitett) {
      r.beep = ui.Map.Layer(beepitettKep(z, ter), {}, 'Beépített terület / épületek');
      t.layers().add(r.beep);
    }
    if (allapot.nevek) {
      r.nev = ui.Map.Layer(nevekKep(z), {}, 'Településnevek');
      t.layers().add(r.nev);
    }
    telepRetegek.push(r);
  });
  frissitStatisztika(statTer, ujVagas);
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
panel.add(ui.Checkbox({label: 'Beépített terület / épületek', value: allapot.beepitett,
  style: {margin: '2px 8px'},
  onChange: function (v) { allapot.beepitett = v; rajzol(); }}));
panel.add(ui.Label('Távolról: beépített foltok (ESA WorldCover, 10 m). Közelről (14. nagyítástól): ' +
  'minden épület körvonala (Google–Microsoft épületadat).', {fontSize: '11px', margin: '0 8px 0 30px', color: '666666'}));
panel.add(ui.Checkbox({label: 'Településnevek (magyarul)', value: allapot.nevek, style: {margin: '2px 8px'},
  onChange: function (v) { allapot.nevek = v; rajzol(); }}));
panel.add(ui.Label('Megyei nézetben a városok, közelebb a községközpontok, a 12. nagyítástól minden falu.',
  {fontSize: '11px', margin: '0 8px 0 30px', color: '666666'}));

// Községválasztó
panel.add(ui.Label('Község, város', ALCIM));
var kozsegValaszto = ui.Select({placeholder: 'Betöltés…', style: {stretch: 'horizontal', margin: '0 8px'}});
panel.add(kozsegValaszto);
panel.add(ui.Checkbox({label: 'Csak a kiválasztott község (a környék elsötétítve)',
  value: allapot.csakKozseg, style: {margin: '6px 8px 0 8px'},
  onChange: function (v) { allapot.csakKozseg = v; rajzol(); }}));
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
