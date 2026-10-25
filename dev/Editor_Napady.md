# Nápady na úpravy editoru map

Každá položka má číslo, stačí napsat třeba „uděláme 1, 2 a 13“.

- **Náročnost:** S = malá (hodina), M = střední, L = větší (víc dní).
- **Přínos:** ⭐⭐⭐ = ušetří nejvíc času při tvorbě map, ⭐ = spíš drobnost.

Co už je hotové: přetahování věží, abilit a skupin nepřátel (zlaté ⠿), šipky ▲ / ▼ u vln, červený rámeček u neplatné cesty (Path), nadpis a verze ve stylu hlavního menu.

Doporučené pořadí: **1 + 2 + 13** (výplň, kapátko, autosave), potom **8** (sbalení vln - hodně pomůže u velkých map jako Adventure VI).

---

## A) Kreslení mapy

| # | Co | Teď | Návrh | Náročnost | Přínos |
|---|----|-----|-------|---|---|
| 1 | **Výplň (kyblík)** | Jen štětec čtverec / kosočtverec / kruh | Klik přebarví celou souvislou oblast stejného terénu (např. celou trávu na sníh) | S–M | ⭐⭐⭐ |
| 2 | **Kapátko** | Dlaždice se hledá v dlouhém posuvném seznamu | Pravý klik (nebo Alt + klik) na políčko vybere jeho typ | S | ⭐⭐⭐ |
| 3 | **Naposledy použité dlaždice** | Vybraná dlaždice se v seznamu ztrácí | Řádek s posledními 6–8 dlaždicemi nad seznamem, klávesy 1–8 pro rychlé přepnutí | S | ⭐⭐ |
| 4 | **Čára a obdélník se Shiftem** | Vše se kreslí tahem štětce | Shift + tah nakreslí rovnou čáru / obdélník - cesty, řeky, hory po okraji | M | ⭐⭐ |
| 5 | **Nástroje u mapy** | Dlaždice a štětec jsou pod velkým plátnem, při kreslení se scrolluje | Plovoucí panel nástrojů u mapy (jako Save Slots a Menu) | M | ⭐⭐ |
| 6 | **Klávesové zkratky** | Jen Ctrl+Z / Ctrl+Y | `[` / `]` velikost štětce, mezerník + tah posun mapy, `F` výplň, `I` kapátko | S | ⭐⭐ |
| 7 | **Dlaždice jako obrázky** | Barevné obdélníky s textem (Start, Grass…) | Malý náhled skutečné textury jako na mapě - rychlejší orientace | M | ⭐ |

## B) Vlny

| # | Co | Teď | Návrh | Náročnost | Přínos |
|---|----|-----|-------|---|---|
| 8 | **Sbalit vlnu** | Jedna vlna zabírá celou obrazovku, 20 vln = dlouhý scroll | Tlačítko sbalí vlnu na jeden řádek se souhrnem (počet nepřátel, celkové HP, coiny), „Sbalit vše / Rozbalit vše“ | S–M | ⭐⭐⭐ |
| 9 | **Vložit kopii hned pod originál** | Copy přidá kopii vlny na konec seznamu | Kopie se vloží hned za kopírovanou vlnu (stejně jako u abilit) | S | ⭐⭐ |
| 10 | **Hromadná úprava vlny** | Každé pole se mění zvlášť | Např. „všem nepřátelům ve vlně +20 % HP“, „posunout First Delay o 2 s“, „Coin Reward ×1.5“ | M | ⭐⭐ |
| 11 | **Přehled obtížnosti** | U vlny je jen Total Coins | Tabulka nebo malý graf přes všechny vlny: celkové HP, zisk coinů, počet nepřátel - hned vidět skoky v obtížnosti | M | ⭐⭐ |
| 12 | **Kompaktní karty skupin** | Formulář pod sebou (Type, Skin, Count…) | Pole v řádku (Type \| Skin \| Count \| HP \| Speed \| Path) - víc skupin najednou na obrazovce | M | ⭐ |

## C) Bezpečnost dat

| # | Co | Teď | Návrh | Náročnost | Přínos |
|---|----|-----|-------|---|---|
| 13 | **Autosave + varování při odchodu** | Nic se neukládá samo; zavřením záložky nebo Main Menu se rozdělaná mapa ztratí | Automatický slot „Autosave“ v localStorage každých pár vteřin + dotaz „Máš neuložené změny“ při odchodu | S | ⭐⭐⭐ |
| 14 | **Lepší save sloty** | „Slot 1“ … „Slot 5“ | Název mapy, datum uložení a malý náhled minimapy | S–M | ⭐⭐ |
| 15 | **Popis v Undo / Redo** | Tlačítko neříká, co vrátí | Tooltip typu „Undo: Paint 12 tiles“ / „Undo: Tower 2 moved“ | S | ⭐ |

## D) Mapa a rozložení

| # | Co | Teď | Návrh | Náročnost | Přínos |
|---|----|-----|-------|---|---|
| 16 | **Živá kontrola cest** | „Validate Map Paths“ je tlačítko úplně dole | Odznak u mapy (✔ cesty OK / ⚠ S2 nemá cestu k E1), aktualizuje se při kreslení, případně zvýraznění cesty | M | ⭐⭐ |
| 17 | **Resize ze zvolené strany** | Řádky / sloupce se přidávají jen vpravo a dole | Volba strany (nahoře / dole / vlevo / vpravo) | S–M | ⭐⭐ |
| 18 | **Zrcadlení mapy** | - | Zrcadlit vodorovně / svisle pro symetrické mapy | S | ⭐ |
| 19 | **Aktivní sekce v Menu** | Všechna tlačítka v Menu jsou stejně žlutá | Zvýraznit sekci, ve které právě jsi (scroll-spy) | S | ⭐ |
| 20 | **Sjednotit styl s hrou** | Vlastní barvy (žluté záložky, zelená a modrá tlačítka) | Hnědá tlačítka a zlaté nadpisy ze hry, ať editor působí jako součást hry | M | ⭐ |

## E) Drobnosti z kódu

| # | Co | Poznámka |
|---|----|----------|
| 21 | **Duplicitní `id="waves-editor-container"`** | V `level_editor.html` jsou dva (druhý ve skrytém panelu `#waveEditorPanel`). Nic nerozbíjí, ale je to zbytečné - dá se smazat |
