# Nápady na další úpravy UI (po Beta 1.1 grafice)

Každá položka má číslo, stačí napsat třeba „uděláme 2, 5 a 9“.

- **Náročnost:** S = malá (hodina), M = střední, L = větší (víc dní, možná i nový kód hry).
- **Hra:** ✅ = jen vzhled, hratelnost se nemění · ⚠️ = mění nebo přidává herní mechaniku.

Co už je hotové: horní lišta, progress bar levelů, karty věží a abilit, přepínač Towers/Abilities/+1 Life.

---

## A) Ve hře

| # | Co | Teď | Návrh | Náročnost | Hra |
|---|----|-----|-------|---|---|
| 1 | **Pause / Return popup** (`#returnPopup`) | Starý styl, tlačítka Leave / Restart / Resume bez ikon | Stejný rám jako nové karty, ikony a klávesy (P / Esc) na tlačítkách, Leave a Restart červeně, Resume zlatě | S | ✅ |
| 2 | **Obrazovka Victory / Defeat** (`#gameEndOverlay`) | Inline barvy, emoji, čísla přes `fr-FR` | Nový panel ve stylu karet, čísla přes `groupNum` (3 018), tlačítka Restart / Menu, statistiky v mřížce s ikonami jako u věží | S–M | ✅ |
| 3 | **Indikátor „Placing: …“** (`#selectionIndicator`) | Text typu `Archer Tower(🪙100 )` | Malý štítek ve stylu tabů: ikona a barva věže, cena, nápověda „Esc / pravé tlačítko = zrušit“ | S | ✅ |
| 4 | **Info panel postavené věže** | Věž nejde rozkliknout, prodává se pravým tlačítkem bez potvrzení | Klik na věž otevře malý panel: statistiky, kolik nadělala dmg a kills, tlačítko Sell s cenou. Prodej pravým tlačítkem může zůstat | M–L | ⚠️ trochu (prodej přes panel) |
| 5 | **Log popup** (`#logPopup`) | Prostý seznam textů | Ikony podle typu (stavba, prodej, abilita, level), čas hry u každého řádku, filtr | S–M | ✅ |
| 6 | **Hudební menu v liště** (`#musicDropdown`) | Starý styl dropdownu | Sladit s novou lištou (rám, tlačítka ⏮ ⏯ ⏭, slider hlasitosti) | S | ✅ |
| 7 | **Náhled další vlny** | Hráč neví, co přijde | U progress baru malý náhled: typy nepřátel a počet. Volitelně tlačítko „Next wave now“ za bonus mince | M (náhled) / L (tlačítko) | ✅ náhled / ⚠️ tlačítko |
| 8 | **Rychlost hry** | 7 tlačítek 1x až 5x | Nechat, nebo zkrátit na 1x / 2x / 3x / 5x a přidat klávesy (třeba `+` / `-`) | S | ✅ |
| 9 | **Nápověda kláves ve hře** | Klávesy jsou jen na tabech | Klávesa `?` nebo `H` zobrazí přehled: 1–9, T, A, E, P, Esc, Shift, pravé tlačítko | S | ✅ |

## B) Hlavní menu

| # | Co | Teď | Návrh | Náročnost | Hra |
|---|----|-----|-------|---|---|
| 10 | **Tlačítka menu** (Start, Editor, Lore, Version History, Music, Settings, How to Play) | Starý styl `.btn-menu` | Sjednotit s novými taby: ikona, zlatý rám, hover jako u karet | S–M | ✅ |
| 11 | **Výběr mapy** (`#mapSelect`, Standart / Custom maps) | Rozbalovací select | Karty map s náhledem, počtem vln a obtížností, odznak „dokončeno“ a nejlepší výsledek (localStorage). Mimochodem: „Standart“ → „Standard“ | M–L | ✅ |
| 12 | **Settings** (`#settingsPopup`) | Dlouhý seznam Low/High | Záložky Graphics / Audio / Controls, presety Low / High, v Controls seznam kláves | M | ✅ |
| 13 | **How to Play / Tutorial** | Nezná nové klávesy a karty | Doplnit nové ovládání (T / A / E, 1–9) a obrázky nových karet | S | ✅ |
| 14 | **Version History popup** | Funkční, starší vzhled | Nadpisy verzí jako štítky, sekce (Editor, UI…) s ikonami, sbalitelné starší verze | S | ✅ |

## C) Celkově

| # | Co | Návrh | Náročnost | Hra |
|---|----|-------|---|---|
| 15 | **Jeden systém tlačítek** | Teď vedle sebe žijí `.btn`, `.btn-menu`, `.ui-toggle` a `.concept-tab`. Udělat jeden základ (barvy a rám v `:root`) a ten používat všude. Zjednoduší body 1, 2, 10 a 12 | M | ✅ |
| 16 | **Jednotné popupy** | Všechny popupy se stejným rámem, zavíracím křížkem a jemnou animací otevření (jen opacity a transform, kvůli FPS) | S–M | ✅ |
| 17 | **Menší rozlišení** | Teď hru blokuje `@media (max-width:1280px),(max-height:600px)` v `ui.css`. Lišta a karty už mají kompaktní verzi pro výšku 864 px. Jako minimum doporučuji 1536×864 | M | ✅ |
| 18 | **Zvuky UI** | Jemný zvuk při hoveru a kliku na karty a tlačítka, s vlastním přepínačem v Settings | S–M (potřeba zvukové soubory) | ✅ |

---

## Moje doporučení, čím začít

1. **#1 + #2 + #16** – Pause a konec hry jsou po nové liště nejvíc vidět jako „starý styl“. Je to rychlé a ničeho herního se to nedotkne.
2. **#4 Info panel věže** – největší přínos pro hráče, ale je to už i kus herní logiky.
3. **#15 Jeden systém tlačítek** – vyplatí se udělat dřív, než se začne předělávat menu (#10–#12).

Stejně jako minule můžu nejdřív udělat náhled v `dev/Graphics_1.1.html` (nebo v novém souboru) a do hry to dát až po tvém schválení.
