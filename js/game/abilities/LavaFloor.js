// Replace in abilities/LavaFloor.js (add these methods)
import Ability from './Ability.js';

export default class LavaFloor extends Ability {
  constructor(game, config = {}) {
    super(game, config);
    this.id = config.configId || this.id;
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
    const isPathTile = centerTileType === 'O' || centerTileType.startsWith('S') || centerTileType.startsWith('E');
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
                const isNextPathTile = tileType === 'O' || tileType.startsWith('S') || tileType.startsWith('E');
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
      const tile = this.game.map.getTileFromCoords(worldX, worldY);
      const tiles = this._getCenteredPathTiles(tile, this.selectionCount);

      if (!tiles || tiles.length === 0) {
          this.game.logEvent('Ability must be placed on the path.');
          return false;
      }

      this.activate(tiles); 
      this.isPlacing = false;
      return true;
  }

  activate(tileList) {
    this.remainingCooldown = this.cooldown;
    const now = performance.now();

    for (const t of tileList) {
        const inst = {
            tile: t,
            durationLeft: this.effectDuration, // Use 'durationLeft' to match Ability.js
            lastTick: now,
            onTick: (currentTime) => {
                // Damage logic
                for (const enemy of this.game.enemies) {
                    const et = this.game.map.getTileFromCoords(enemy.x, enemy.y);
                    if (et.col === t.col && et.row === t.row && enemy.health > 0) {
                        const actualDmg = Math.min(enemy.health, this.damage);
                        enemy.health -= actualDmg;
                        if (this.game.stats) this.game.stats.damageDealt += actualDmg;
                    }
                }
                inst.lastTick = currentTime;
            }
        };
        this.activeInstances.push(inst);
    }

    // Trigger UI cooldown
    if (this.game.abilityManager) {
        const card = document.getElementById(this.id);
        this.game.abilityManager.notifyAbilityUsed(this, card);
    }
  }

  update(deltaTime) {
      super.update(deltaTime); // Let Ability.js handle the cooldown reduction

      const now = performance.now();
      for (const inst of this.activeInstances) {
          // Only trigger tick if enough time passed (damageEvery)
          if (now - inst.lastTick >= this.damageEvery) {
              inst.onTick(now);
          }
      }
  }

  render(ctx) {
    if (this.activeInstances.length === 0 && !this.isPlacing && this.pendingSelections.length === 0) return;

    const time = performance.now() * 0.001;
    const ts = this.game.map.tileSize;

    const drawLavaTile = (col, row, isPending = false) => {
      const center = this.game.map.tileToWorld(col, row);
      const x = center.x - ts / 2;
      const y = center.y - ts / 2;

      // --- 1. BARVY ---
      const baseColor = this.color || '#ff5000';
      const colorObj = this._parseToRGB(baseColor);
      
      // Tmavě žlutá pro hloubku (okrová/zlatavá)
      const darkYellow = { r: 180, g: 130, b: 0 }; 
      
      const formatRGBA = (rgb, a) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;

      ctx.save();
      
      // Větší transparentnost pro "skleněný/tekutý" vzhled
      ctx.globalAlpha = isPending ? 0.3 : 0.65;

      // --- 2. PROPOJENÍ (Mírný přesah pro slití políček) ---
      // Kreslíme trochu větší obdélník s velmi malým zaoblením (ne ovál)
      ctx.fillStyle = formatRGBA(this._adjustRGB(colorObj, -40), 0.8);
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, ts + 4, ts + 4, 4); 
      ctx.fill();

      // --- 3. BUBALJÍCÍ VRSTVA (Přelévání tmavě žluté a hlavní barvy) ---
      const flow = Math.sin(time * 0.5 + col * 0.2 + row * 0.3);
      const grad = ctx.createLinearGradient(x, y, x + ts, y + ts);
      grad.addColorStop(0, formatRGBA(darkYellow, 0.4));
      grad.addColorStop(0.5 + flow * 0.2, formatRGBA(colorObj, 0.2));
      grad.addColorStop(1, formatRGBA(darkYellow, 0.4));
      
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, ts, ts);

      // --- 4. SKUTEČNÉ BUBLINY ---
      // Každé políčko má své vlastní bubliny, které se nafukují
      for (let i = 0; i < 3; i++) {
        const seed = (col * 13 + row * 7 + i);
        // Rychlost a velikost bubliny
        const bTime = (time + seed) % 4; 
        if (bTime < 2) { // Bublina existuje jen polovinu cyklu
          const progress = bTime / 2; // 0 až 1
          const bx = x + ts * 0.2 + ((seed * 557) % (ts * 0.6));
          const by = y + ts * 0.2 + ((seed * 821) % (ts * 0.6));
          const radius = Math.sin(progress * Math.PI) * (ts * 0.15);

          // Stínování bubliny (tmavě žlutý okraj, světlý střed)
          const bGrad = ctx.createRadialGradient(bx - radius*0.3, by - radius*0.3, 0, bx, by, radius);
          bGrad.addColorStop(0, "rgba(255, 255, 200, 0.8)"); // Odlesk
          bGrad.addColorStop(0.4, formatRGBA(colorObj, 0.6));
          bGrad.addColorStop(1, formatRGBA(darkYellow, 0.9)); // Tmavě žlutý stín bubliny

          ctx.beginPath();
          ctx.arc(bx, by, radius, 0, Math.PI * 2);
          ctx.fillStyle = bGrad;
          ctx.fill();
          
          // Jemný odlesk na povrchu bubliny
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // --- 5. ŽHAVÉ RÝHY (Propojení) ---
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = formatRGBA(this._adjustRGB(colorObj, 20), 0.3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Náhodná čára přes políčko simulující proudění
      ctx.moveTo(x, y + ts * 0.5 + Math.sin(time + col) * 10);
      ctx.lineTo(x + ts, y + ts * 0.5 + Math.cos(time + row) * 10);
      ctx.stroke();

      ctx.restore();
    };

    // Vykreslení instancí
    for (const inst of this.activeInstances) drawLavaTile(inst.tile.col, inst.tile.row);
    if (this.isPlacing && this.pendingSelections.length) {
      for (const t of this.pendingSelections) drawLavaTile(t.col, t.row, true);
    }
  }

  // Nezapomeň mít ve třídě tyto pomocné metody z předchozího kroku:
  _parseToRGB(color) {
    if (color.startsWith('rgb')) {
      const vals = color.match(/\d+/g);
      return { r: parseInt(vals[0]), g: parseInt(vals[1]), b: parseInt(vals[2]) };
    }
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(s => s + s).join('');
    return {
      r: parseInt(hex.substring(0, 2), 16) || 0,
      g: parseInt(hex.substring(2, 4), 16) || 0,
      b: parseInt(hex.substring(4, 6), 16) || 0
    };
  }

  _adjustRGB(rgb, percent) {
    const adj = (val) => Math.max(0, Math.min(255, Math.round(val + (val * (percent / 100)))));
    return { r: adj(rgb.r), g: adj(rgb.g), b: adj(rgb.b) };
  }

  // Funkce pro výpočet odstínů (nechat ve třídě)
  _adjustBrightness(hex, percent) {
    let color = String(hex || '#ff5000').replace(/^\#/, '');
    if (color.length === 3) color = color.split('').map(c => c + c).join('');
    let r = parseInt(color.substring(0, 2), 16) || 0;
    let g = parseInt(color.substring(2, 4), 16) || 0;
    let b = parseInt(color.substring(4, 6), 16) || 0;
    const adj = (v) => Math.max(0, Math.min(255, Math.round(v + (v * (percent / 100)))));
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
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
