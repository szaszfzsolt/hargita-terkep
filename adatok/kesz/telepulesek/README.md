# Hargita megye falvai

`hargita_falvak.csv`: 264 település pontja, ezt használja a T02 app „Településnevek” rétege.

- **Koordináták, népesség:** [baza-de-date-localitati-romania](https://github.com/catalin87/baza-de-date-localitati-romania) (public domain; Google Maps-koordináták). Fenyéd (Brădeşti) pontját kézzel javítottuk; a „Porumbeni” sort kihagytuk (nem önálló falu).
- **Magyar nevek:** Claude töltötte ki. A `bizonytalan = 1` sorokat (48 db) ellenőrizni kell; javítás után az appban a `FALVAK_ADAT` listát frissíteni.
- `kozseg`: térbeli illesztéssel a községhatárokból; ahol üres, a pont a megyehatáron kívül esik (Úzvölgye, Csobányos).
- `kiemelt = 1`: községközpont vagy 2500 főnél népesebb; ezek megyei nézetben is látszanak.
- Hiányos lehet: néhány kis falu, telep nincs a forrásban.
