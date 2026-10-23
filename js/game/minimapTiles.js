// minimapTiles.js
//
// Fills a grid element with one colored .minimap-tile per map tile (colors
// in css/ui.css). Shared by the map preview under the map select
// (renderMinimap in main.js) and the hover preview in the map browser
// (MapBrowser.js).

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
      const tileIdentifier = rowTiles[c] || 'X';
      const tile = document.createElement('div');
      tile.className = 'minimap-tile';

      // Match the identifier logic from your main.js
      const isPathTile = /^(O|S\d+|E\d+)$/.test(tileIdentifier);

      // Check the boolean condition first
      if (isPathTile) {
        tile.classList.add('path');
      } else {
        // Use switch for specific string identifiers
        switch (tileIdentifier) {
          case '-':
            tile.classList.add('sky');
            break;
          case 'W':
            tile.classList.add('water');
            break;
          case 'M':
            tile.classList.add('mountain');
            break;
          case 'SND':
          case 'SND[BONE-1]':
          case 'SND[BONE-2]':
          case 'SND[BONE-3]':
          case 'SND[BONE-4]':
            tile.classList.add('sand');
            break;
          case 'SNW':
            tile.classList.add('snow');
            break;
          case 'SNW[SPIKE-1]':
          case 'SNW[SPIKE-2]':
          case 'SNW[SPIKE-3]':
          case 'SNW[SPIKE-4]':
            tile.classList.add('snw-spike');
            break;
          case 'HLG':
            tile.classList.add('holy');
            break;
          case 'BRG':
            tile.classList.add('burned');
            break;
          case 'X[Tree]':
          case 'X[CutTree]':
            tile.classList.add('tree');
            break;
          case 'SNW[Tree]':
          case 'SNW[CutTree]':
            tile.classList.add('snow-tree');
            break;
          case 'X[Log-1]':
          case 'X[Log-2]':
            tile.classList.add('log');
            break;
          case 'X[Well]':
            tile.classList.add('well');
            break;
          case 'X[Bush]':
            tile.classList.add('bush');
            break;
          case 'X[Dirt]':
            tile.classList.add('dirt');
            break;
          case 'X[Hay]':
            tile.classList.add('hay');
            break;
          case 'W[Rock-1]':
          case 'W[Rock-2]':
          case 'W[Rock-3]':
          case 'W[Rock-4]':
            tile.classList.add('water');
            break;
          case 'O[SND]':
          case 'O[SNW]':
            tile.classList.add('path');
            break;
          case 'ICE':
            tile.classList.add('ice');
            break;
          case 'LAVA':
            tile.classList.add('lava');
            break;
          default:
            tile.classList.add('block');
            break;
        }
      }
      minimap.appendChild(tile);
    }
  }
}
