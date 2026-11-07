/* Tile picker: every tile button shows the tile itself, drawn by the game's own map code
   (js/game/Map.js) in the editor's current Graphics Low / High, instead of a coloured box
   with its name. Each tile is drawn in the middle of a small 5x5 map filled with the same
   ground (objects stand on their ground: Tree on grass, Cactus on sand, Rock in water ...),
   so roads, water and mountains look like the middle of a bigger area, then that middle
   tile is cut out (Start with its portal, End with the whole Life Tree). Air keeps its name. The name is written under each picture (and under
   the "Selected" square) and stays as the tooltip. Icons are made once per quality and
   kept, so switching Low / High back and forth is instant. */
import GameMap from '../../game/Map.js';

const TS = 80;      // the game's tile size - the button shows it scaled down
const N = 5;        // mini map N x N, the tile in the middle
const MID = (N - 1) / 2;

const style = document.createElement('style');
style.id = 'tileIconStyles';
document.head.appendChild(style);
// the picture instead of the name (the name stays as the tooltip)
const base = document.createElement('style');
base.textContent = `.dev-tile-icon{ background-size:cover !important; background-position:center !important;
    background-repeat:no-repeat !important; color:transparent !important; font-size:0 !important; text-shadow:none !important; }
.dev-tile-name{ display:block; width:100%; margin-top:-1px; color:#f3e5ab; font-size:.66rem; font-weight:700; line-height:1.15;
    text-align:center; white-space:normal; overflow-wrap:anywhere; pointer-events:none;
    text-shadow:0 1px 2px #000, 0 0 6px rgba(0,0,0,.9); }
.dev-current-wrap > .dev-tile-name{ width:70px; margin-top:3px; color:#f0c674; }
/* Air = nothing there: an empty, see-through square */
.dev-tile-icon[data-tile="-"]{ background:rgba(255,255,255,.08) !important; border-style:dashed !important; }
.tile-selector-btn.dev-tile-icon[data-tile="-"]{ border-color:rgba(255,255,255,.55) !important; }`;
document.head.appendChild(base);

const cache = {};   // graphics setting -> { type: dataURL }
const labelToType = {};

// the setting the game's map code reads (not the Graphics select - at start-up it doesn't show
// the saved value yet). Same key = same pictures.
const quality = () => {
    try {
        const g = JSON.parse(localStorage.getItem('graphicsSettings') || '{}');
        return g.terrain === 'low' ? 'low' : 'high';
    } catch { return 'high'; }
};

// what fills the mini map around the tile
function groundFor(type) {
    if (type === 'S' || type === 'E') return 'O';           // Start / End sit on a road
    const m = type.match(/^(X|SND|SNW|W)\[/);               // objects stand on their ground
    return m ? m[1] : type;
}

function layoutFor(type) {
    const ground = groundFor(type);
    const rows = [];
    for (let r = 0; r < N; r++) {
        const row = [];
        for (let c = 0; c < N; c++) row.push(ground);
        rows.push(row);
    }
    rows[MID][MID] = (type === 'S' || type === 'E') ? type + '1' : type; // the map only draws S1 / E1, not a bare S / E
    return rows;
}

// part of the mini map that becomes the icon (in tiles): the middle tile, except the tall
// Life Tree of End and the Start portal's ring, which need more room around them
const CROP = { E: { x: MID - 0.6, y: MID - 1.2, size: 2.2 }, S: { x: MID - 0.3, y: MID - 0.3, size: 1.6 } };
const LIFT = 6; // Map.js SPECIAL_TILE_VISUAL_OFFSET - Start / End are drawn a bit higher

// In the editor the game's map skips the Start portal and the End Life Tree (editor_map.js
// draws them itself) - drawn here the same way the game does (Map.js render, layer 4).
function drawStartEnd(map, ctx, type) {
    const x = MID * TS, y = MID * TS;
    if (type === 'S') {
        const low = (map.graphicsSettings.portals || 'low') === 'low';
        const fn = low ? map._drawMagicPortalLow : map._drawMagicPortalHigh;
        if (typeof fn === 'function') fn.call(map, ctx, x + TS / 2, y + TS / 2 - LIFT, 0);
    } else if (type === 'E' && map.cachedTree) {
        const img = map.cachedTree, w = img.width * 1.2, h = img.height * 1.2;
        ctx.drawImage(img, x - (w - TS) / 2, y - (h - TS) - LIFT, w, h);
    }
}
const NO_ICON = new Set(['-']); // Air draws nothing - an empty see-through square (CSS above)

function drawIcon(type) {
    if (NO_ICON.has(type)) return null;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N * TS;
    const map = new GameMap(canvas, layoutFor(type), TS, { editor: true });
    map.camera.x = 0; map.camera.y = 0; map.camera.zoom = 1;
    map.render(canvas.getContext('2d'));
    drawStartEnd(map, canvas.getContext('2d'), type);
    const out = document.createElement('canvas');
    out.width = out.height = TS;
    const c = CROP[type] || { x: MID, y: MID, size: 1 };
    out.getContext('2d').drawImage(canvas, c.x * TS, c.y * TS, c.size * TS, c.size * TS, 0, 0, TS, TS);
    return out.toDataURL('image/png');
}

const cssStr = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

function buildIcons(types) {
    const q = quality();
    const icons = cache[q] || (cache[q] = {});
    let added = false;
    for (const t of types) {
        if (icons[t] !== undefined) continue;
        try { icons[t] = drawIcon(t); } catch (err) { icons[t] = null; console.warn('tile icon', t, err); }
        added = true;
    }
    return { icons, added };
}

let shownQuality = null;
function applyStyles(icons) {
    style.textContent = Object.entries(icons).filter(([, url]) => url).map(([t, url]) =>
        `.tile-selector-btn[data-tile=${cssStr(t)}], .dev-tile-icon[data-tile=${cssStr(t)}]{ background-image:url("${url}"); }`
    ).join('\n');
    shownQuality = quality();
}

function refresh() {
    const btns = [...document.querySelectorAll('.tile-selector-btn[data-tile]')];
    btns.forEach(b => {
        const t = b.dataset.tile;
        const label = b.textContent.trim();
        if (label) labelToType[label] = t;
        if (!b.title) b.title = label;
        b.classList.add('dev-tile-icon');
        b.setAttribute('aria-label', label);
        // the name under the picture
        let name = b.nextElementSibling;
        if (!name || !name.classList.contains('dev-tile-name')) {
            name = document.createElement('span');
            name.className = 'dev-tile-name';
            b.after(name);
        }
        if (name.textContent !== label) name.textContent = label;
    });
    const { icons, added } = buildIcons(btns.map(b => b.dataset.tile));
    if (added || shownQuality !== quality()) applyStyles(icons);
    syncSelected();
}

// the "Selected" square (#currentTileDisplay + its copy in the Brush row) only knows the
// tile's name - the name -> type comes from the buttons
function syncSelected() {
    // the name under the "Selected" square
    const sel = document.getElementById('devCurrentTile');
    if (sel) {
        let name = document.getElementById('devCurrentTileName');
        if (!name) {
            name = document.createElement('span');
            name.id = 'devCurrentTileName';
            name.className = 'dev-tile-name';
            sel.after(name);
        }
        const label = sel.textContent.trim();
        if (name.textContent !== label) name.textContent = label;
    }
    for (const id of ['currentTileDisplay', 'devCurrentTile']) {
        const el = document.getElementById(id);
        if (!el) continue;
        const t = labelToType[el.textContent.trim()];
        if (t) {
            if (el.dataset.tile !== t) el.dataset.tile = t;
            el.classList.add('dev-tile-icon');
            if (el.title !== el.textContent.trim()) el.title = el.textContent.trim();
        } else {
            el.classList.remove('dev-tile-icon');
            delete el.dataset.tile;
        }
    }
}

let queued = false;
const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; refresh(); });
};

const tileKey = document.getElementById('tileKey');
if (tileKey) new MutationObserver(schedule).observe(tileKey, { childList: true, subtree: true, characterData: true });
const brushTile = document.getElementById('devCurrentTile');
if (brushTile) new MutationObserver(schedule).observe(brushTile, { childList: true, characterData: true, subtree: true });
// Graphics Low / High: main.js has already written the new setting when 'change' gets here
document.getElementById('editorGraphicsSelect')?.addEventListener('change', () => setTimeout(refresh, 0));
schedule();
window._tileIcons = cache; // for checking the icons from the console
