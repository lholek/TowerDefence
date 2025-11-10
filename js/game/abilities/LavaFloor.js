// Replace in abilities/LavaFloor.js (add these methods)
import Ability from './Ability.js';

export default class LavaFloor extends Ability {
  constructor(game, config = {}) {
    super(game, config);
    this.damageEvery = config.damage_every || 500;
    this.selectionCount = config.selectionCount || config.selection_count || config.count || 3;
  }

  // compute centered tile list along map.path
  _getCenteredPathTiles(centerTile, count) {
    const map = this.game?.map;
    if (!map) return [];
    
    // Collect candidate path arrays (support legacy single path + new multiple paths)
    let candidatePaths = [];
    
    if (Array.isArray(map.path)) {
      candidatePaths.push(map.path);
    }
  
    if (map.paths && typeof map.paths === 'object') {
      // map.paths is an object like { S1: [{col,row}, ...], S2: [...] }
      candidatePaths = candidatePaths.concat(Object.values(map.paths));
    }
  
    // Nothing to search
    if (candidatePaths.length === 0) return [];
  
    // Normalizer: turn an entry into {col,row}
    const normalizePath = (p) => {
      return p.map(node => {
        if (!node) return null;
        if (typeof node.col === 'number' && typeof node.row === 'number') return { col: node.col, row: node.row };
        if (typeof node.x === 'number' && typeof node.y === 'number') return { col: node.x, row: node.y };
        // fallback: try r/c or c/r
        if (typeof node.r === 'number' && typeof node.c === 'number') return { col: node.c, row: node.r };
        return null;
      });
    };
  
    // find the path that contains centerTile
    for (const rawPath of candidatePaths) {
      if (!Array.isArray(rawPath) || rawPath.length === 0) continue;
      const path = normalizePath(rawPath);
    
      const idx = path.findIndex(n => n && n.col === centerTile.col && n.row === centerTile.row);
      if (idx === -1) continue;
    
      // calculate centered window
      const half = Math.floor(count / 2);
      let start = idx - half;
      let end = start + count - 1;
    
      // clamp to path bounds
      if (start < 0) {
        start = 0;
        end = Math.min(count - 1, path.length - 1);
      }
      if (end > path.length - 1) {
        end = path.length - 1;
        start = Math.max(0, end - (count - 1));
      }
    
      const tiles = [];
      for (let i = start; i <= end; i++) {
        const n = path[i];
        if (n) tiles.push({ col: n.col, row: n.row });
      }
      return tiles;
    }
  
    // not on any path
    return [];
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
    this.game.map.applyCameraTransform(ctx);

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

    this.game.map.resetTransform(ctx);
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
