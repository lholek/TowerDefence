// TowersFury.js
import Ability from './Ability.js';

export default class TowersFury extends Ability {
    constructor(game, config = {}) {
        super(game, config);
        
        // FIX: Look for 'config_id' from your JSON and assign it to this.id
        // This ensures Fury 1 and Fury 2 are recognized as different objects.
        if (config.config_id) {
            this.id = config.config_id;
        }

        this.type = 'global';
        this.modifiers = config.modifiers || { damage_mul: 1.25, speed_mul: 1.25, fireRate_mul: 0.75 };
    }

    startPlacing() {
        if (!this.available()) return false;
        // Global abilities don't need tile selection, they activate immediately
        return this.activate(); 
    }

    activate() {
        this.remainingCooldown = this.cooldown;
        
        this.activeInstances.push({
            durationLeft: this.effectDuration, 
            onEnd: () => { console.log(`${this.name} (${this.id}) Ended`); }
        });

        // IMPORTANT: We let AbilityManager handle the UI cooldown timer 
        // through its notifyAbilityUsed call.
        return true;
    }

    isActive() {
        return this.activeInstances.length > 0;
    }
}