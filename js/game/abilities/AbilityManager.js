// abilities/AbilityManager.js
import Ability from './Ability.js';
import LavaFloor from './LavaFloor.js';

export default class AbilityManager {
  constructor(game) {
    this.game = game;
    this.abilityRegistry = {
      // id -> class
      'lava_floor': LavaFloor,
      'lava_floor_alt': LavaFloor // optional alias
    };
    this.abilities = []; // instantiated ability objects (one per config)
    this.activeAbility = null; // currently selected ability instance for placing
    this.previewTiles = [];
  }

  loadFromConfigs(configArray = []) {
    this.abilities = [];
    for (const cfg of configArray) {
      const Klass = this.abilityRegistry[cfg.id] || Ability;
      const inst = new Klass(this.game, cfg);
      this.abilities.push(inst);
    }
  }

  getAvailable() {
    return this.abilities;
  }

  // called from UI when player selects an ability to place
  selectAbilityById(id) {
    const inst = this.abilities.find(a => a.id === id);
    if (!inst) return false;
    if (!inst.available()) {
      // optionally show message to user: cooldown not ready
      this.game.logEvent(`${inst.name} is on cooldown`);
      return false;
    }
    // start placing mode
    inst.startPlacing();
    this.activeAbility = inst;

    return true;
  }

  cancelActivePlacement() {
    if (this.activeAbility) {
      this.activeAbility.cancelPlacing();
      this.activeAbility = null;
    }
  }

  // handle canvas clicks (Game should forward canvas clicks to manager when placing)
  handleCanvasClick(screenX, screenY) {
    if (!this.activeAbility || !this.activeAbility.isPlacing) return false;

    // convert to world coords using map helper
    const world = this.game.map.screenToWorld(screenX, screenY);

    // allow subclass to validate placement (e.g. lava requires path). Let subclass handle tile checks.
    // call ability's own handler (it will convert to tiles etc.)
    this.activeAbility.handleCanvasClick(world.x, world.y);

    // if ability finished placing, null it
    if (!this.activeAbility.isPlacing) {

      // notify manager that ability was used -> starts cooldown visuals
      const used = this.activeAbility;
      let abilityCard = document.getElementById(used.id);
      if (abilityCard) abilityCard.classList.remove("placing");
      this.notifyAbilityUsed(used);

      // clear preview after placemnet
      this.previewTiles = [];

      // Switch back to towers
      const towerModeBtn = document.getElementById('towerModeBtn');
      towerModeBtn.click();
      
      this.activeAbility = null;
    }
    return true;
  }

  // Call this when an ability actually activates (placement finished or instant ability effect runs).
  // This ensures cooldown visuals only start when the player used the ability.
  notifyAbilityUsed(ability) {
    if (!ability) return;
    ability._lastUsed = performance.now();
    const card = document.getElementById(ability.id);
    if (this.game && typeof this.game.startAbilityCooldownTimer === 'function') {
      this.game.startAbilityCooldownTimer(ability, card);
    }
  }

  update(deltaTime) {
    for (const a of this.abilities) a.update(deltaTime);
  }

  render(ctx) {
    for (const a of this.abilities) a.render(ctx);
  }

  // Update preview tiles based on current mouse position (screen coords).
  // Game should call this from its mousemove handler while the ability is being placed.
  updatePreview(screenX, screenY) {
    if (!this.activeAbility || !this.activeAbility.isPlacing) {
      this.previewTiles = [];
      return;
    }
    const map = this.game.map;
    if (!map) return;
    const world = map.screenToWorld(screenX, screenY);
    const tiles = typeof this.activeAbility.getPreviewTiles === 'function'
      ? this.activeAbility.getPreviewTiles(world.x, world.y, map)
      : [];
    this.previewTiles = tiles || [];
  }

  // Draw preview overlay for tiles (called from Game.render)
  renderPreview(ctx) {

    if (!this.previewTiles || this.previewTiles.length === 0) return;
    const map = this.game.map;
    if (!map) return;

     // use map's camera transform so preview aligns exactly with map/tile rendering
     if (typeof map.applyCameraTransform === 'function') map.applyCameraTransform(ctx);
     ctx.save();
     ctx.globalAlpha = 0.35;
     ctx.fillStyle = 'orange';
     ctx.strokeStyle = 'rgba(255,100,0,0.9)';
     ctx.lineWidth = 2;
     const tileSize = map.tileSize || map.tileWidth || 32;
     
     for (const t of this.previewTiles) {
       // get world center for tile (tileToWorld returns center in your LavaFloor.render)
       const center = (typeof map.tileToWorld === 'function')
         ? map.tileToWorld(t.col, t.row)
         : { x: t.col * tileSize + tileSize / 2, y: t.row * tileSize + tileSize / 2 };
       ctx.fillRect(center.x - tileSize / 2, center.y - tileSize / 2, tileSize, tileSize);
       ctx.strokeRect(center.x - tileSize / 2 + 0.5, center.y - tileSize / 2 + 0.5, tileSize - 1, tileSize - 1);
     }

     ctx.restore();
     if (typeof map.resetTransform === 'function') map.resetTransform(ctx);
  }
}
