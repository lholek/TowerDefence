// js/level_editor/editor_map_preview.js
//
// Collapsible "Map Preview" panel (fixed top-right — see #mapPreviewPanel in
// level_editor.html) showing the same colored-by-terrain minimap used on the
// game's own map-selection screen (see renderMinimap() in js/game/main.js),
// just scaled up slightly to fit its own corner of the editor.
//
// renderMapPreview() redraws the grid from the current layout — call it after
// any edit that could change the layout. Wired up in json_functions.js's
// central modifyJson()/updateMapFromEditor(), not per-mousemove, so this never
// redraws during a live brush-drag — only once per committed change, exactly
// like the game's own preview only redraws when you pick a different map.
//
// highlightPath(key) lets other modules (the Wave editor's path autocomplete)
// light up one specific "S1E2"-style route in green on demand, e.g. on
// hover/focus of the enemy Path field.

import { currentLevelData } from './level_data.js';

let gridEl = null;
let currentCells = []; // flat array of { el, tile }, row-major, matches the last render
let cols = 0;

function getLayout() {
    return currentLevelData?.maps?.[0]?.layout || null;
}

/**
 * Simple BFS pathfinder over the map's path tiles (O / O[SND] / O[SNW] / S# / E#).
 * Mirrors Map.js's findPathBFS, kept as its own small copy here so this panel
 * has no dependency on the much heavier GameMap canvas instance.
 */
function findPathBFS(layout, start, end) {
    const rowsCount = layout.length;
    const colsCount = layout[0].length;
    const inBounds = (r, c) => r >= 0 && r < rowsCount && c >= 0 && c < colsCount;
    const isWalkable = (r, c) => /^(O|O\[SNW\]|O\[SND\])$|^[SE]\d+$/.test(String(layout[r][c] ?? ''));

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // [deltaCol, deltaRow]
    const seen = Array.from({ length: rowsCount }, () => Array(colsCount).fill(false));
    const prev = Array.from({ length: rowsCount }, () => Array(colsCount).fill(null));
    const queue = [{ r: start.row, c: start.col }];
    seen[start.row][start.col] = true;

    while (queue.length) {
        const cur = queue.shift();
        if (cur.r === end.row && cur.c === end.col) break;
        for (const [dc, dr] of dirs) {
            const nr = cur.r + dr, nc = cur.c + dc;
            if (!inBounds(nr, nc) || seen[nr][nc] || !isWalkable(nr, nc)) continue;
            seen[nr][nc] = true;
            prev[nr][nc] = cur;
            queue.push({ r: nr, c: nc });
        }
    }

    if (!seen[end.row][end.col]) return null;

    const path = [];
    let cur = { r: end.row, c: end.col };
    while (cur) {
        path.push(cur);
        cur = prev[cur.r][cur.c];
    }
    return path.reverse();
}

function findMarker(layout, key) {
    for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[r].length; c++) {
            if (String(layout[r][c]) === key) return { row: r, col: c };
        }
    }
    return null;
}

/**
 * Maps a raw tile identifier to the CSS class used to color it — mirrors
 * js/game/main.js's renderMinimap() tile classification exactly (same class
 * names, same .minimap-tile.* colors) so both previews look identical.
 */
function classifyTile(tileIdentifier) {
    if (/^(O|S\d+|E\d+)$/.test(tileIdentifier)) return 'path';

    switch (tileIdentifier) {
        case '-': return 'sky';
        case 'W': return 'water';
        case 'M': return 'mountain';
        case 'SND':
        case 'SND[BONE-1]':
        case 'SND[BONE-2]':
        case 'SND[BONE-3]':
        case 'SND[BONE-4]': return 'sand';
        case 'SNW': return 'snow';
        case 'SNW[SPIKE-1]':
        case 'SNW[SPIKE-2]':
        case 'SNW[SPIKE-3]':
        case 'SNW[SPIKE-4]': return 'snw-spike';
        case 'HLG': return 'holy';
        case 'BRG': return 'burned';
        case 'X[Tree]':
        case 'X[CutTree]': return 'tree';
        case 'SNW[Tree]':
        case 'SNW[CutTree]': return 'snow-tree';
        case 'X[Log-1]':
        case 'X[Log-2]': return 'log';
        case 'X[Well]': return 'well';
        case 'X[Bush]': return 'bush';
        case 'X[Dirt]': return 'dirt';
        case 'X[Hay]': return 'hay';
        case 'W[Rock-1]':
        case 'W[Rock-2]':
        case 'W[Rock-3]':
        case 'W[Rock-4]': return 'water';
        case 'O[SND]':
        case 'O[SNW]': return 'path';
        case 'ICE': return 'ice';
        case 'LAVA': return 'lava';
        default: return 'block';
    }
}

/**
 * (Re)draws the Map Preview grid from the current map layout. Safe to call
 * even before the panel exists in the DOM yet (no-op until it does).
 */
export function renderMapPreview() {
    if (!gridEl) gridEl = document.getElementById('mapPreviewMinimap');
    if (!gridEl) return;

    const layout = getLayout();
    if (!layout || !layout.length || !layout[0].length) {
        gridEl.innerHTML = '';
        return;
    }

    const rows = layout.length;
    cols = layout[0].length;
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    gridEl.style.aspectRatio = `${cols} / ${rows}`;
    gridEl.innerHTML = '';
    currentCells = [];

    const fragment = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = String(layout[r][c] ?? '-');
            const cell = document.createElement('div');
            cell.className = `minimap-tile ${classifyTile(tile)}`;
            fragment.appendChild(cell);
            currentCells.push({ el: cell, tile });
        }
    }
    gridEl.appendChild(fragment);
}

/**
 * Highlights one S#E# route (e.g. "S1E2") in green by lighting up the BFS
 * path between them on top of the already-rendered grid. Clears any previous
 * highlight first. No-op (just clears) if the key doesn't parse or no path
 * exists between the two points.
 */
export function highlightPath(pathKey) {
    clearHighlight();
    if (!gridEl || !pathKey || !currentCells.length) return;

    const match = /^(S\d+)(E\d+)$/.exec(String(pathKey).trim());
    if (!match) return;

    const layout = getLayout();
    if (!layout || !layout.length) return;

    const start = findMarker(layout, match[1]);
    const end = findMarker(layout, match[2]);
    if (!start || !end) return;

    const route = findPathBFS(layout, start, end);
    if (!route) return;

    route.forEach(({ r, c }) => {
        const cell = currentCells[r * cols + c];
        if (cell) cell.el.classList.add('route-highlight');
    });
}

/** Clears any active highlightPath() overlay. */
export function clearHighlight() {
    currentCells.forEach(({ el }) => el.classList.remove('route-highlight'));
}
