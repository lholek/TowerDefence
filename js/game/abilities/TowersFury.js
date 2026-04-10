// TowersFury.js
import Ability from './Ability.js';

export default class TowersFury extends Ability {
    constructor(game, config = {}) {
        super(game, config);
        
        // FIX: Look for 'configId' from your JSON and assign it to this.id
        // This ensures Fury 1 and Fury 2 are recognized as different objects.
        if (config.configId) {
            this.id = config.configId;
        }

        this.type = 'global';
        this.modifiers = config.modifiers || { damage_mul: 1.25, speed_mul: 1.25, fireRate_mul: 0.75 };
    }

    /* Getter dynamicDescription */
    get dynamicDescription() {
      const { damage_mul, speed_mul, fireRate_mul } = this.modifiers;
        
      const formatStat = (val, inverted=false) => {
        // Calculate difference from 1 (e.g., 5 becomes 4, 0.3 becomes -0.7)
        const change = Math.round((val - 1) * 100);
        const colorClass = (val >= 1) !== inverted ? 'stat-pos' : 'stat-neg'
        // Add '+' for positive, negatives already have '-'
        const sign = change >= 0 ? '+' : '';
        if (change != 0) {
            return `<span class="${colorClass}">${sign}${change}%</span>`;
        } else {
            return `<span>±0%</span>`;
        }
      };

      
      // Row 1: Damage and Speed (Starts with Damage, includes Speed, then closes the div)
      const dmg = `<div class="stat-row">${formatStat(damage_mul)} <span class="stat-label">Damage</span></div>`;
      
      // Row 2: Fire Rate ( Fire Rate, then closes the div)
      const speed = `<div class="stat-row">${formatStat(speed_mul)} <span class="stat-label">Speed </span>`;
      const rate = `${formatStat(fireRate_mul, true)} <span class="stat-label">Fire Rate</span></div>`;

      return `${dmg}${speed}${rate}`;
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
            onEnd: () => {}
        });

        // IMPORTANT: We let AbilityManager handle the UI cooldown timer 
        // through its notifyAbilityUsed call.
        this.game.abilityManager.notifyAbilityUsed(this); // Notify manager of activation
        return true;
    }

    isActive() {
        return this.activeInstances.length > 0;
    }
}