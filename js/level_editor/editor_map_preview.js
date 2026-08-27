// js/level_editor/editor_map_preview.js
//
// Collapsible "Map Preview" panel (stacked above the Menu panel — see
// .right-panels-stack / #mapPreviewPanel in level_editor.html) showing the
// same colored-by-terrain minimap used on the game's own map-selection screen
// (see renderMinimap() in js/game/main.js), just scaled down to fit the
// editor's fixed sidebar stack.
//
// renderMapPreview() redraws the grid from the current layout — call it after
// any edit that could change the layout. Wired up in json_functions.js's
// central modifyJson()/updateMapFromEditor(), not per-mousemove, so this never
// redraws during a live brush-drag — only once per committed change, exactly
// like the game's own preview only redraws when you pick a different map.

import { currentLevelData } from './level_data.js';

let gridEl = null;

function getLayout() {
    return currentLevelData?.maps?.[0]?.layout || null;
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
    const cols = layout[0].length;
    gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    gridEl.style.aspectRatio = `${cols} / ${rows}`;
    gridEl.innerHTML = '';

    const fragment = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = document.createElement('div');
            tile.className = `minimap-tile ${classifyTile(String(layout[r][c] ?? '-'))}`;
            fragment.appendChild(tile);
        }
    }
    gridEl.appendChild(fragment);
}
