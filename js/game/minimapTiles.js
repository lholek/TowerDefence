// minimapTiles.js
//
// Minimap of a map's layout, one colored tile per map tile (colors in
// css/ui.css, .minimap-tile.<type>). Shared by the map preview under the
// map select (renderMinimap in main.js -> fillMinimap) and the hover
// preview in the map browser (MapBrowser.js -> drawMinimap).

// Map tile identifier -> minimap tile type (= the CSS class with its color)
export function tileClass(tileIdentifier) {
  // Match the identifier logic from your main.js
  if (/^(O|S\d+|E\d+)$/.test(tileIdentifier)) return 'path';

  switch (tileIdentifier) {
    case '-':
      return 'sky';
    case 'W':
    case 'W[Rock-1]':
    case 'W[Rock-2]':
    case 'W[Rock-3]':
    case 'W[Rock-4]':
      return 'water';
    case 'M':
      return 'mountain';
    case 'SND':
    case 'SND[BONE-1]':
    case 'SND[BONE-2]':
    case 'SND[BONE-3]':
    case 'SND[BONE-4]':
      return 'sand';
    case 'SNW':
      return 'snow';
    case 'SNW[SPIKE-1]':
    case 'SNW[SPIKE-2]':
    case 'SNW[SPIKE-3]':
    case 'SNW[SPIKE-4]':
      return 'snw-spike';
    case 'HLG':
      return 'holy';
    case 'BRG':
      return 'burned';
    case 'X[Tree]':
    case 'X[CutTree]':
      return 'tree';
    case 'SNW[Tree]':
    case 'SNW[CutTree]':
      return 'snow-tree';
    case 'X[Log-1]':
    case 'X[Log-2]':
      return 'log';
    case 'X[Well]':
      return 'well';
    case 'X[Bush]':
      return 'bush';
    case 'X[Dirt]':
      return 'dirt';
    case 'X[Hay]':
      return 'hay';
    case 'O[SND]':
    case 'O[SNW]':
      return 'path';
    case 'ICE':
      return 'ice';
    case 'LAVA':
      return 'lava';
    default:
      return 'block';
  }
}

// DOM version: fills a grid element with one .minimap-tile div per tile.
export function fillMinimap(minimap, mapData) {
  minimap.innerHTML = '';
  if (!mapData.layout || !Array.isArray(mapData.layout)) return;

  const rows = mapData.layout.length;
  const cols = mapData.layout[0].length;

  // 2. Set grid to fill 100% of the container
  minimap.style.display = 'grid';
  minimap.style.width = '100%';
  minimap.style.height = '100%';

  // Using 1fr ensures that 45 columns or 25 rows fit exactly into the container
  minimap.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  minimap.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  for (let r = 0; r < rows; r++) {
    const rowTiles = mapData.layout[r];
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement('div');
      tile.className = 'minimap-tile ' + tileClass(rowTiles[c] || 'X');
      minimap.appendChild(tile);
    }
  }
}

// Each tile type's color, read once from the CSS (.minimap-tile.<type>
// in css/ui.css stays the only place the colors are defined).
const colorCache = new Map();
function tileColor(type) {
  if (!colorCache.has(type)) {
    const probe = document.createElement('div');
    probe.className = 'minimap-tile ' + type;
    probe.style.cssText = 'position:absolute;width:1px;height:1px;visibility:hidden';
    document.body.appendChild(probe);
    colorCache.set(type, getComputedStyle(probe).backgroundColor);
    probe.remove();
  }
  return colorCache.get(type);
}

// Canvas version: one picture, every tile exactly `cell` px - no hairline
// gaps between tiles at fractional sizes / display scaling (100+ % zoom,
// Windows 125 %...), which the div grid can show. Returns the canvas.
export function drawMinimap(mapData, cell) {
  const canvas = document.createElement('canvas');
  if (!mapData.layout || !Array.isArray(mapData.layout) || !mapData.layout.length) return canvas;

  const rows = mapData.layout.length;
  const cols = mapData.layout[0].length;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cols * cell * dpr);
  canvas.height = Math.round(rows * cell * dpr);
  canvas.style.width = cols * cell + 'px';
  canvas.style.height = rows * cell + 'px';
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  // whole device pixels per tile edge, so neighbours always touch exactly
  const edge = n => Math.round(n * cell * dpr);
  for (let r = 0; r < rows; r++) {
    const rowTiles = mapData.layout[r];
    for (let c = 0; c < cols; c++) {
      const color = tileColor(tileClass(rowTiles[c] || 'X'));
      if (color === 'rgba(0, 0, 0, 0)' || color === 'transparent') continue; // sky
      ctx.fillStyle = color;
      ctx.fillRect(edge(c), edge(r), edge(c + 1) - edge(c), edge(r + 1) - edge(r));
    }
  }
  return canvas;
}
