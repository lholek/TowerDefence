// abilities/LavaFloor.js
import Ability from './Ability.js';

export default class LavaFloor extends Ability {
  constructor(game, config = {}) {
    super(game, config);
    // additional lava-specific options
    this.damageEvery = config.damage_every || 500; // ms between ticks while standing on tile
  }

  // override activation
  activate(tileList) {
    this.lastUsedAt = performance.now();

    const now = performance.now();
    for (const t of tileList) {
      const inst = {
        tile: t,
        startAt: now,
        expiresAt: now + this.effectDuration,
        lastTick: now,
        onTick: (time) => {
          // apply damage to enemies that are currently on this tile
          for (const enemy of this.game.enemies) {
            // convert enemy world pos to tile
            const et = this.game.map.getTileFromCoords(enemy.x, enemy.y);
            if (et.col === t.col && et.row === t.row) {
              enemy.health -= this.damage;
              // optionally trigger any death bookkeeping in Game.update (enemy removal will happen there)
            }
          }
          // schedule next tick by updating lastTick
          inst.lastTick = time;
        },
        // optional onEnd hook if you want cleanup visuals
        onEnd: () => { /* nothing for now */ }
      };

      // first immediate damage when placed:
      for (const enemy of this.game.enemies) {
        const et = this.game.map.getTileFromCoords(enemy.x, enemy.y);
        if (et.col === t.col && et.row === t.row) {
          enemy.health -= this.damage;
        }
      }

      // push to activeInstances
      this.activeInstances.push(inst);
    }
  }

  update(deltaTime) {
    const now = performance.now();
    // tick logic: for each instance, if damageEvery elapsed, call onTick
    for (const inst of this.activeInstances) {
      if ((now - inst.lastTick) >= this.damageEvery) {
        if (typeof inst.onTick === 'function') inst.onTick(now);
      }
    }
    // filter expired
    this.activeInstances = this.activeInstances.filter(i => i.expiresAt > now);
  }

  render(ctx) {
    // show lava tiles as semi-transparent red overlay
    if (this.activeInstances.length === 0 && !this.isPlacing && this.pendingSelections.length === 0) return;
    this.game.map.applyCameraTransform(ctx);

    // active lava
    ctx.fillStyle = this.color || 'rgba(255,80,0,0.4)';
    for (const inst of this.activeInstances) {
      const center = this.game.map.tileToWorld(inst.tile.col, inst.tile.row);
      ctx.fillRect(center.x - this.game.map.tileSize/2, center.y - this.game.map.tileSize/2, this.game.map.tileSize, this.game.map.tileSize);
    }

    // pending selections highlight (darker)
    if (this.isPlacing && this.pendingSelections.length) {
      ctx.fillStyle = this.color || 'rgba(255,80,0,0.25)';
      for (const t of this.pendingSelections) {
        const center = this.game.map.tileToWorld(t.col, t.row);
        ctx.fillRect(center.x - this.game.map.tileSize/2, center.y - this.game.map.tileSize/2, this.game.map.tileSize, this.game.map.tileSize);
      }
    }

    this.game.map.resetTransform(ctx);
  }
}
