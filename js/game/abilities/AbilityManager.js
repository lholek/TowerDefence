// abilities/AbilityManager.js
import Ability from './Ability.js';
import LavaFloor from './LavaFloor.js';
import TowersFury from './TowersFury.js';

export default class AbilityManager {
  constructor(game) {
    this.game = game;
    this.abilityRegistry = {
      // id -> class
      'lava_floor': LavaFloor,
      'towers_fury': TowersFury
    };
    this.abilities = []; // instantiated ability objects (one per config)
    this.activeAbility = null; // currently selected ability instance for placing
    this.previewTiles = [];
    if (this.game.updateSelectionUI) {
      this.game.updateSelectionUI(); 
    }
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

  selectAbilityById(id) {
    this.deselectCurrent();
    const inst = this.abilities.find(a => a.id === id);
    if (!inst || !inst.available()) return false;

    const card = document.getElementById(inst.id);

    // POKUD UŽ JE VYBRANÁ (Toggle off)
    if (this.activeAbility === inst) {
        this.activeAbility = null;
        inst.isPlacing = false;
        if (card) card.classList.remove('placing');
        this.game.updateSelectionUI(); // Teď tvá funkce uvidí null a skočí na věž
        return true;
    }

    // POKUD VYBÍRÁŠ NOVOU
    if (inst.type === 'global') {
        return inst.startPlacing(); 
    }

    if (inst.startPlacing()) {
        this.activeAbility = inst;
        document.querySelectorAll('.ability-card').forEach(c => c.classList.remove('placing'));
        if (card) card.classList.add('placing');
        this.game.updateSelectionUI();
        return true;
    }
    return false;
  }

  cancelActivePlacement() {
    if (this.activeAbility) {
      this.activeAbility.cancelPlacing();
      this.activeAbility = null;
    }
  }

  // Call this when an ability actually activates (placement finished or instant ability effect runs).
  // This ensures cooldown visuals only start when the player used the ability.
  // Add 'card' as a parameter
  notifyAbilityUsed(ability ) {
    if (!ability) return;
    
    if (this.game && this.game.stats) {
        this.game.stats.abilitiesUsed++;
    }
    
    ability._lastUsed = performance.now();
    
   // if (this.game && typeof this.startAbilityCooldownTimer === 'function') {
    if (this.game) {
      this.game.logEvent(`Player used ability <b>${ability.name}</b>`);
    }
}

  // In handleCanvasClick: ensure card is found for targeted abilities
  handleCanvasClick(screenX, screenY) {
    if (!this.activeAbility || !this.activeAbility.isPlacing) return false;

    const world = this.game.map.screenToWorld(screenX, screenY);
    this.activeAbility.handleCanvasClick(world.x, world.y);
    return true;
  }

  update(deltaTime) {
    for (const a of this.abilities) {
        a.update(deltaTime); // Correctly uses game deltaTime
        //this.updateAbilityUI(a);
    }
  }

  updateAbilityUI(ability) {
    const card = document.getElementById(ability.id);
    if (!card) return; // Exit if the card element doesn't exist

    // Select elements and verify they exist before accessing .style
    const durationOverlay = card.querySelector('.duration-overlay');
    const durationTimer = card.querySelector('.duration-timer');
    const cooldownOverlay = card.querySelector('.cooldown-overlay');
    const cooldownTimer = card.querySelector('.cooldown-timer');

    // --- Handle Duration Overlay ---
    if (durationOverlay) {
        if (ability.activeInstances && ability.activeInstances.length > 0) {
            durationOverlay.style.display = 'flex';
            const maxDur = Math.max(...ability.activeInstances.map(i => i.durationLeft));
            if (durationTimer) {
                durationTimer.textContent = (maxDur / 1000).toFixed(1) + "s";
            }
        } else {
            durationOverlay.style.display = 'none';
        }
    }

    // --- Handle Cooldown Overlay ---
    if (cooldownOverlay) {
        if (ability.remainingCooldown > 0) {
            cooldownOverlay.style.display = 'flex';
            if (cooldownTimer) {
                cooldownTimer.textContent = (ability.remainingCooldown / 1000).toFixed(1) + "s";
            }
        } else {
            cooldownOverlay.style.display = 'none';
        }
    }
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
  // Start cooldown visuals for a given ability and card.
  // This sets ability._lastUsed so periodic updater (above) can pick it up.
  startAbilityCooldownTimer(ability, card) {
    if (!ability || !ability.cooldown) return;
    ability._lastUsed = performance.now();

    const overlay = card?.querySelector('.cooldown-overlay');
    const timer = card?.querySelector('.cooldown-timer');
    if (overlay) {
      overlay.style.display = 'block';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.5)';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.transition = `height ${ability.cooldown}ms linear`;

      // trigger shrink animation on next frame
      requestAnimationFrame(() => {
        overlay.style.height = '0%';
      });
    }
  }

  deselectAbility() {
    if (this.activeAbility) {
        // Nastavíme schopnosti, že už se nepokládá
        this.activeAbility.isPlacing = false;
        this.activeAbility.pendingSelections = []; // Tohle vymaže ty zaseknuté tily
        
        // Odstraníme vizuální označení z UI karty
        const card = document.getElementById(this.activeAbility.id);
        if (card) {
            card.classList.remove('selected');
            card.classList.remove('placing');
        }
    }
    this.activeAbility = null;
    this.previewTiles = []; // Vyčistí i náhled v manageru
  }

  deselectCurrent() {
    if (this.activeAbility) {
        // Zavoláme stopPlacing, pokud ji schopnost má (což LavaFloor má)
        if (typeof this.activeAbility.stopPlacing === 'function') {
            this.activeAbility.stopPlacing();
        } else {
            // Pojistka pro ostatní schopnosti
            this.activeAbility.isPlacing = false;
            this.activeAbility.pendingSelections = [];
        }
    }
    this.activeAbility = null;
    this.previewTiles = [];
    
    // Odstraníme 'selected' třídu ze všech karet v UI
    document.querySelectorAll('.ability-card').forEach(card => {
        card.classList.remove('selected', 'placing');
    });
  }
}
