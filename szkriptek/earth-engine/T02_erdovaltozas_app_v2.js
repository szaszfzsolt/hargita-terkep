// =====================================================================
// Hargita megye – T02 Erdőváltozás, interaktív app v2
// - Két év Sentinel-2 nyári képe egymás mellett, húzható „függönnyel"
// - Új vágások / erdőkárok évről évre (NBR-csökkenés), a vágás évével színezve
// - v2: előre kiszámolt évenkénti mozaikok (T02_evi_mozaikok_export.js), gyors
// - v2.1: erdőmaszk (WorldCover + Hansen) és tartóssági feltétel → nincs rét/szántó téves jelzés
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

// Falvak: [magyar név, szél., hossz., kiemelt (községközpont / nagy település)]
// Forrás: baza-de-date-localitati-romania (koordináták, public domain); magyar nevek: adatok/kesz/telepulesek/hargita_falvak.csv
var FALVAK_ADAT = [
  ["Csiba", 46.38005, 25.74652, 0],
  ["Hargitafürdő", 46.37934, 25.63209, 0],
  ["Zsögödfürdő", 46.33937, 25.80886, 0],
  ["Tusnádfürdő", 46.14608, 25.85696, 1],
  ["Kárpitusz", 46.12191, 25.85528, 0],
  ["Balánbánya", 46.65858, 25.80767, 1],
  ["Borszék", 46.97028, 25.55979, 1],
  ["Székelykeresztúr", 46.29245, 25.03171, 1],
  ["Fiatfalva", 46.26932, 25.0161, 0],
  ["Gyergyószentmiklós", 46.72121, 25.58553, 1],
  ["Kovácspéter", 46.72668, 25.71923, 0],
  ["Gyilkostó", 46.79383, 25.79597, 0],
  ["Vargatag", 46.7543, 25.6314, 0],
  ["Visszafolyó", 46.70328, 25.63116, 0],
  ["Székelyudvarhely", 46.305, 25.29265, 1],
  ["Maroshévíz", 46.92603, 25.3534, 1],
  ["Kelemenpatak", 46.9523, 25.33535, 0],
  ["Lunkány", 46.9124, 25.3568, 0],
  ["Magyaros", 46.9183, 25.34504, 0],
  ["Moglanyásza", 46.924, 25.38116, 0],
  ["Szeku", 46.99292, 25.48379, 0],
  ["Válya", 46.94783, 25.37617, 0],
  ["Vágány", 46.94538, 25.28786, 0],
  ["Zenkány", 46.927, 25.3341, 0],
  ["Szentegyháza", 46.3267, 25.51481, 1],
  ["Homoródfürdő", 46.34981, 25.46611, 0],
  ["Lövétei bányatelep", 46.30631, 25.50644, 0],
  ["Etéd", 46.45347, 25.04787, 1],
  ["Kőrispatak", 46.41781, 24.97037, 0],
  ["Küsmöd", 46.477, 25.04576, 0],
  ["Énlaka", 46.43097, 25.11129, 0],
  ["Siklód", 46.51702, 25.03891, 0],
  ["Szentábrahám", 46.33472, 25.00912, 1],
  ["Andrásfalva", 46.34763, 25.02218, 0],
  ["Csekefalva", 46.31468, 25.01844, 0],
  ["Firtosváralja", 46.40636, 25.09623, 0],
  ["Gagy", 46.36279, 25.02833, 0],
  ["Firtosirtvány", 46.39402, 25.04098, 0],
  ["Solymosirtvány", 46.36069, 24.98527, 0],
  ["Kismedesér", 46.3873, 25.04925, 0],
  ["Bélbor", 47.06561, 25.4864, 1],
  ["Rakottyás", 47.04428, 25.50513, 0],
  ["Fenyéd", 46.3365, 25.3625, 1],
  ["Máréfalva", 46.33963, 25.37968, 1],
  ["Küküllőkeményfalva", 46.37275, 25.35865, 0],
  ["Kápolnásfalu", 46.41047, 25.51795, 1],
  ["Csíkkarcfalva", 46.53057, 25.76154, 1],
  ["Csíkjenőfalva", 46.54404, 25.76435, 0],
  ["Csíkszenttamás", 46.55657, 25.77646, 1],
  ["Csíkszentgyörgy", 46.33427, 26.04642, 1],
  ["Csíkménaság", 46.35372, 25.96132, 0],
  ["Ménaságújfalu", 46.33886, 25.97232, 0],
  ["Csíkbánkfalva", 46.30169, 25.94323, 0],
  ["Csobányos", 46.3852, 26.1667, 0],
  ["Kotormány", 46.30443, 25.90822, 0],
  ["Egerszék", 46.33367, 26.06728, 0],
  ["Gyürke", 46.30534, 26.06507, 0],
  ["Pottyond", 46.36324, 25.95121, 0],
  ["Gyergyócsomafalva", 46.68, 25.51945, 1],
  ["Gyergyóholló", 47.04217, 25.6825, 1],
  ["Hollósarka", 46.99851, 25.64251, 0],
  ["Korond", 46.4716, 25.18373, 1],
  ["Atyha", 46.48621, 25.12689, 0],
  ["Kalonda", 46.4436, 25.2176, 0],
  ["Fenyőkút", 46.4817, 25.24977, 0],
  ["Pálpataka", 46.51093, 25.21271, 0],
  ["Csíkkozmás", 46.20046, 25.96463, 1],
  ["Csíklázárfalva", 46.18822, 25.9466, 0],
  ["Csíkdánfalva", 46.51581, 25.7534, 1],
  ["Csíkmadaras", 46.4932, 25.74583, 1],
  ["Székelyderzs", 46.20782, 25.16464, 1],
  ["Székelymuzsna", 46.2053, 25.14825, 0],
  ["Oroszhegy", 46.39592, 25.30393, 1],
  ["Székelyfancsal", 46.3687, 25.29732, 0],
  ["Székelyszentkirály", 46.36567, 25.32369, 0],
  ["Székelyszenttamás", 46.34794, 25.28776, 0],
  ["Tibód", 46.34817, 25.31115, 0],
  ["Ülke", 46.35615, 25.28545, 0],
  ["Üknyéd", 46.407, 25.3274, 0],
  ["Ditró", 46.81075, 25.50144, 1],
  ["Orotva", 46.85936, 25.50901, 0],
  ["Cengellér", 46.86847, 25.5495, 0],
  ["Felsőboldogfalva", 46.33098, 25.24857, 1],
  ["Sándortelke", 46.23463, 25.31333, 0],
  ["Árvátfalva", 46.26846, 25.30515, 0],
  ["Cseresznyés", 46.32337, 25.20217, 0],
  ["Farcád", 46.30709, 25.23608, 0],
  ["Hodgya", 46.28555, 25.24892, 0],
  ["Ocfalva", 46.25925, 25.25222, 0],
  ["Székelylengyelfalva", 46.33527, 25.24659, 0],
  ["Bikafalva", 46.26832, 25.25978, 0],
  ["Telekfalva", 46.24479, 25.31893, 0],
  ["Patakfalva", 46.26759, 25.33047, 0],
  ["Csíkszépvíz", 46.45484, 25.85151, 1],
  ["Csíkborzsova", 46.43146, 25.82068, 0],
  ["Bükklok", 46.46272, 25.95419, 0],
  ["Csíkszentmiklós", 46.43947, 25.84069, 0],
  ["Galócás", 46.89358, 25.39214, 1],
  ["Örményesmező", 46.89127, 25.39916, 0],
  ["Galócáspatak", 46.89734, 25.38446, 0],
  ["Nucény", 46.92043, 25.3962, 0],
  ["Plopis", 46.91324, 25.38014, 0],
  ["Preluka", 46.88862, 25.35572, 0],
  ["Tolesény", 46.9174, 25.40355, 0],
  ["Zapogya", 46.89864, 25.35706, 0],
  ["Gyergyóalfalu", 46.69893, 25.50491, 1],
  ["Borzont", 46.69174, 25.44298, 0],
  ["Bucsin", 46.68896, 25.42352, 0],
  ["Gyergyószárhegy", 46.7586, 25.5252, 1],
  ["Gyűdüc", 46.77845, 25.53398, 0],
  ["Lövéte", 46.27473, 25.49144, 1],
  ["Kirulyfürdő", 46.29548, 25.57594, 0],
  ["Gyimesközéplok", 46.64455, 25.95618, 1],
  ["Barackos", 46.63673, 25.9804, 0],
  ["Bükkhavaspatak", 46.644, 25.9505, 0],
  ["Farkaspalló", 46.68909, 25.92301, 0],
  ["Borospatak", 46.54585, 25.98818, 0],
  ["Kápolnapatak", 46.55747, 25.99338, 0],
  ["Sötétpatak", 46.55929, 25.95412, 0],
  ["Hidegségpatak", 46.60711, 25.9669, 0],
  ["Antalokpataka", 46.56934, 25.96444, 0],
  ["Gyimesfelsőlok", 46.50716, 25.96989, 1],
  ["Komját", 46.51479, 25.95173, 0],
  ["Tatrosforrás", 46.49405, 25.94175, 0],
  ["Csíkpálfalvi tető", 46.54291, 25.96583, 0],
  ["Görbepatak", 46.53516, 25.93676, 0],
  ["Ugrapatak", 46.52349, 25.9848, 0],
  ["Farkaslaka", 46.37906, 25.22349, 1],
  ["Székelyszentlélek", 46.36449, 25.24196, 0],
  ["Bogárfalva", 46.36745, 25.25382, 0],
  ["Firtosmartonos", 46.42633, 25.15021, 0],
  ["Nyikómalomfalva", 46.35713, 25.21891, 0],
  ["Kecset", 46.38637, 25.19514, 0],
  ["Pálfalva", 46.42643, 25.18252, 0],
  ["Kecsetkisfalud", 46.37109, 25.19484, 0],
  ["Szencsed", 46.47642, 25.29934, 0],
  ["Homoródszentmárton", 46.28217, 25.41178, 1],
  ["Abásfalva", 46.25229, 25.43273, 0],
  ["Bágy", 46.21769, 25.34451, 0],
  ["Homoródremete", 46.29265, 25.4026, 0],
  ["Kénos", 46.25668, 25.36038, 0],
  ["Homoródkeményfalva", 46.26492, 25.43871, 0],
  ["Gyepes", 46.26426, 25.40382, 0],
  ["Lókod", 46.24119, 25.35574, 0],
  ["Városfalva", 46.16279, 25.36376, 0],
  ["Homoródszentpéter", 46.1767, 25.37495, 0],
  ["Recsenyéd", 46.20622, 25.38489, 0],
  ["Homoródszentpál", 46.19178, 25.38124, 0],
  ["Homoródalmás", 46.22384, 25.48523, 1],
  ["Csíkszentmihály", 46.47325, 25.82854, 1],
  ["Lóvész", 46.52582, 25.86115, 0],
  ["Ajnád", 46.49648, 25.83881, 0],
  ["Vacsárcsi", 46.46346, 25.79457, 0],
  ["Bögöz", 46.25704, 25.22101, 1],
  ["Mogyorós", 46.26377, 25.18421, 0],
  ["Béta", 46.27898, 25.22263, 0],
  ["Betfalva", 46.28941, 25.08296, 0],
  ["Décsfalva", 46.25506, 25.17651, 0],
  ["Dobó", 46.28688, 25.18087, 0],
  ["Agyagfalva", 46.24496, 25.18556, 0],
  ["Mátisfalva", 46.23508, 25.16523, 0],
  ["Nagygalambfalva", 46.27501, 25.13359, 0],
  ["Kisgalambfalva", 46.27203, 25.10274, 0],
  ["Irtásfalva", 46.29755, 25.19794, 0],
  ["Homoródoklánd", 46.1625, 25.44286, 1],
  ["Homoródkarácsonyfalva", 46.18394, 25.4331, 0],
  ["Homoródújfalu", 46.14541, 25.41554, 0],
  ["Csíkpálfalva", 46.39484, 25.8341, 1],
  ["Csíkdelne", 46.41211, 25.82639, 0],
  ["Csíkcsomortán", 46.395, 25.85464, 0],
  ["Kászonaltíz", 46.22942, 26.13959, 1],
  ["Kászonújfalu", 46.19588, 26.05167, 0],
  ["Kászonjakabfalva", 46.20069, 26.10527, 0],
  ["Kászonimpér", 46.21836, 26.1063, 0],
  ["Kászonfeltíz", 46.23604, 26.10733, 0],
  ["Parajd", 46.55534, 25.12727, 1],
  ["Békás", 46.51493, 25.19023, 0],
  ["Bucsin", 46.5735, 25.2049, 0],
  ["Alsósófalva", 46.52469, 25.12674, 0],
  ["Felsősófalva", 46.52424, 25.15053, 0],
  ["Sásverés", 46.5703, 25.0857, 0],
  ["Gyergyóremete", 46.7963, 25.44266, 1],
  ["Bükkhavas", 46.83562, 25.38303, 1],
  ["Martonka", 46.82887, 25.42924, 0],
  ["Csinód", 46.81442, 25.41802, 0],
  ["Székelyandrásfalva", 46.34842, 24.91176, 1],
  ["Nagysolymos", 46.34713, 24.92557, 0],
  ["Kissolymos", 46.33838, 24.96046, 0],
  ["Székelyújlak", 46.30966, 24.87126, 0],
  ["Székelyvidacs", 46.33592, 24.89414, 0],
  ["Salamás", 46.87998, 25.45494, 1],
  ["Fundoja", 46.88524, 25.46595, 0],
  ["Hodos", 46.86798, 25.44555, 0],
  ["Platonyásza", 46.90664, 25.41891, 0],
  ["Runk", 46.88989, 25.44154, 0],
  ["Csíkszentkirály", 46.30121, 25.80241, 1],
  ["Fitód", 46.35792, 25.84617, 0],
  ["Hosszúaszó", 46.34354, 25.90553, 0],
  ["Csíkszentlélek", 46.33604, 25.85446, 1],
  ["Csíkmindszent", 46.32806, 25.88742, 0],
  ["Csíkszentimre", 46.28401, 25.86296, 1],
  ["Büdösfürdő", 46.27182, 25.75977, 0],
  ["Csíkszentdomokos", 46.57905, 25.79003, 1],
  ["Csíkszentmárton", 46.26622, 25.93937, 1],
  ["Csíkcsekefalva", 46.2548, 25.94641, 0],
  ["Úzvölgye", 46.34227, 26.24817, 0],
  ["Csíkszentsimon", 46.25786, 25.88635, 1],
  ["Csíkvárdotfalva", 46.24128, 25.89665, 0],
  ["Újszékely", 46.26084, 24.97319, 1],
  ["Bodogája", 46.27391, 24.99639, 0],
  ["Székelyszenterzsébet", 46.29053, 24.9359, 0],
  ["Madéfalva", 46.43748, 25.75315, 1],
  ["Csaracsó", 46.41219, 25.74756, 0],
  ["Csíkcsicsó", 46.41047, 25.77999, 1],
  ["Csíkrákos", 46.45157, 25.75862, 1],
  ["Göröcsfalva", 46.45496, 25.77921, 0],
  ["Gyergyóvárhegy", 46.85546, 25.42748, 1],
  ["Kalnács", 46.85394, 25.3657, 0],
  ["Duda", 46.8465, 25.41076, 0],
  ["Fülpe", 46.87953, 25.4105, 0],
  ["Gyergyóújfalu", 46.66629, 25.55531, 1],
  ["Kilyénfalva", 46.67953, 25.57004, 0],
  ["Libánfalva", 46.54525, 25.50977, 0],
  ["Szenetea", 46.6262, 25.5883, 0],
  ["Gyergyótekerőpatak", 46.69603, 25.59812, 0],
  ["Siménfalva", 46.35661, 25.0958, 1],
  ["Bencéd", 46.3769, 25.17013, 0],
  ["Nagykadács", 46.3542, 25.13069, 0],
  ["Kiskadács", 46.34659, 25.11953, 0],
  ["Csehétfalva", 46.39875, 25.14239, 0],
  ["Nagykede", 46.33548, 25.04691, 0],
  ["Kiskede", 46.34166, 25.05871, 0],
  ["Kobátfalva", 46.35711, 25.14549, 0],
  ["Nagymedesér", 46.36057, 25.07341, 0],
  ["Székelymihályfalva", 46.36008, 25.17643, 0],
  ["Székelyszentmiklós", 46.33903, 25.08634, 0],
  ["Rugonfalva", 46.30416, 25.07172, 0],
  ["Tarcsafalva", 46.37586, 25.13094, 0],
  ["Tordátfalva", 46.38098, 25.10359, 0],
  ["Gyergyótölgyes", 46.92569, 25.73513, 1],
  ["Hágótő", 46.87673, 25.68273, 0],
  ["Pintic", 46.96668, 25.83159, 0],
  ["Recsástelep", 46.89796, 25.7238, 0],
  ["Csíktusnád", 46.14608, 25.85696, 1],
  ["Újtusnád", 46.19381, 25.89723, 0],
  ["Verebes", 46.22327, 25.90759, 0],
  ["Kányád", 46.19979, 25.28539, 1],
  ["Székelydálya", 46.19371, 25.30573, 0],
  ["Jásfalva", 46.20939, 25.25683, 0],
  ["Ége", 46.20441, 25.28473, 0],
  ["Miklósfalva", 46.24143, 25.25748, 0],
  ["Abránfalva", 46.22835, 25.29131, 0],
  ["Petek", 46.17252, 25.23355, 0],
  ["Vasilén", 46.22805, 25.27095, 0],
  ["Székelyvarság", 46.50907, 25.37281, 1],
  ["Vasláb", 46.64607, 25.62371, 1],
  ["Marosfő", 46.62746, 25.71206, 0],
  ["Zetelaka", 46.39103, 25.36793, 1],
  ["Deság", 46.43337, 25.44865, 0],
  ["Ivó", 46.46238, 25.45604, 0],
  ["Küküllőmező", 46.50797, 25.39101, 0],
  ["Zetevárallja", 46.4416, 25.39778, 0],
  ["Sikaszó", 46.51432, 25.45891, 0],
  ["Csíkszereda", 46.36956, 25.79537, 1]
];
var falvak = ee.FeatureCollection(FALVAK_ADAT.map(function (f) {
  return ee.Feature(ee.Geometry.Point([f[2], f[1]]), {nev: f[0], kiemelt: f[3]});
}));
var szoveg = require('users/gena/packages:text');
var EKEZET_CSERE = false;   // ha az ő/ű betű hibásan jelenik meg: true → ö/ü
if (EKEZET_CSERE) {
  falvak = falvak.map(function (f) {
    return f.set('nev', ee.String(f.get('nev')).replace('ő', 'ö', 'g').replace('Ő', 'Ö', 'g')
                                                 .replace('ű', 'ü', 'g').replace('Ű', 'Ü', 'g'));
  });
}

function beepitettKep(zoom, ter) {
  if (zoom >= EPULET_ZOOM) {
    return ee.Image().byte().paint(EPULETEK.filterBounds(ter), 1).clip(ter)
      .visualize({palette: ['ff7a00']});
  }
  return beepitettFolt.clip(ter).visualize({palette: ['ff7a00'], opacity: 0.85});
}
function nevekKep(zoom) {
  if (zoom < 9) { return ee.Image(); }
  var leptek = 156543.03 * Math.cos(46.4 * Math.PI / 180) / Math.pow(2, zoom);   // m / képpont
  var mit = zoom >= 12 ? falvak : falvak.filter(ee.Filter.eq('kiemelt', 1));
  var beall = {fontSize: zoom >= 12 ? 18 : 16, textColor: 'ffffff', outlineColor: '000000',
               outlineWidth: 2.5, outlineOpacity: 0.8, alignX: 'center', alignY: 'center'};
  return ee.ImageCollection(mit.map(function (f) {
    return szoveg.draw(f.get('nev'), f.geometry(), leptek, beall);
  })).mosaic();
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
bal.onChangeZoom(function (z) {
  // csak akkor számolunk újra, ha átlépünk egy küszöböt (9, 12, 14) vagy változik a lépték
  if (z !== zoomElozo) { zoomElozo = z; telepulesRetegek(); }
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
panel.add(ui.Label('Megyei nézetben a községközpontok, közelebb (12. nagyítástól) minden falu.',
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
