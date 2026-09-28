// abilities/Ability.js
// Base class - only what EVERY ability genuinely shares, regardless of type
// ('targeted', 'field', 'global', ...). Anything only some abilities need
// (damage, tile-selection/placement state, custom render/preview logic)
// belongs directly in that ability's own subclass (see LavaFloor.js for a
// targeted example, TowersFury.js for a global one), not here.
export default class Ability {
  constructor(game, config = {}) {
    this.game = game;                 // reference to Game instance
    this.id = config.id || 'ability';
    this.name = config.name || 'Ability';
    this.description = config.description || '';
    this.description_text = config.description_text || '';
    this.type = config.type || 'targeted'; // 'field', 'targeted', 'global' etc. - AbilityManager routes on this
    this.cooldown = config.cooldown || 30000;
    this.effectDuration = config.effectDuration || 5000;
    this.color = config.color || '#ff0';
    this.ui = config.ui || {};

    // runtime - shared cooldown/active-effect bookkeeping. Every ability
    // type uses this: LavaFloor's DOT tiles and TowersFury's buff both live
    // in activeInstances and get ticked/expired by update() below.
    this.lastUsedAt = -Infinity;
    this.remainingCooldown = 0;
    this.activeInstances = [];
  }

  available() {
    return this.remainingCooldown <= 0;
  }

  // override in subclass
  activate() {
    console.warn('Ability.activate() not implemented', this.id);
    this.lastUsedAt = performance.now();
  }

  // update active effects (called every frame)
  update(deltaTime) {
    // 1. Handle Cooldown
    if (this.remainingCooldown > 0) {
        this.remainingCooldown -= deltaTime;
    }

    // 2. Handle Active Instances (Duration/Lava Floor ticks)
    this.activeInstances = this.activeInstances.filter(inst => {
        // Tick first, THEN check expiry - otherwise the final tick that lands
        // exactly on the frame the effect expires (e.g. effectDuration set to
        // an exact multiple of damage_every) never fires, and the instance
        // ends up dealing one fewer hit than the config math promises.
        if (typeof inst.onTick === 'function') inst.onTick(deltaTime);

        inst.durationLeft -= deltaTime;
        if (inst.durationLeft <= 0) {
            if (typeof inst.onEnd === 'function') inst.onEnd();
            return false;
        }
        return true;
    });
  }

  // AbilityManager.render() calls this unconditionally on every ability
  // every frame, so it must always exist - no-op by default, override in
  // any subclass that needs to draw something (see LavaFloor.js).
  render(ctx) {}

  // Game.js's ability card reads this for the card's description line.
  // Safe fallback so an ability that doesn't define its own getter shows
  // its configured description instead of literally "undefined".
  get dynamicDescription() {
    return this.description || '';
  }
}
