import Ability from './Ability.js';

export default class TowersFury extends Ability {
    constructor(game, config = {}) {
        super(game, config);
        this.type = 'global';
        // Ensure we use the config from JSON or defaults
        this.modifiers = config.modifiers || { damage_mul: 1.25, speed_mul: 1.25, fireRate_mul: 0.75 };
    }

    startPlacing() {
        if (!this.available()) return false;
        return this.activate(); 
    }

    activate() {
        const now = performance.now();
        this.lastUsedAt = now;
        this.remainingCooldown = this.cooldown;

        // Add the active instance so isActive() returns true
        this.activeInstances.push({
            expiresAt: now + this.effectDuration,
            onEnd: () => { console.log("Fury Ended"); }
        });

        // IMPORTANT: Tell the AbilityManager to start the visual UI cooldown
        if (this.game.abilityManager) {
            this.game.abilityManager.startAbilityCooldownTimer(this, null);
        }

        return true;
    }

    // This stays the same
    isActive() {
        return this.activeInstances.length > 0;
    }
}