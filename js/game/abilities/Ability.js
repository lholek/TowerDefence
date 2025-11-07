// abilities/Ability.js
export default class Ability {
  constructor(game, config = {}) {
    this.game = game;                 // reference to Game instance
    this.id = config.id || 'ability';
    this.name = config.name || 'Ability';
    this.description = config.description || '';
    this.description_text = config.description_text || '';
    this.type = config.type || 'targeted'; // 'field', 'targeted', 'global' etc.
    this.selectionCount = config.selectionCount || 1;
    this.cooldown = config.cooldown || 30000;
    this.effectDuration = config.effectDuration || 5000;
    this.color = config.color || '#ff0';
    this.ui = config.ui || {};
    this.damage = config.damage || 0;

    // runtime
    this.lastUsedAt = -Infinity;
    this.remainingCooldown = 0;
    this.activeInstances = []; // store active placed effects for this ability
    this.isPlacing = false;    // true while player selects tiles
    this.pendingSelections = []; // store selected tiles while in placing mode
  }

  available() {
    return this.remainingCooldown <= 0;
  }

  startPlacing() {
    if (!this.available()) return false;
    this.isPlacing = true;
    this.pendingSelections = [];
    return true;
  }

  cancelPlacing() {
    this.isPlacing = false;
    this.pendingSelections = [];
  }

  // called when player clicks canvas while placing
  handleCanvasClick(worldX, worldY) {
    // default: push a tile and if enough selections -> activate
    const tile = this.game.map.getTileFromCoords(worldX, worldY);
    this.pendingSelections.push(tile);
    if (this.pendingSelections.length >= this.selectionCount) {
      this.activate(this.pendingSelections.slice());
      this.pendingSelections = [];
      this.isPlacing = false;
    }
  }

  // override in subclass
  activate(tileList) {
    console.warn('Ability.activate() not implemented', this.id);
    this.lastUsedAt = performance.now();
  }

  // update active effects (called every frame)
  update(deltaTime) {
    // default: tick stored active instances and remove expired
    const now = performance.now();

    const timerEl = document.querySelector(`.ability-timer[data-ability="${this.id}"]`);
    if (timerEl) {
      const timeLeft = this.remainingCooldown;
      console.log(timeLeft);
      if (timeLeft <= 0) {
        timerEl.textContent = 'Ready';
      } else {
        timerEl.textContent = `CD: ${Math.ceil(timeLeft/1000)}s`;
      }
    }

    this.activeInstances = this.activeInstances.filter(inst => {
      if (inst.expiresAt <= now) {
        if (typeof inst.onEnd === 'function') inst.onEnd();
        return false;
      }
      if (typeof inst.onTick === 'function') inst.onTick(now);
      return true;
    });
  }

  // draw UI overlays (tile highlights, timers...) - override if want
  render(ctx) {
    // default: highlight pending selections
    if (this.isPlacing && this.pendingSelections.length) {
      this.game.map.applyCameraTransform(ctx);
      ctx.fillStyle = this.color + '55';
      for (const t of this.pendingSelections) {
        const center = this.game.map.tileToWorld(t.col, t.row);
        ctx.fillRect(center.x - this.game.map.tileSize / 2, center.y - this.game.map.tileSize / 2, this.game.map.tileSize, this.game.map.tileSize);
      }
      this.game.map.resetTransform(ctx);
    }
  }

  // Return array of preview tiles for placement preview.
  // Each item: { col, row }.
  // Subclasses (e.g. LavaFloor) should override to return affected tiles
  // when placing at world coordinates (worldX, worldY) using the map.
  getPreviewTiles(worldX, worldY, map) {
    return [];
  }
}
