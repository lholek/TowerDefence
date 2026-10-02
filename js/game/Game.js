import Map from './Map.js';
import Enemy from './Enemy.js';
import Tower from './Tower.js';
import Bullet from './Bullet.js';

// add near other imports
import AbilityManager from './abilities/AbilityManager.js';
import { buildCardFx, groupNum } from './CardFx.js';

// Beta 1.1 "+1 Life" tab icon (same art as the other tabs in index.html)
const HEART_SVG = '<svg class="concept-tab-icon" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="tabHeartG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a8a"/><stop offset="1" stop-color="#b3261e"/></linearGradient></defs><path fill="url(#tabHeartG)" stroke="#4a0d08" stroke-width=".8" d="M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.2 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.6 0 5.8 3.7 4.3 7.3C19.5 16.4 12 21 12 21z"/><path fill="#fff" opacity=".45" d="M6.6 7.2c-1.3.3-2.2 1.6-2 3 .5-1.2 1.3-2 2.6-2.4z"/></svg>';

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.towers = [];
    this.bulletPool = [];
    this.enemies = [];

    this.playerCoins = 10;
    this.playerLifes = 10;

    this.lastTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 800;

    this.currentLevelIndex = 0;
    this.levelData = null;
    this.map = null;

    this.gameStarted = false;
    this.paused = false;

    this.enemiesKilled = 0;
    this.totalEnemiesInLevel = 0;

    this.selectedTowerType = null;
    this.towerTypes = {};

    // Abilities
    this.abilityManager = new AbilityManager(this);

    this.levelText = document.getElementById('levelText');
    this.lifesText = document.getElementById('lifesText');
    this.coinsText = document.getElementById('coinsText');
    this.progressBar = document.getElementById('progressBar');
    this.gameOverlay = document.getElementById('gameOverlay');
    this.overlayContent = document.getElementById('overlayContent');
    this.eventsList = document.getElementById('eventsList');

    this.canvas.addEventListener('click', e => this.handleBuild(e));
    this.canvas.addEventListener('contextmenu', e => this.handleSell(e));

    // Hover on tiles
    this.hoveredTile = null;
    this.canvas.addEventListener('mousemove', e => this.handleHover(e));
    this.canvas.addEventListener('mouseleave', () => {
      // clear ability preview on leaving canvas
      if (this.abilityManager) this.abilityManager.updatePreview(-9999, -9999);
      this.hoveredTile = null;
    });

    // Game time
    this.elapsedTime = 0; // Total time the game has been running (in ms)
    this.timeDisplay = document.getElementById('gameTimeDisplay');

    // Stats
    this.stats = {
        enemiesKilled: 0,
        damageDealt: 0,
        goldEarned: 0,
        goldSpent: 0,
        towersBuilt: 0,
        towersSold: 0,
        lifeLost: 0,
        abilitiesUsed: 0,
        extraLifeBought: 0
    };

    this.gameSpeed = 1; // Default speed

    // Shake the game
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Hot keys
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    window.addEventListener('keydown', this.boundKeyDown);

    // Towers Hovering
    this.keys = {};
    this.hoveredTower = null;

    // Selection box
    this.uiSelectionBox = document.getElementById('selectionIndicator');
    this.uiSelectionText = document.getElementById('selectionName');

    // Bound (not inline) so destroy() can actually remove them - inline
    // arrow functions passed straight to addEventListener have no stored
    // reference, so a previous version of this code leaked 2 permanent
    // window listeners (plus everything they close over: this whole Game
    // instance, its Map, towers, enemies...) on every restart.
    this.boundKeyStateDown = (e) => this.keys[e.code] = true;
    this.boundKeyStateUp = (e) => this.keys[e.code] = false;
    window.addEventListener('keydown', this.boundKeyStateDown);
    window.addEventListener('keyup', this.boundKeyStateUp);
  
    // Custom cursor - defaulted to the canvas center so renderCustomCursor()
    // always has finite coordinates to draw with, even before the mouse has
    // moved over this (freshly created, per new game) canvas even once.
    // createRadialGradient() throws on non-finite input (unlike arc(), which
    // just silently no-ops), and that throw happens inside the render() call
    // that loop() makes BEFORE its own requestAnimationFrame(...) re-schedule
    // - so an uncaught error there doesn't just skip a frame, it kills the
    // entire game loop for good.
    this.mouseX = this.canvas.width / 2;
    this.mouseY = this.canvas.height / 2;
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });
  }

  /**
   * Nastaví násobitel rychlosti hry, který ovlivňuje rychlost pohybu nepřátel, střelbu věží a časování schopností.
   * @param {number} multiplier Násobitel rychlosti (např. 1 pro normální, 2 pro dvojnásobnou, 0.5 pro zpomalení).
   */
  setSpeed(multiplier) {
    this.gameSpeed = multiplier;
  }
  
  /**
   * Načte herní data mapy buď z URL, nebo z již předaného JSON objektu.
   * @param {string|object} mapSource URL/cesta k souboru mapy, NEBO parsovaný JSON objekt.
   */
  async loadGameData(mapSource) {
    let rawData;

    // 1. ROZHODNUTÍ O ZDROJI DAT
    if (typeof mapSource === 'string') {
        // ZDROJ JE URL (pro přednastavené mapy)
        const res = await fetch(mapSource);
        if (!res.ok) {
            throw new Error(`Failed to load JSON: ${res.status} ${res.statusText}`);
        }
        rawData = await res.json();
    } else if (typeof mapSource === 'object' && mapSource !== null) {
        // ZDROJ JE PŘÍMÝ JSON OBJEKT (pro nahraný soubor)
        rawData = mapSource;
    } else {
        throw new Error("Neplatný zdroj mapy pro loadGameData. Očekáván string (URL) nebo objekt (JSON data).");
    }

    // Váš původní JSON předpokládal, že data mapy jsou pod klíčem 'maps[0]',
    // ale lokální soubor asi obsahuje rovnou data mapy. Zkontrolujte, zda data
    // potřebují být obalena (rawData.maps[0]) nebo ne (rawData).
    // Používám logiku, že nahraný soubor by měl obsahovat celý objekt mapy.
    
    // Zvolíme data mapy: použijeme 'maps[0]' pokud existuje, jinak použijeme celý objekt
    this.levelData = rawData.maps?.[0] || rawData;

    // 2. INICIALIZACE ZÁKLADNÍCH HERNÍCH HODNOT
    // Použijte ?? pro nastavení výchozí hodnoty, pokud je hodnota v JSONu undefined nebo null
    this.playerCoins = this.levelData.startingCoins ?? 10;
    this.playerLifes = this.levelData.startingLifes ?? 10;
    this.towerTypes = this.levelData.towerTypes || {};
    this.lifePurchaseCount = 0;

    // 3. NAČTENÍ MAPY A SCHOPNOSTÍ
    // Předpokládáme, že Map.js má metodu loadMap nebo je inicializován v konstruktoru
    // Vycházím z vaší původní logiky: this.loadMap(this.levelData.layout);
    // Pokud máte mapu inicializovanou v Game konstruktoru: this.map = new Map(..., this.levelData.layout);
    // Doporučuji upravit tak, aby přijímala layout zde:
    if (!this.map) {
        // Pokud mapa ještě nebyla inicializována (např. v konstruktoru Game)
        this.map = new Map(this.canvas, this.levelData.layout);
    } else {
        // Pokud je mapa již vytvořena (méně časté), aktualizujte její rozložení
        this.map.loadLayout(this.levelData.layout); // Předpokládá metodu pro aktualizaci
    }
    
    // Načtení pole schopností, pokud existuje
    this.abilityManager.loadFromConfigs(this.levelData.abilities || []);

    // 4. AKTUALIZACE UI NA ZÁKLADĚ DAT
    // Skrýt nebo zobrazit tlačítko "Abilities"
    const abilityModeBtn = document.getElementById('abilityModeBtn');
    if (abilityModeBtn) {
        const hasAbilities = (this.levelData.abilities && this.levelData.abilities.length > 0);
        abilityModeBtn.style.display = hasAbilities ? 'inline-flex' : 'none';
    }

    // 5. NASTAVENÍ ÚROVNÍ A OBCHODŮ
    // Resetování počtu nepřátel
    if (this.levelData.levels) {
        this.levelData.levels.forEach(l => l.enemies.forEach(e => e._remaining = e.count));
    }
    
    // Vytvoření UI prvků
    this.createTowerShop();
    this.createAbilityBar();
    this.createLifePurchaseButton();

    // Musí být zalogováno PŘED setLevel() níže - ten už loguje "Wave 1 started".
    const mapName = this.levelData?.name || 'Unknown Map';
    this.logEvent(`<hr style="border: none; border-top: 1px solid #f0c674; margin: 4px 0 8px;"><span style="color:#f0c674; font-weight:bold;">New game ${mapName}</span> started`);

    this.setLevel(this.currentLevelIndex); // Zde se nastaví data pro aktuální level
    this.updateUI(); // Aktualizuje Lifes, Coins, Level atd.
  }

  loadMap(layout) {
    this.map = new Map(this.canvas, layout);
  }

  start() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.updateSelectionUI();
    requestAnimationFrame(this.loop.bind(this));
  }

  // Every write to this.paused (togglePause, PopupController's silent pause,
  // destroy...) also flags <body>, so css/bars.css freezes the card / top
  // bar animations together with the game.
  get paused() {
    return this._paused;
  }

  set paused(value) {
    this._paused = value;
    document.body.classList.toggle('game-paused', !!value);
  }

  /**
   * @param {boolean} showDialog Set to false for a "silent" pause/unpause that only
   * flips this.paused (e.g. PopupController auto-pausing while the Log or another
   * popup is open) without showing the "Game is Paused" dialog - that popup has its
   * own visible content, and it and the pause dialog stacking on top of each other
   * showed up as a mismatched box peeking out from behind it.
   */
  togglePause(showDialog = true) {
      if (!this.gameStarted) return; // only if game started
      this.paused = !this.paused;
      if (!showDialog) return;

      // Plays the same fade/pop animation as every other popup (see
      // css/popups.css's .menu-popup-overlay) - this popup isn't driven by
      // PopupController itself though, since P/ESC/window-blur all pause the
      // game directly and need to show it that way too; see the note next to
      // returnPopup in UI.js for why.
      if (this.paused) {
          clearTimeout(this._pausePopupCloseTimer);
          returnPopup.style.display = 'flex';
          void returnPopup.offsetWidth; // force reflow so the animation plays
          returnPopup.classList.add('is-open');
      } else {
          returnPopup.classList.remove('is-open');
          clearTimeout(this._pausePopupCloseTimer);
          // 250ms matches --popup-close-ms's default in css/popups.css
          this._pausePopupCloseTimer = setTimeout(() => {
              returnPopup.style.display = 'none';
          }, 250);
      }
  }

  handleBuild(e) {
    if (!this.map || !this.gameStarted || this.paused) return;

    // převést kliknutí na world souřadnice
    const worldPos = this.map.screenToWorld(e.clientX, e.clientY);

    // pokud kliknutí mimo mapu -> nic nedělat
    if (!this.map.isInsideMap(worldPos.x, worldPos.y)) return;

    // získat cílový tile (getTileFromCoords očekává world coords)
    const tile = this.map.getTileFromCoords(worldPos.x, worldPos.y);

    // do not build towers while placing an ability
    if (this.abilityManager.activeAbility && this.abilityManager.activeAbility.isPlacing) {
      // forward click to ability manager instead of building
      if (this.abilityManager.handleCanvasClick(e.clientX, e.clientY)) return;
    }

    // zkontrolovat, jestli se dá stavět
    if (!this.map.isBuildableTile(tile.col, tile.row)) return;
    if (this.towers.some(t => t.col === tile.col && t.row === tile.row)) return;
    if (!this.selectedTowerType) return;

    const type = this.towerTypes[this.selectedTowerType];
    if (!type) return;

    if (this.playerCoins >= type.price) {
      // Tower konstruktor používá (map, col, row) ve tvém současném kódu
      const tower = new Tower(this, this.map, tile.col, tile.row, type); // Pass 'this' (the game)
      tower.typeKey = this.selectedTowerType;
      this.towers.push(tower);
      this.playerCoins -= type.price;
      this.stats.towersBuilt++;
      this.stats.goldSpent += type.price;
      this.updateUI();
      this.logEvent(`Player <span style="color:#4ade80; font-weight:bold;">built</span> <span style="color:#fff; font-weight:500; text-shadow: 0 0 6px ${type.color}, 0 0 6px ${type.color};">${type.name}</span> for ${type.price} 🪙`);
    } else {
      this.logEvent("Not enough coins!");
    }
  }


  handleSell(e) {
      e.preventDefault();

      const worldPos = this.map.screenToWorld(e.clientX, e.clientY);

      // Get the tile under the click
      const tile = this.map.getTileFromCoords(worldPos.x, worldPos.y);

      // Find tower on that tile
      const tower = this.towers.find(t => t.col === tile.col && t.row === tile.row);

      if (tower) {
          const type = this.towerTypes[tower.typeKey];
          const sellPrice = tower.sellPrice ?? Math.floor(type.price / 2);
          this.playerCoins += sellPrice;
          // Return any bullets this tower still has in flight to the pool
          // before dropping it - otherwise they'd just get garbage
          // collected with the tower instead of being reused, so the pool
          // wouldn't get replenished from that batch.
          if (tower.bullets) {
              for (const bullet of tower.bullets) this.returnBullet(bullet);
              tower.bullets.length = 0;
          }
          this.towers = this.towers.filter(t => t !== tower);
          this.stats.towersSold++;
          this.updateUI();
          this.logEvent(`Player <span style="color:#f87171; font-weight:bold;">sold</span> <span style="color:#fff; font-weight:500; text-shadow: 0 0 6px ${type.color}, 0 0 6px ${type.color};">${type.name}</span> for ${sellPrice} 🪙`);
      }
  }

  loop(now) {
    if (!this.gameStarted) return; // Exit the loop entirely

    // Calculate raw deltaTime
    let rawDeltaTime = now - (this.lastTime || now);
    this.lastTime = now;
    // Clamp it - without this, a lag spike (tab switch, GC pause, a slow
    // frame from too much on screen) feeds one huge deltaTime into update(),
    // which can snap enemies/bullets far past where they should be and even
    // burst-spawn several enemies at once to "catch up". Capping at 100ms
    // means the game just runs a bit slower for that one frame instead of
    // jumping - it can't make an existing hitch cascade into a worse one.
    rawDeltaTime = Math.min(rawDeltaTime, 100);

    if (!this.paused && this.gameStarted && this.playerLifes > 0) {
      // Apply the multiplier here
      const scaledDeltaTime = rawDeltaTime * this.gameSpeed;
      this.update(scaledDeltaTime); 
      this.render();
    }
    requestAnimationFrame(this.loop.bind(this));
  }

  update(deltaTime) {
    // 1. Safety Checks and Timer Update
    if (!this.levelData) return;

    // Shake the game
    if (this.shakeDuration > 0) {
        this.shakeDuration -= deltaTime;
    }
    
    this.elapsedTime += deltaTime;
    // Only touch the DOM when the shown time actually changes (once a
    // second) - writing textContent every frame forced a style + layout
    // pass every frame, which also re-processed every running card
    // animation (css/bars.css) on the main thread.
    const timeText = this.formatTime(this.elapsedTime);
    if (timeText !== this._shownTime) {
      this._shownTime = timeText;
      this.timeDisplay.textContent = timeText;
    }

    const level = this.levelData.levels[this.currentLevelIndex];
    // We will now calculate allGroupsFinished, then derive allWavesComplete
    let allGroupsFinished = true; 

    // ----------------------------------------------------------------
    // 2. FIXED CONCURRENT SPAWNING LOGIC (Iterates over ALL groups)
    // ----------------------------------------------------------------
    
    // Iterate through ALL defined enemy groups/types in the current level.
    for (const item of level.enemies) {
        
        // --- Handle Simple/Flat Group Format (Concurrent Spawning) ---
        // If the item is marked as finished OR if it was already part of a completed complex wave, skip.
        if (item._remaining === 0 || item._waveFinished) {
            continue; 
        }

        // If any group still has enemies remaining, the wave is NOT completely spawned.
        allGroupsFinished = false;

        // A. Spawning
        if (item._remaining > 0) {
            const spawnRate = item.interval || 1000;
            
            // B. Timer Initialization with firstDelay offset
            if (typeof item._intervalTimer === 'undefined') {
                // Initialize timer to negative firstDelay so it waits for that duration.
                item._intervalTimer = -(item.firstDelay || 0);
            }

            // C. Update Timer
            item._intervalTimer += deltaTime;

            // D. Spawn one or more enemies if enough time has accumulated
            while (item._remaining > 0 && item._intervalTimer >= 0) {
              this.spawnEnemy(item); 
              item._intervalTimer -= spawnRate; 
                item._remaining--;
            }
        } 
        
        // No need for a separate check to advance level._currentGroupIndex, 
        // as we rely on allGroupsFinished at the end.
    }

    // Determine if all enemy groups have finished spawning
    let overallSpawningComplete = true;
    for (const item of level.enemies) {
        // If item has a remaining count OR is an unfinished complex wave
        if (item._remaining > 0 || (item.groups && !item._waveFinished)) {
            overallSpawningComplete = false;
            break;
        }
    }
    
    // The previous logic's 'allWavesComplete' check now relies on overallSpawningComplete
    // to check for the spawning part of the level.
    let allWavesComplete = overallSpawningComplete;


    // ----------------------------------------------------------------
    // 3. UPDATE ENTITIES
    // ----------------------------------------------------------------
    this.enemies.forEach(e => e.update(deltaTime));
    this.towers.forEach(t => t.update(deltaTime, this.enemies));
    // updateAbilityUI() used to also be called here for every ability on
    // every update frame (~60x/sec) - pure duplicate DOM work, since
    // abilityTimerInterval (see setupAbilityUI, runs every 100ms) already
    // refreshes the same cooldown/duration overlays and is what actually
    // drives their visible countdown. Removed to cut per-ability DOM
    // read/write churn on frames with several abilities active.
    this.abilityManager.abilities.forEach(ability => ability.update(deltaTime));

    // ----------------------------------------------------------------
    // 4. REMOVE DEAD/ESCAPED ENEMIES & CHECK GAME OVER
    // ----------------------------------------------------------------
    this.enemies = this.enemies.filter(e => {
        if (e.health <= 0) {
            const coinReward = this.abilityManager.applyGoldRush(e.coinReward);
            this.playerCoins += coinReward;
            this.stats.goldEarned += coinReward;
            this.stats.enemiesKilled++; // Sync with main counter
            this.enemiesKilled++;
            this.updateUI();
            return false; 
        }
      
        if (e.currentIndex >= e.path.length - 1) {
            this.playerLifes -= e.damage;
            this.stats.lifeLost += e.damage;
            this.updateUI();
        
            if (this.playerLifes <= 0) {
                this.gameStarted = false;
                this.showFinalScoreOverlay(`L`);
            }
            return false; 
        }
        return true; 
    });
    
    // ----------------------------------------------------------------
    // 5. LEVEL COMPLETION CHECK
    // ----------------------------------------------------------------
    if (this.playerLifes > 0 && allWavesComplete && this.enemies.length === 0) {
        this.currentLevelIndex++;
        
        if (this.currentLevelIndex >= this.levelData.levels.length) {
            this.gameStarted = false;
            // CHANGE: Remove setTimeout, add a button-based overlay
            this.showFinalScoreOverlay('V');
        } else {
            this.setLevel(this.currentLevelIndex);
        }
    }
  }

  showFinalScoreOverlay(status) {

    const fmt = (num) => {
        const value = Math.round(num || 0);
        return value.toLocaleString('fr-FR'); 
    };

    // 1. Declare variables OUTSIDE the if/else so they are accessible later
    let mainText = "";
    let titleClass = "";
    let color = "";
    let subText = `You survived ${this.currentLevelIndex} waves!`;

    if (status === 'V') {
        mainText = "VICTORY !";
        titleClass= "victory-text";
        color = "#1e7d32";
    } else {
        mainText = "DEFEAT !";
        titleClass= "defeat-text";
        color = "#b51414";
    }

    // 2. Find or create an overlay element
    let overlay = document.getElementById('gameEndOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gameEndOverlay';
        overlay.className = 'full-screen-overlay';
        document.body.appendChild(overlay);
    }

    // 2.5 Show total time in stats
    const totalSeconds = Math.floor(this.elapsedTime / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    const timeString = `${m}:${s}`;

    if (this.stats.lifeLost < 0) this.stats.lifeLost = 0; // Ensure no negative life lost due to overkill

    // 3. Set content (Notice we use the variables defined above)
    overlay.innerHTML = `
        <div class="overlay-content final-status" style="border-color: ${color}">
            <h2 class="${titleClass}">${mainText}</h2>
            <p>${subText}</p>
            <div class="stats-grid final-status-grid">
              <div>🪙: <span>${fmt(this.playerCoins)}</span></div>
              <div>❤️: <span>${fmt(this.playerLifes)}</span></div>
              
              <div style="color: #ef4444;">⚔️ Damage <span class="stats-detail">${fmt(this.stats.damageDealt)}</span></div>
              <div style="color: #eab308;">🪙 Earned <span class="stats-detail">${fmt(this.stats.goldEarned)}</span></div>
              
              <div style="color: #fca5a5;">☠️ Kills <span class="stats-detail">${fmt(this.stats.enemiesKilled)}</span></div>
              <div style="color: #fbbf24;">💸 Spent <span class="stats-detail">${fmt(this.stats.goldSpent)}</span></div>
              
              <div style="color: #60a5fa;">🏗️ Built <span class="stats-detail">${fmt(this.stats.towersBuilt)}</span></div>
              <div style="color: #94a3b8;">🏚️ Sold <span class="stats-detail">${fmt(this.stats.towersSold)}</span></div>
              
              <div style="color: #a855f7;">✨ Abilities <span class="stats-detail">${fmt(this.stats.abilitiesUsed)}</span></div>
              <div style="color: #f87171;">💔 Life lost <span class="stats-detail">${fmt(this.stats.lifeLost)}</span></div>
              
              <div class="final-status-time">
                  ⏱️ Time Elapsed: ${timeString}
              </div>
            </div>
                <div class="final-status-button-grid">
                    <button id="btnRestartFromEnd" class="btn btn-primary">Restart</button>
                    <button id="btnContinueToMenu" class="btn btn-primary">Main Menu</button>
                </div>
        </div>
    `;

    overlay.classList.remove('d-none');

    // 4. Button Logic
    // Main Menu
    document.getElementById('btnContinueToMenu').onclick = () => {
        overlay.classList.add('d-none');
        const gameSpeedSelect = document.getElementById('gameSpeedSelect');
        if (gameSpeedSelect) {
            gameSpeedSelect.value = "1";
            gameSpeedSelect.classList.remove('is-boosted');
        }
        this.resetGameToMenu();
    };

    // Restart - unlike the pause menu's Restart, this one needs no "Sure?"
    // confirmation: the run is already over, there's nothing left to lose.
    document.getElementById('btnRestartFromEnd').onclick = () => {
        overlay.classList.add('d-none');
        window.restartCurrentGame?.();
    };
  }

  // Helper method to spawn a single enemy based on config
  spawnEnemy(config) {
     // Default to S1E1 if no path is specified
     const pathKey = config.path || 'S1E1'; 
     const path = this.map.paths[pathKey];

    const effect = this.levelData.enemyEffects?.find(e => e.type === config.type);
    
    if (effect) {
        this.shakeDuration = effect.shakeDuration;
        this.shakeIntensity = effect.shakeIntensity;
    }

    // Get custom damage if set
    let customDamage = 1;
    if (this.levelData.enemyDamage) {
        const damageConfig = this.levelData.enemyDamage.find(d => d.type === config.type);
        if (damageConfig) {
            customDamage = damageConfig.damage;
        }
    }

    if (path && path.length > 0) {
      // Create enemy with the specific path for this group
      this.enemies.push(new Enemy(
        this.map, 
        path, 
        0, 0, 
        config.speed, 
        config.health, 
        config.coinReward,
        config.type,
        customDamage,
        config.skin
      ));
      const triggerLogShake = () => {
          const logBtn = document.getElementById('gameLogBtn');
          if (logBtn) {
              logBtn.classList.remove('btn-shake');
              void logBtn.offsetWidth; // Restart animace
              logBtn.classList.add('btn-shake');
              logBtn.addEventListener('animationend', () => {
                  logBtn.classList.remove('btn-shake');
              }, { once: true });
          }
      };
      customDamage = Number(customDamage);
      if (customDamage > 99) {
          this.logEvent(`An enemy has spawned with <span style="color:#f87171; font-weight:500;">${customDamage}</span> ⚔️ damage!`);
          triggerLogShake();
      } else if (customDamage < -99) {
          const healAmount = Math.abs(customDamage);
          this.logEvent(`An enemy has spawned with <span style="color:#4ade80; font-weight:500;">${healAmount}</span> ❤️ healing effect!`);
          triggerLogShake();
      }
    }
  }

  setLevel(index) {
    this.currentLevelIndex = index;
    this.enemiesKilled = 0;
    
    const level = this.levelData.levels[index];
    
    // Initialize the sequential tracking index
    level._currentGroupIndex = 0;

    // SAFE CALCULATION: Total enemies 
    this.totalEnemiesInLevel = level.enemies.reduce((sum, item) => {
      if (item.groups) {
        return sum + item.groups.reduce((gSum, g) => gSum + (g.count || 0), 0);
      } else {
        return sum + (item.count || 0);
      }
    }, 0);

    // Initialize Timers and Remaining Counts
    level.enemies.forEach(item => {
      
      // Setup for New Format (Waves with Groups)
      if (item.groups) {
        item._delayTimer = item.delay || 0; // Wave delay
        
        if (item.groups) {
          item.groups.forEach(g => {
             g._remaining = g.count;
             
             // --- CORRECTION: Timer starts at negative firstDelay ---
             g._intervalTimer = -(g.firstDelay || 0); 
          });
        }
      } 
      // Setup for Old Format (Flat Enemy List)
      else {
        item._remaining = item.count;
        
        // --- CORRECTION: Timer starts at negative firstDelay ---
        item._intervalTimer = -(item.firstDelay || 0); 
      }
    });

    this.updateUI();
    this.logEvent(`Wave ${index + 1} started`);
  }
  
  updateUI() {
    const totalLevels = this.levelData && this.levelData.levels ? this.levelData.levels.length : 0;

    this.levelText.innerHTML = `Level <b>${this.currentLevelIndex + 1}</b> / ${totalLevels}`;
    
    // icons are part of the top bar markup now - just the numbers, "3 018" style
    this.lifesText.textContent = groupNum(this.playerLifes);
    this.coinsText.textContent = groupNum(this.playerCoins);
    
    const percent = this.totalEnemiesInLevel === 0 ? 100 : (this.enemiesKilled / this.totalEnemiesInLevel) * 100;
    this.progressBar.style.width = `${percent}%`;
  }

 createTowerShop() {
    const shopDiv = document.getElementById('towerShop');
    shopDiv.innerHTML = '';

    const tileSize = this.map.tileSize;
    let index = 0;
    for (const [key, type] of Object.entries(this.towerTypes)) {
        index++;
        const item = document.createElement('div');

        // 1. Sync visual states (Beta 1.1 card - css/bars.css; accent = tower color)
        item.className = 'concept-card concept-tower' + (this.selectedTowerType === key ? ' active' : '');
        item.style.setProperty('--accent', type.color || '#f0c674');

        const dps = type.damage * 1000 / type.fireRate;
        const range = type.range / tileSize;
        const speed = type.speed * 144 / tileSize;
        const fmt = n => groupNum(n >= 100 ? Math.round(n) : Number(n.toFixed(1)));
        const price = groupNum(type.price);

        // 2. Generate zoomed tower image
        const tempTower = new Tower(this, this.map, 0, 0, type);
        const src = tempTower.preRenderedImage;
        this.towerTypes[key].cachedImage = src; // Uložíme plný obrázek pro náhled při stavbě

        const zoomCanvas = document.createElement('canvas');
        zoomCanvas.width = 120;
        zoomCanvas.height = 120;
        const zCtx = zoomCanvas.getContext('2d');

        // CROP CALCULATION:
        // We take a 45% window of the original image to make the tower appear large
        const cropSize = src.width * 0.45;
        const sx = (src.width / 2.5) - (cropSize / 2); // Centers X relative to tower base
        const sy = (src.height / 2) - (cropSize / 1.2); // Centers Y and shifts up for flag

        zCtx.drawImage(src,
            sx, sy, cropSize, cropSize, // Source window
            0, 0, 120, 120              // Fill shop canvas
        );

        // Base view: Price / Sell / DPS - on hover all 6 stats (css/bars.css)
        item.innerHTML = `
            <div class="concept-card-index">${index}</div>
            <div class="concept-tower-img"><img src="${zoomCanvas.toDataURL()}" alt="" /></div>
            <div class="concept-tower-side">
              <div class="concept-card-name${type.name.length > 14 ? ' concept-name-long' : ''}">${type.name}</div>
              <div class="concept-tower-values">
                <div class="concept-tower-base">
                  <div class="concept-tower-row price"><span>🪙 Price</span><b>${price}</b></div>
                  <div class="concept-tower-row"><span>💰 Sell</span><b>${groupNum(type.sellPrice)}</b></div>
                  <div class="concept-tower-row"><span>💥 DPS</span><b class="concept-num">${fmt(dps)}</b></div>
                </div>
                <div class="concept-tower-stats">
                  <div class="concept-tower-stat price"><span><i>🪙</i>Price</span><b>${price}</b></div>
                  <div class="concept-tower-stat"><span><i>💥</i>DPS</span><b>${fmt(dps)}</b></div>
                  <div class="concept-tower-stat"><span><i>⚔️</i>Damage</span><b>${fmt(type.damage)}</b></div>
                  <div class="concept-tower-stat"><span><i>🎯</i>Range</span><b>${range.toFixed(1)} <small>tiles</small></b></div>
                  <div class="concept-tower-stat"><span><i>⏱️</i>Fire rate</span><b>${type.fireRate} <small>ms</small></b></div>
                  <div class="concept-tower-stat"><span><i>🗲</i>Speed</span><b>${speed.toFixed(1)} <small>tiles/s</small></b></div>
                </div>
              </div>
            </div>
        `;
        buildCardFx(item, 'concept-tower', index * 97 + 11);

        // 3. Selection logic (Crucial for number keys)
        item.onclick = () => {
            // 1. Update the logical selection
            if (this.abilityManager && this.abilityManager.activeAbility) {
                // Zastavíme logiku v objektu
                this.abilityManager.activeAbility.isPlacing = false;

                // Fyzicky smažeme třídu 'placing' z HTML karet v DOMu
                document.querySelectorAll('.concept-ability').forEach(card => card.classList.remove('placing'));

                // Vynulujeme referenci v manažerovi
                this.abilityManager.activeAbility = null;
            }

            this.selectedTowerType = (this.selectedTowerType === key) ? null : key;

            // 2. Instead of rebuilding the whole shop, just toggle the 'active' class
            const allItems = shopDiv.querySelectorAll('.concept-tower');
            allItems.forEach(el => {
                if (el.dataset.key === key && this.selectedTowerType === key) {
                    el.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    el.classList.remove('active');
                }
            });

            this.updateSelectionUI();
        };
        // Add this right before shopDiv.appendChild(item) to make the cards searchable
        item.dataset.key = key;

        shopDiv.appendChild(item);
    }
  }

  formatNum(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'bil.';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'mil.';
    return num;
  }

  createAbilityBar() {
    const container = document.getElementById('abilityBar');
    if (!container) return;
    container.innerHTML = '';

    // clear any previous update interval
    if (this.abilityTimerInterval) {
      clearInterval(this.abilityTimerInterval);
      this.abilityTimerInterval = null;
    }
    this.abilityCards = {};

    let index = 0;
    for (const a of this.abilityManager.getAvailable()) {
      index++;
      const card = document.createElement('div');
      // Beta 1.1 card (css/bars.css) - theme + stat lines come from the
      // ability itself (cardTheme / cardStats, see abilities/Ability.js)
      const theme = a.cardTheme;
      card.className = 'concept-card concept-ability' + (theme ? ' ' + theme : '');
      card.id = a.configId || a.id;
      const { stat, sub } = a.cardStats;

      card.innerHTML = `
          <div class="concept-card-top">
            <div class="concept-card-index">${index}</div>
            <div class="concept-card-icon">${a.ui?.icon || ''}</div>
            <div class="concept-card-name${a.name.length > 14 ? ' concept-name-long' : ''}">${a.name}</div>
          </div>
          <div class="concept-card-info">
            <div class="concept-card-stat">${stat}</div>
            <div class="concept-card-footer">
              <span class="concept-card-sub">${sub}</span>
              <span class="concept-card-times">
                ${a.effectDuration ? `<span>🕒 ${a.effectDuration / 1000}s</span>` : ''}
                <span>⏳ ${a.cooldown / 1000}s</span>
              </span>
            </div>
          </div>
          <div class="concept-active-overlay">
            <div class="concept-active-bar-wrap"><div class="concept-active-bar"></div></div>
          </div>
          <div class="concept-cooldown-overlay">
            <div class="concept-cooldown-active"></div>
            <div class="concept-cooldown-title">COOLDOWN</div>
            <div class="concept-cooldown-time">0s</div>
          </div>
      `;
      if (theme) buildCardFx(card, theme, index * 131 + 7);

      // save ref
      this.abilityCards[a.id] = { card, ability: a };

      // click toggles placing mode
      card.addEventListener('click', () => {
        if (this.abilityManager.activeAbility === a && a.isPlacing) {
          this.abilityManager.cancelActivePlacement();
          card.classList.remove('placing');
          this.updateSelectionUI();
        } else {
          if (this.abilityManager.selectAbilityById(a.id)) {
            document.querySelectorAll('.concept-ability').forEach(c => c.classList.remove('placing'));
            // only abilities that now wait for tiles to be picked (Lava Floor)
            // get the 'placing' frame - global ones (Towers Fury) have already
            // fired and just show their Active / Cooldown state
            if (a.isPlacing) card.classList.add('placing');
            this.updateSelectionUI();
          } else {
            this.logEvent(`${a.name} not ready`);
          }
        }
      });

      container.appendChild(card);
    }

    // Periodic card updater - cooldown and effect run at the same time (both
    // start when the ability is used): the dimmed COOLDOWN overlay counts
    // down, and while the effect still runs an "Active · Xs" plaque sits
    // above it with the shrinking bar at the bottom.
    this.abilityTimerInterval = setInterval(() => {
      // If game is paused, we don't update the UI numbers to avoid jumping
      if (this.paused) return;

      for (const { card, ability } of Object.values(this.abilityCards)) {
        const remaining = ability.remainingCooldown || 0;
        const onCooldown = remaining > 0;
        card.classList.toggle('concept-is-cooldown', onCooldown);
        if (onCooldown) {
          card.querySelector('.concept-cooldown-time').textContent = `${Math.ceil(remaining / 1000)}s`;
        }

        const instances = ability.activeInstances || [];
        const maxDur = instances.length ? Math.max(0, ...instances.map(i => i.durationLeft || 0)) : 0;
        const active = maxDur > 0;
        card.classList.toggle('concept-is-active', active);
        if (active) {
          card.querySelector('.concept-cooldown-active').textContent = `Active · ${Math.ceil(maxDur / 1000)}s`;
          // driven every tick (not a one-off CSS transition, which the browser
          // drops while the bar is hidden behind the Towers tab)
          const bar = card.querySelector('.concept-active-bar');
          bar.style.transform = `scaleX(${Math.min(1, maxDur / (ability.effectDuration || maxDur))})`;
        }
      }
    }, 100);
  }

  createLifePurchaseButton() {
    const container = document.getElementById('lifeButtonContainer');
    if (!container) return;
    
    container.innerHTML = '';

    // 1. Check if Extra Life is enabled (Default to true if missing)
    const isEnabled = this.levelData.extraLife !== false; 
    
    if (!isEnabled) {
        // If disabled, just exit. The container is already cleared.
        return; 
    }

    // 2. Get Prices Configuration
    // Use config from JSON, or fallback to your hardcoded defaults
    const prices = (this.levelData.extraLifePrices && this.levelData.extraLifePrices.length > 0) 
        ? this.levelData.extraLifePrices 
        : [10, 25, 50, 75, 100, 150, 200];

    // Helper to calculate current price
    const getCurrentPrice = () => {
        // Logic: if purchase count exceeds array length, keep using the LAST item
        const index = Math.min(this.lifePurchaseCount, prices.length - 1);
        return prices[index];
    };

    // Initialize current price
    if (typeof this.lifePurchaseCount === 'undefined') this.lifePurchaseCount = 0;
    let currentPrice = getCurrentPrice();

    const lifeButton = document.createElement('button');
    lifeButton.id = 'extraLifeBtn';
    lifeButton.className = 'concept-tab concept-tab-life';
    lifeButton.type = 'button';
    const renderLife = price => `${HEART_SVG}<span class="concept-tab-label">+1 Life</span><span class="concept-tab-price"><span class="concept-tab-coin">🪙</span>${groupNum(price)}</span><kbd class="concept-key">E</kbd>`;
    lifeButton.innerHTML = renderLife(currentPrice);

    container.appendChild(lifeButton);

    lifeButton.addEventListener('click', () => {
        // Recalculate price in case logic changes, though local variable works too
        currentPrice = getCurrentPrice();

        if (this.playerCoins >= currentPrice) {
            this.playerCoins -= currentPrice;
            this.playerLifes += 1;
            
            // Increment counters
            this.stats.extraLifeBought += 1;
            this.lifePurchaseCount += 1; 
            
            this.stats.goldSpent += currentPrice;
            
            // Update UI
            this.updateUI();
            this.logEvent(`Player bought 1 life ❤️ for ${currentPrice} 🪙`);

            // CALCULATE NEXT PRICE
            // We incremented lifePurchaseCount, so getCurrentPrice() now returns the NEXT tier
            currentPrice = getCurrentPrice();
            lifeButton.innerHTML = renderLife(currentPrice);

        } else {
            this.logEvent('Not enough coins to buy Extra life!');
        }
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.map) return;

    // Shake Logic
    this.ctx.save(); 
    if (this.shakeDuration > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);
    }

    // --- CHANGED: Pass towers and enemies to map.render ---
    // We pass 'this.towers' and 'this.enemies' so the map can sort them with mountains
    this.map.render(this.ctx, this.playerLifes, this.towers, this.enemies);

    // --- 1. HOVERED TILE (Uses its own transform block) ---
    if (this.hoveredTile) {
      this.map.applyCameraTransform(this.ctx);
        
      let color = 'rgba(255,0,0,0.25)'; // Default is RED (invalid)
      const col = this.hoveredTile.col;
      const row = this.hoveredTile.row;
      const status = this.map.getTileStatus(col, row);
      const hasTower = this.towers.some(t => t.col === col && t.row === row);
        
      // Identify state: Are we placing an Ability or a Tower?
      const isPlacingAbility = (this.abilityManager.activeAbility != null);
      const isPlacingTower = (this.selectedTowerType != null);
        
      const center = this.map.tileToWorld(col, row);

      if (isPlacingTower && !isPlacingAbility) {
          // TOWER MODE: Green on Grass, Snow, and Sand
          const isBuildableTerrain = (status === 'X' || status === 'SNW' || status === 'SND');
          if (isBuildableTerrain && !hasTower) {
              color = 'rgba(0,0,0,0)'; // GREEN
          }

          // --- VYKRESLENÍ DUCHA VĚŽE ---
          const towerData = this.towerTypes[this.selectedTowerType];
          if (towerData && towerData.cachedImage) {
              // Už jsme v bloku map.applyCameraTransform, takže kreslíme přímo v souřadnicích světa
              this.ctx.globalAlpha = 0.75; // Průhlednost pro efekt "ducha"
              
              // Musíme použít stejný offset jako v Tower.js (center.x - tileSize)
              this.ctx.drawImage(towerData.cachedImage, center.x - this.map.tileSize, center.y - this.map.tileSize);
              this.ctx.globalAlpha = 1.0; // Resetujeme průhlednost pro další kreslení
          }
      } 
      else if (isPlacingAbility) {
          // ABILITY MODE (Lava Floor): Green ONLY on roads
          const validRoadTokens = ['O', 'O[SNW]', 'O[SND]'];
          const isStartEndMarker = /^S\d+/i.test(status) || /^E\d+/i.test(status);
          if (validRoadTokens.includes(status) || isStartEndMarker) {
              color = 'rgba(0,255,0,0.25)'; // GREEN
          }
          // If status is 'SNW' or 'SND', it is NOT in validRoadTokens, so it stays RED.
      }
      
      this.ctx.fillStyle = color;
      const calculatedX = center.x - this.map.tileSize / 2;
      const calculatedY = center.y - this.map.tileSize / 2;
      this.ctx.fillRect(calculatedX, calculatedY, this.map.tileSize, this.map.tileSize);
      
      this.map.resetTransform(this.ctx);
        
      // Render ability preview overlay
      if (this.abilityManager && typeof this.abilityManager.renderPreview === 'function') {
          this.abilityManager.renderPreview(this.ctx);
      } 
    }

    // --- 2. WORLD OBJECTS OVERLAY (Bullets & Abilities) ---
    // Bullets and Abilities are "flying", so they can stay on top
    this.map.applyCameraTransform(this.ctx);

    // Draw Bullets (Towers are now drawn inside map.render)
    for (const tower of this.towers) {
      for (const bullet of tower.bullets) {
        bullet.render(this.ctx);
      }
    }

    // Draw Abilities
    this.abilityManager.render(this.ctx);

    // --- RANGE CIRCLES LOGIC ---
    const isShiftPressed = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const isAPressed = this.keys['KeyA'];

    const drawCircle = (x, y, range, fill = 'rgba(255, 255, 255, 0.15)') => {
      this.ctx.beginPath();
      this.ctx.arc(x, y, range, 0, Math.PI * 2);
      this.ctx.fillStyle = fill;
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2 / this.map.camera.zoom; 
      this.ctx.stroke();
    };

    if (isShiftPressed && isAPressed) {
      this.towers.forEach(t => drawCircle(t.x, t.y, t.range, "rgba(0,0,0,0)"));
    } 
    else if (isShiftPressed && this.hoveredTile) {
      const tower = this.towers.find(t => t.col === this.hoveredTile.col && t.row === this.hoveredTile.row);
      if (tower) drawCircle(tower.x, tower.y, tower.range);
    }

    if (isShiftPressed && this.selectedTowerType && this.hoveredTile) {
      const type = this.towerTypes[this.selectedTowerType];
      const pos = this.map.tileToWorld(this.hoveredTile.col, this.hoveredTile.row);
      drawCircle(pos.x, pos.y, type.range, 'rgba(100, 255, 100, 0.45)');
    }

    // --- 3. CLEANUP ---
    this.map.resetTransform(this.ctx);

    // Must always match the unconditional ctx.save() above - it was
    // previously only restored while shakeDuration > 0, which left one
    // unmatched save() on the canvas's internal state stack every other
    // frame (i.e. almost always). That stack grew without bound for the
    // whole session, and was the real cause of the game slowing down /
    // crashing the longer it ran - worse the more there was to render.
    this.ctx.restore();
    this.renderCustomCursor();
  }

  logEvent(htmlString) {
    const div = document.createElement('div');
    div.classList.add('text-center');
    div.innerHTML = htmlString;
    this.eventsList.appendChild(div);
    if (this.eventsList.children.length > 30) {
      this.eventsList.removeChild(this.eventsList.children[0]);
    }
    this.eventsList.scrollTop = this.eventsList.scrollHeight;
  }


  resetGameToMenu() {
    // stop game loop and clear runtime objects
    this.gameStarted = false;
    this.paused = false;

    this.enemies = [];
    this.towers = [];
    this.selectedTowerType = null;

    this.currentLevelIndex = 0;
    this.enemiesKilled = 0;
    this.spawnTimer = 0;
    this.elapsedTime = 0; // Reset time

    this.stats = {
        enemiesKilled: 0,
        damageDealt: 0,
        goldEarned: 0,
        goldSpent: 0,
        towersBuilt: 0,
        towersSold: 0,
        lifeLost: 0,
        abilitiesUsed: 0
    };

    // hide in-game overlay if visible
    if (this.gameOverlay) this.gameOverlay.style.display = 'none';

    // show the existing start overlay (main menu)
    const startOverlay = document.getElementById('startOverlay');
    if (startOverlay) {
      startOverlay.style.display = 'flex';
    }
    const title = document.getElementById('title');
    if (title) {
      title.style.display = 'block';
    }
    const subtitle = document.getElementById('subtitle');
    if (subtitle) {
      subtitle.style.display = 'flex';
    }

    // restore dynamic defaults (if JSON provided)
    this.playerCoins = this.levelData?.startingCoins ?? 10;
    this.playerLifes = this.levelData?.startingLifes ?? 10;

    // reset UI
    this.updateUI();

    // reload map to reset positions (keeps same map loaded so dropdown still reflects choice)
    if (this.levelData) {
      this.loadMap(this.levelData.layout);
    }

    // hide selectionIndicator div
    document.getElementById("selectionIndicator").style.display = "none";
  }

  handleHover(e) {
      if (!this.map) return;

      // also forward to ability manager to update preview if placing
      if (this.abilityManager && this.abilityManager.activeAbility && this.abilityManager.activeAbility.isPlacing) {
        this.abilityManager.updatePreview(e.clientX, e.clientY);
      }
      // existing hover tile computation...

      // Pass raw client coordinates to screenToWorld (map knows canvas rect)
      const worldPos = this.map.screenToWorld(e.clientX, e.clientY);

      // If click is outside the map area, clear hover
      if (!this.map.isInsideMap(worldPos.x, worldPos.y)) {
          this.hoveredTile = null;
          return;
      }

      // Get tile under mouse (world coords expected)
      const tile = this.map.getTileFromCoords(worldPos.x, worldPos.y);

      // getTileFromCoords clamps to valid range, but we keep hoveredTile for rendering
      this.hoveredTower = this.towers.find(t => t.col === tile.col && t.row === tile.row);
      this.hoveredTile = tile;
  }

  getBullet() {
    if (this.bulletPool.length > 0) {
      return this.bulletPool.pop();
    }
    // Create new one if pool is empty
    return new Bullet(0, 0, null, 0); 
  }

  returnBullet(bullet) {
    bullet.active = false;
    this.bulletPool.push(bullet);
  } 

  formatTime(ms) {
    // Convert ms to seconds
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Pad with leading zeros (e.g., 5 becomes 05)
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  handleKeyDown(e) {
    if (!this.gameStarted || this.paused) return;

    const key = e.key.toLowerCase();

    // Helper function to check if an element is truly visible to the player
    const isVisible = (el) => el && el.offsetParent !== null;

    // --- 1. Panel Switching (T, A) ---
    // Only switch if the toggle buttons themselves are visible
    if (key === 't') {
      if (this.abilityManager) {
          this.abilityManager.deselectAbility(); 
      }
        const btn = document.getElementById('towerModeBtn');
        if (isVisible(btn)) btn.click();
        return;
    } 
    
    if (key === 'a' && !e.shiftKey) {
        const btn = document.getElementById('abilityModeBtn');
        if (isVisible(btn)) btn.click();
        return;
    } 

    // --- 2. Extra Life (E) ---
    if (key === 'e') {
        // Try to find the life card by ID first, then by text content
        let extraLifeBtn = document.getElementById('extraLifeBtn');
        if (!extraLifeBtn) {
            extraLifeBtn = Array.from(document.querySelectorAll('.concept-tab-life')).find(el => el.textContent.includes('Life'));
        }

        // ONLY trigger if the button exists and is currently visible in the shop
        if (isVisible(extraLifeBtn)) {
            extraLifeBtn.click();
            extraLifeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        return;
    }

    // --- 3. Item Selection (1-9) supporting Czech Keyboard ---
    if (e.code.startsWith('Digit')) {
      const index = parseInt(e.code.replace('Digit', '')) - 1; 
      if (index < 0 || index > 8) return;
      
      const towerPanel = document.getElementById('towerShop');
      const abilityPanel = document.getElementById('abilityBar');
      
      // Logic for Towers: Only works if the Tower Panel is currently displayed
      if (isVisible(towerPanel)) {
        const towerItems = towerPanel.querySelectorAll('.concept-tower');
        if (towerItems[index]) {
          towerItems[index].click();
          towerItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } 
      // Logic for Abilities: Only works if the Ability Bar is currently displayed
      else if (isVisible(abilityPanel)) {
        const abilityCards = abilityPanel.querySelectorAll('.concept-ability');
        if (abilityCards[index]) {
          abilityCards[index].click();
          abilityCards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }

  drawRangeCircle(x, y, range, color = 'rgba(255, 255, 255, 0.2)') {
    this.ctx.beginPath();
    this.ctx.arc(x, y, range, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = color.replace('0.2', '0.5'); // Slightly darker border
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  destroy() {
    this.gameStarted = false;
    this.paused = true;

    // 1. Kill timers
    if (this.abilityTimerInterval) clearInterval(this.abilityTimerInterval);
    
    // 2. Kill keyboard listeners
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keydown', this.boundKeyStateDown);
    window.removeEventListener('keyup', this.boundKeyStateUp);

    // 3. Remove the canvas from the website entirely
    if (this.canvas && this.canvas.parentNode) {
        const parent = this.canvas.parentNode;
        const oldId = this.canvas.id;
        
        // Remove old one
        this.canvas.remove();
        
        // Create a brand new HTML element
        const newCanvas = document.createElement('canvas');
        newCanvas.id = oldId;
        newCanvas.width = 1230;  // Match your original width
        newCanvas.height = 600; // Match your original height
        newCanvas.style.width = '1230px';
        newCanvas.style.height = '600px';
        
        parent.appendChild(newCanvas);
        // Put it back in the DOM
    }

    this.ctx = null;
    this.canvas = null;
    // Defense in depth: with the listener leak above fixed this shouldn't
    // matter anymore (nothing external should still reference `this` once
    // main.js drops it), but drop the big object graph explicitly anyway
    // so a future stray reference can't accidentally keep a whole old
    // Map (+ all its pre-rendered canvases), towers and enemies alive.
    this.towers = null;
    this.enemies = null;
    this.map = null;
    this.abilityManager = null;
    document.getElementById('selectionIndicator').style.display = 'none';
  }

  updateSelectionUI() {
    if (!this.gameStarted || !this.uiSelectionBox) return;

    let displayTitle = "None";
    let displayPrice = 0;

    // 1. Zjistíme, jestli fyzicky na stránce existuje karta s 'placing'
    const activeAbilityCard = document.querySelector('.concept-ability.placing');
    
    if (activeAbilityCard && this.abilityManager.activeAbility) {
        // Pokud ano, vezmeme jméno té vybrané ability
        displayTitle = this.abilityManager.activeAbility.name;
    } 
    // 2. Pokud abilita nesvítí, zkusíme jestli svítí věž v shopu
    else {
        const activeShopItem = document.querySelector('.concept-tower.active');
        if (activeShopItem && this.selectedTowerType) {
            // Pokud svítí věž, vezmeme její jméno z dat
            displayTitle = this.towerTypes[this.selectedTowerType]?.name || this.selectedTowerType;
            displayPrice = this.towerTypes[this.selectedTowerType]?.price || this.price;
        }
    }

    // Nastavení textu (už to nebude psát jen "Tower" nebo "Ability", ale "Archer Tower" atd.)
    if(displayPrice){
      this.uiSelectionText.textContent = displayTitle+"(🪙"+displayPrice+" )";
    } else {
      this.uiSelectionText.textContent = displayTitle;
    }
    this.uiSelectionBox.style.display = "block";
  }

  // custom cursors
  renderCustomCursor() {
    const ctx = this.ctx;
    const x = this.mouseX;
    const y = this.mouseY;

    // Guard against non-finite coordinates reaching createRadialGradient()
    // below - it throws on those (unlike arc(), which just no-ops), and an
    // uncaught throw here happens inside loop()'s render() call, before
    // loop() re-schedules its own requestAnimationFrame - so it wouldn't
    // just skip a frame, it would silently freeze the entire game.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    ctx.save();
    // Reset transformation to ensure the cursor size doesn't change with map zoom
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // --- PRIORITY 1: ABILITY (Takes precedence over tower placement) ---
    if (this.abilityManager && this.abilityManager.activeAbility && this.abilityManager.activeAbility.isPlacing) {
        
        const time = Date.now();
        
        // --- DESIGN: MAGMATIC TARGETER ---
        // Outer rotating ring (visualizing a ritual/spell effect)
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FF4500';
        ctx.setLineDash([5, 10]); // Dashed line effect
        ctx.arc(x, y, 18, time / 200, (time / 200) + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Pulsating glowing core
        const pulse = Math.sin(time / 150) * 3;
        const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, 10 + pulse);
        innerGrad.addColorStop(0, '#FFFFFF'); // White (hottest point)
        innerGrad.addColorStop(0.2, '#FFFF00'); // Yellow
        innerGrad.addColorStop(0.5, '#FF8C00'); // Orange
        innerGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(x, y, 12 + pulse, 0, Math.PI * 2);
        ctx.fill();

    } 
    // --- PRIORITY 2: TOWER (HAMMER) ---
    else if (this.selectedTowerType) {
    
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 4);

      // --- HAMMER DESIGN (Refined head, dark metal, deep wood) ---
      // Handle (Wood) - Using a richer, darker wood tone
      ctx.fillStyle = '#8B4513'; // Deep Mahogany / Saddle Brown
      ctx.fillRect(-2, 0, 4, 22); 
      
      // Subtle wood grain detail (Optional AAA touch)
      ctx.fillStyle = '#5D2906'; 
      ctx.fillRect(-0.5, 4, 1, 14);

      // Hammer head (Steel)
      // Main body
      ctx.fillStyle = '#36454F'; // Dark Graphite
      ctx.fillRect(-10, -5.5, 20, 10);
      
      // Top highlight
      ctx.fillStyle = '#546E7A'; 
      ctx.fillRect(-10, -5.5, 20, 3);

      // Impact surfaces
      ctx.fillStyle = '#1C2E2E'; 
      ctx.fillRect(-10, -5.5, 3, 10); 
      ctx.fillRect(7, -5.5, 3, 10);    
    } else {
        const time = Date.now();
        ctx.translate(x, y);

        // Subtle, slower breathing effect
        // Now only moves by 1px instead of 2.5px
        const subtlePulse = Math.sin(time / 400) * 1; 

        // 1. Core Size (Increased by another ~10% for better visibility)
        const baseRadius = 8; 
        const coreRadius = baseRadius + subtlePulse;
        
        // --- 2. THE GLOW EFFECT (Pure White & Cyan mix) ---
        // Intense glow that breathes slightly with the core
        ctx.shadowBlur = 20 + (subtlePulse * 3);
        ctx.shadowColor = 'rgba(0, 255, 255, 0.9)'; // Cyan aura
        
        // Draw the pure white core
        ctx.fillStyle = '#FFFFFF'; 
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius, 0, Math.PI * 2); 
        ctx.fill();

        // Secondary glow layer for extra "pop"
        ctx.shadowBlur = 12 + (subtlePulse * 2);
        ctx.shadowColor = '#FFFFFF'; // White inner glow
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius * 0.7, 0, Math.PI * 2); 
        ctx.fill();

        // Reset shadow for performance
        ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}