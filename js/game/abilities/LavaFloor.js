// Replace in abilities/LavaFloor.js (add these methods)
import Ability from './Ability.js';

export default class LavaFloor extends Ability {
  constructor(game, config = {}) {
    super(game, config);
    this.damageEvery = config.damage_every || 500;
    this.selectionCount = config.selectionCount || config.selection_count || config.count || 3;
  }

/**
 * Finds the 'count' closest path-block tiles ('O' tiles) to the centerTile on the map grid.
 * NOTE: This implementation ignores map path sequences and uses Manhattan distance 
 * to find the closest tiles marked 'O' in the map's grid data (map.tiles).
 * * @param {{col: number, row: number}} centerTile - The tile to center the search on.
 * @param {number} count - The number of closest tiles to return.
 * @returns {Array<{col: number, row: number}>} An array of the closest 'count' path-block tiles.
 */
_getCenteredPathTiles(centerTile, count) {
    // 1. Setup and Input Validation
    if (!this.game || !this.game.map || !centerTile || count <= 0) {
        return [];
    }
    
    // FIX: Use 'this.game.map.grid' to access the tile layout
    const mapGrid = this.game.map.grid;
    
    if (!mapGrid || !Array.isArray(mapGrid) || mapGrid.length === 0) {
        return [];
    }

    const maxRows = mapGrid.length;
    // Safety check for empty rows
    if (maxRows === 0 || mapGrid[0].length === 0) return [];
    const maxCols = mapGrid[0].length;
    
    const { col: startCol, row: startRow } = centerTile;

    // Check if the centerTile is within bounds and is a path block ('O')
    if (startRow < 0 || startRow >= maxRows || startCol < 0 || startCol >= maxCols) {
        return [];
    }
    const centerTileType = mapGrid[startRow][startCol];
    
    // If the starting tile isn't a path tile, we can't search for connected path tiles.
    // Allowing 'O', 'S', and 'E' markers to be valid start points.
    const isPathTile = ['O', 'S1', 'S2', 'E1', 'E2'].includes(centerTileType);
    if (!isPathTile) { 
        return [];
    }

    // 2. Breadth-First Search (BFS) for Connected Tiles
    
    // Queue for BFS: stores { col, row }
    const queue = [{ col: startCol, row: startRow }];
    // Set to track visited tiles
    const visited = new Set();
    visited.add(`${startCol},${startRow}`);
    
    // Array to store the connected 'O' tiles found
    const connectedTiles = [];
    
    // Direction vectors (Up, Down, Left, Right)
    const directions = [
        { dc: 0, dr: -1 }, 
        { dc: 0, dr: 1 }, 
        { dc: -1, dr: 0 }, 
        { dc: 1, dr: 0 }
    ];

    while (queue.length > 0 && connectedTiles.length < count) {
        const { col, row } = queue.shift();
        
        // Only add pure 'O' tiles to the result set. 
        if (mapGrid[row][col] === 'O') {
            connectedTiles.push({ col, row });
        }
        
        // Explore neighbors
        for (const dir of directions) {
            const nextCol = col + dir.dc;
            const nextRow = row + dir.dr;
            const nextKey = `${nextCol},${nextRow}`;

            // Check Bounds and ensure tile hasn't been visited
            if (
                nextRow >= 0 && nextRow < maxRows &&
                nextCol >= 0 && nextCol < maxCols &&
                !visited.has(nextKey)
            ) {
                const tileType = mapGrid[nextRow][nextCol];
                // Only queue it if it is a path block or a start/end marker
                const isNextPathTile = ['O', 'S1', 'S2', 'E1', 'E2'].includes(tileType);
                if (isNextPathTile) {
                    visited.add(nextKey);
                    queue.push({ col: nextCol, row: nextRow });
                }
            }
        }
    }
    
    // 3. Return the connected tiles found
    return connectedTiles;
}

  // override to handle placement click (we expect tile coords)
  handleCanvasClick(worldX, worldY) {
    // compute tile clicked (world coords -> tile)
    const tile = this.game.map.getTileFromCoords(worldX, worldY);

    // require path tile
    const tiles = this._getCenteredPathTiles(tile, this.selectionCount);
    if (!tiles || tiles.length === 0) {
      this.game.logEvent('Ability must be placed on the path (select a path tile).');
      return;
    }

    // activate ability with the computed tile list
    this.activate(tiles);
    this.isPlacing = false;
  }

  activate(tileList) {
    this.lastUsedAt = performance.now();
    const now = performance.now();

    this.remainingCooldown = this.cooldown;
    for (const t of tileList) {
      const inst = {
        tile: t,
        remainingTime: this.effectDuration,
        lastTick: now,
        onTick: (time) => {
          for (const enemy of this.game.enemies) {
            const et = this.game.map.getTileFromCoords(enemy.x, enemy.y);
            if (et.col === t.col && et.row === t.row) {
              enemy.health -= this.damage;
            }
          }
          inst.lastTick = time;
        },
        onEnd: () => {}
      };

      // immediate damage on placement
      for (const enemy of this.game.enemies) {
        const et = this.game.map.getTileFromCoords(enemy.x, enemy.y);
        if (et.col === t.col && et.row === t.row) {
          enemy.health -= this.damage;
        }
      }

      this.activeInstances.push(inst);
    }
  }

  update(deltaTime) {
    this.remainingCooldown -= deltaTime;
    const now = performance.now();
    for (const inst of this.activeInstances) {
      inst.remainingTime -= deltaTime;
      if ((now - inst.lastTick) >= this.damageEvery) {
        if (typeof inst.onTick === 'function') inst.onTick(now);
      }
    }
    this.activeInstances = this.activeInstances.filter(i => i.remainingTime > 0);
  }

  render(ctx) {
    if (this.activeInstances.length === 0 && !this.isPlacing && this.pendingSelections.length === 0) return;

    ctx.fillStyle = this.color || 'rgba(255,80,0,0.4)';
    for (const inst of this.activeInstances) {
      const center = this.game.map.tileToWorld(inst.tile.col, inst.tile.row);
      ctx.fillRect(center.x - this.game.map.tileSize/2, center.y - this.game.map.tileSize/2, this.game.map.tileSize, this.game.map.tileSize);
    }

    if (this.isPlacing && this.pendingSelections.length) {
      ctx.fillStyle = (this.color || 'rgba(255,80,0,0.25)');
      for (const t of this.pendingSelections) {
        const center = this.game.map.tileToWorld(t.col, t.row);
        ctx.fillRect(center.x - this.game.map.tileSize/2, center.y - this.game.map.tileSize/2, this.game.map.tileSize, this.game.map.tileSize);
      }
    }
  }

  // Preview: square area around target tile. radius can be set in config.radius (default 1 -> 3x3)
  getPreviewTiles(worldX, worldY, map) {
    if (!map) return [];
    const tile = map.getTileFromCoords(worldX, worldY);
    if (!tile) return [];
    // use same selection count as placement
    const count = this.selectionCount || 3;
    const tiles = this._getCenteredPathTiles(tile, count);
    // _getCenteredPathTiles returns null if tile is not on path -> return empty array
    return tiles || [];
  }
}
