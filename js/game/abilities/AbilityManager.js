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
  
    const world = this.game.map.screenToWorld(screenX, screenY);
    const tile = this.game.map.getTileFromCoords(world.x, world.y);
  
    // LavaFloor must be placed on path tiles only
    if (this.activeAbility.id === 'lava_floor' && this.game.map.layout[tile.row][tile.col] !== 'O') {
      this.game.logEvent('Ability must be placed on path');
      return false;
    }
  
    this.activeAbility.handleCanvasClick(world.x, world.y);
  
    if (!this.activeAbility.isPlacing) {
      this.activeAbility = null;
    }
    return true;
  }

  update(deltaTime) {
    for (const a of this.abilities) a.update(deltaTime);
  }

  render(ctx) {
    for (const a of this.abilities) a.render(ctx);
  }
}
