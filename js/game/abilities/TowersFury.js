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
        this.remainingCooldown = this.cooldown;
        
        this.activeInstances.push({
            // Change 'expiresAt' to 'durationLeft'
            durationLeft: this.effectDuration, 
            onEnd: () => { console.log("Fury Ended"); }
        });
    
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