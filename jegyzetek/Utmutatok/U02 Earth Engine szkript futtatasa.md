# U02 – Earth Engine-szkript futtatása a Code Editorban

Ez az útmutató mindenkinek szól, aki a repó szkriptjeit ki akarja próbálni. Nem kell hozzá programozni tudni, csak egy ingyenes Earth Engine-fiók ([[U01 Regisztraciok es telepites]]).

## Egy szkript futtatása – lépésről lépésre

1. **Nyisd meg a szkriptet a GitHubon** (`szkriptek/earth-engine/…`), kattints a jobb felső **Copy raw file** ikonra (két négyzet). Így a teljes kód a vágólapra kerül.
2. **Az Earth Engine Code Editorban hozz létre ÚJ szkriptet:** bal oldalon **NEW → File**. A nevet a szkript fejlécében találod (a „Mentés új szkriptként:” sor); egyezzen a fájlnévvel, kiterjesztés nélkül (pl. `T03_export`).
3. Kattints a középső (üres) szerkesztőbe, **Ctrl+A**, **Ctrl+V** (beillesztés), majd **Ctrl+S** (mentés).
4. Nyomd meg felül a **Run** gombot. Az eredmény a jobb oldali **Console** fülön és alul a térképen jelenik meg.
5. Ha a szkript exportál (`Export.image.toAsset`), a jobb oldali **Tasks** fülön minden feladatnál kattints a **RUN** gombra, majd **OK**-ra.

## ⚠️ Gyakori hiba: egy meglévő szkript felülírása

A **Ctrl+S mindig abba a szkriptbe ment, amelyik éppen meg van nyitva.** Ha egy másik szkript kódját egy már megnyitott szkriptbe másolod be, az felülírja a korábbit.

**Így kerüld el:**
- Új szkriptnél mindig előbb **NEW → File** (új, üres szerkesztő), és csak utána másolj be.
- Mentés előtt nézd meg a szerkesztő fölötti **fülön látható nevet**: az egyezik-e a szkript nevével?
- Ha mégis felülírtad: a szkript a GitHubon megvan, onnan újra bemásolható. Az Earth Engine a korábbi változatokat is őrzi (a szkript sorában a kis óra ikon, *Revision history*).

## Egyéb tudnivalók

- Az exportált assetet (**Assets** fül → az asset → **SHARE**) nyilvánossá kell tenni (*Anyone can read*), különben a közzétett app nem látja.
- A szkriptek a projekt azonosítóját (`tidal-velocity-494919-e2`) használják. Saját fiókból futtatva cseréld a `PROJEKT` sort a saját projektedre, és az assetek (határok, mozaikok) feltöltését előbb pótolni kell – lásd a témajegyzeteket.
- Hiba esetén másold ki a Console piros hibaüzenetét, és keress rá a [[03 Buktatok es tanulsagok]] jegyzetben.
