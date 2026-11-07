// =====================================================================
// Hargita megye – T03: az exportált hőmérséklet-assetek nyilvánossá tétele
// (Anyone can read) – egy kattintással, nem kell mindegyiket kézzel megosztani.
// Mentés új szkriptként: NEW → File → név: T03_megosztas  (NE írj felül meglévőt – lásd jegyzetek/Utmutatok/U02)
// Futtatás: Run. A Console minden asset után kiírja az eredményt.
// Ha hibát ír, a megosztás kézzel is megy: Assets fül → asset → SHARE → Anyone can read.
// =====================================================================
var PROJEKT = 'projects/tidal-velocity-494919-e2/assets/';
var NAPOK = ['20140203', '20170110', '20170211', '20210121', '20260119', '20250703', '20260823'];

NAPOK.forEach(function (nap) {
  var id = PROJEKT + 'T03_st_' + nap;
  ee.data.setAssetAcl(id, {all_users_can_read: true}, function (eredmeny, hiba) {
    if (hiba) { print('HIBA – ' + id, hiba); return; }
    ee.data.getAssetAcl(id, function (acl) {
      print(id + ' → bárki olvashatja:', acl.all_users_can_read === true);
    });
  });
});
