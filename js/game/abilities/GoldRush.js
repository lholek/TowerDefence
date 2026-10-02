// GoldRush.js
import Ability from './Ability.js';

export default class GoldRush extends Ability {
    constructor(game, config = {}) {
        super(game, config);
        this.id = config.configId || this.id;

        this.type = 'global';
        this.coinBonus = config.coin_bonus ?? 100; // % bonus applied to enemy-kill coin rewards
        this.roundUp = config.round_up ?? true;
    }

    /* Getter dynamicDescription */
    get dynamicDescription() {
        return `+${this.coinBonus}% Gold from kills`;
    }

    // Beta 1.1 card (see Ability.js)
    get cardTheme() {
        return 'concept-gold-rush';
    }

    get cardStats() {
        return {
            stat: `<span class="concept-num concept-good">+${this.coinBonus}%</span> Gold Income`,
            sub: 'From enemy kills'
        };
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

        this.game.abilityManager.notifyAbilityUsed(this);
        return true;
    }

    isActive() {
        return this.activeInstances.length > 0;
    }
}
