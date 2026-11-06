# Hargita megye települései

| Fájl | Mi van benne |
|---|---|
| `hargita_telepulesek_nevek.csv` | **Névlista** (Szász F. Zsolt gyűjtése, 2026-11-06): román és magyar név, rang (városközpont / községközpont / falu), közigazgatási egység. Ez a hiteles névforrás. |
| `hargita_falvak.csv` | Összevont tábla a T02 app „Településnevek” rétegéhez: a névlista nevei + koordináták és népesség. 264 település. |

- **Koordináták, népesség:** [baza-de-date-localitati-romania](https://github.com/catalin87/baza-de-date-localitati-romania) (public domain; Google Maps-koordináták). Fenyéd pontját kézzel javítottuk.
- A térképen a magyar név első alakja szerepel; a zárójeles változatok (pl. „Csíkkozmás (Kozmás)”) a `megjegyzes` oszlopban vannak.
- Kárpitusz (Carpitus, Tusnádfürdő) nincs a névlistában, a nevét Claude adta.
- `kiemelt = 1`: város- vagy községközpont, illetve 2500 főnél népesebb; ezek megyei nézetben is látszanak.
- Ha a névlista változik: a `hargita_falvak.csv` újragenerálása, majd az appban a `FALVAK_ADAT` lista cseréje.
