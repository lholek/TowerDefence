import Map from './Map.js';
import Enemy from './Enemy.js';
import Tower from './Tower.js';
import Bullet from './Bullet.js';

// add near other imports
import AbilityManager from './abilities/AbilityManager.js';

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
        leaks: 0,
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

    window.addEventListener('keydown', e => this.keys[e.code] = true);
    window.addEventListener('keyup', e => this.keys[e.code] = false);
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
        abilityModeBtn.style.display = hasAbilities ? 'block' : 'none';
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

  togglePause() {
      if (!this.gameStarted) return; // only if game started
      this.paused = !this.paused;
      if (this.paused) {
          returnPopup.style.display = 'flex';
      } else {
          returnPopup.style.display = 'none';
          this.gameOverlay.style.display = 'none';
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
      this.logEvent(`Player built <span style="color:${type.color}; font-weight:500;">${type.name}</span>`);
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
          this.playerCoins += tower.sellPrice ?? Math.floor(type.price / 2);
          this.towers = this.towers.filter(t => t !== tower);
          this.stats.towersSold++;
          this.updateUI();
          this.logEvent(`Player sold <span style="color:${type.color}; font-weight:500;">${type.name}</span>`);
      }
  }

  loop(now) {
    if (!this.gameStarted) return; // Exit the loop entirely

    // Calculate raw deltaTime
    const rawDeltaTime = now - (this.lastTime || now);
    this.lastTime = now;

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
    this.timeDisplay.textContent = this.formatTime(this.elapsedTime);

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
    this.abilityManager.abilities.forEach(ability => {
        ability.update(deltaTime);
        // This call ensures the UI (text/progress bars) reflects the new times
        this.abilityManager.updateAbilityUI(ability); 
    });

    // ----------------------------------------------------------------
    // 4. REMOVE DEAD/ESCAPED ENEMIES & CHECK GAME OVER
    // ----------------------------------------------------------------
    this.enemies = this.enemies.filter(e => {
        if (e.health <= 0) {
            this.playerCoins += e.coinReward;
            this.stats.goldEarned += e.coinReward;
            this.stats.enemiesKilled++; // Sync with main counter
            this.enemiesKilled++;
            this.updateUI();
            return false; 
        }
      
        if (e.currentIndex >= e.path.length - 1) {
            this.playerLifes--;
            this.stats.leaks++;
            this.updateUI();
        
            if (this.playerLifes <= 0) {
                this.gameStarted = false;
                // CHANGE: Remove setTimeout, add a button-based overlay
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
              <div style="color: #f87171;">💔 Life lost <span class="stats-detail">${fmt(this.stats.leaks)}</span></div>
              
              <div class="final-status-time">
                  ⏱️ Time Elapsed: ${timeString}
              </div>
            </div>
                <button id="btnContinueToMenu" class="btn btn-primary">Main Menu</button>
        </div>
    `;

    overlay.classList.remove('d-none');

    // 4. Button Logic
    // Main Menu
    document.getElementById('btnContinueToMenu').onclick = () => {
        overlay.classList.add('d-none');
        const gameSpeedSelect = document.getElementById('gameSpeedSelect');
        if (gameSpeedSelect) gameSpeedSelect.value = "1";
        this.resetGameToMenu(); 
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

    if (path && path.length > 0) {
      // Create enemy with the specific path for this group
      this.enemies.push(new Enemy(
        this.map, 
        path, 
        0, 0, 
        config.speed, 
        config.health, 
        config.coinReward
      ));
    } else {
      // Warn only if we expected a path but didn't find one
      console.warn(`Path '${pathKey}' not found! Check your map tokens (S#/E#) or JSON.`);
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

    this.levelText.textContent = `Level ${this.currentLevelIndex + 1} / ${totalLevels}`;
    
    this.lifesText.textContent = `❤️ ${this.playerLifes}`;
    this.coinsText.textContent = `🪙 ${this.playerCoins}`;
    
    const percent = this.totalEnemiesInLevel === 0 ? 100 : (this.enemiesKilled / this.totalEnemiesInLevel) * 100;
    this.progressBar.style.width = `${percent}%`;
  }

 createTowerShop() {
    const shopDiv = document.getElementById('towerShop');
    shopDiv.innerHTML = '';
    
    let index = 0;
    for (const [key, type] of Object.entries(this.towerTypes)) {
        index++;
        const item = document.createElement('div');
        
        // 1. Sync visual states
        item.className = 'shop-item' + (this.selectedTowerType === key ? ' active' : '');
        item.style.setProperty('--tower-color', type.color || '#fff');

        const dps = (type.damage * 1000 / type.fireRate).toFixed(1);
        const sellPrice = type.sellPrice || Math.floor(type.price / 2);

        // 2. Generate zoomed tower image
        const tempTower = new Tower(this, this.map, 0, 0, type);
        const src = tempTower.preRenderedImage;
        
        const zoomCanvas = document.createElement('canvas');
        zoomCanvas.width = 120; 
        zoomCanvas.height = 140;
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

        const nameLength = type.name.length;
        const fontSize = nameLength > 12 ? '13px' : '16px';

        item.innerHTML = `
            <div class="index">${index}</div>
            <div class="tower-card-main">
                <img src="${zoomCanvas.toDataURL()}" class="shop-tower-img" />
                <div class="tower-info">
                    <div class="name" style="font-size: ${fontSize}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${type.name}">
                      ${type.name}
                    </div>
                    <div class="price">🪙 ${type.price}</div>
                    <div class="sell-price">💰 Sell:  ${sellPrice}</div>
                    <div class="dps">💥DPS: ${dps}</div>
                </div>
            </div>
            <div class="tower-stats-hover">
                <div> 🪙 Price: ${type.price}</div>
                <div>💥DPS: ${dps}</div>
                <div>⚔️ Damage: ${type.damage}</div>
                <div>🎯 Range: ${(type.range / this.map.tileSize).toFixed(1)}</div>
                <div>⏱️ Fire  Rate: ${(type.fireRate)}ms</div>
                <div>🗲 speed: ${(type.range / this.map.tileSize)}</div>
            </div>
        `;

        // 3. Selection logic (Crucial for number keys)
        item.onclick = () => {
            // 1. Update the logical selection
            this.selectedTowerType = (this.selectedTowerType === key) ? null : key;

            // 2. Instead of rebuilding the whole shop, just toggle the 'active' class
            const allItems = shopDiv.querySelectorAll('.shop-item');
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
      card.className = 'ability-card';
      card.id = a.configId || a.id;
      card.style.position = 'relative'; // ensure overlays position correctly
      // inner structure: icon, name, cooldown, duration, description
      card.innerHTML = `
          <div class="cooldown-overlay" style="display:none; position:absolute; bottom:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); pointer-events:none; z-index:5;"></div>
    
          <div class="cooldown-timer" style="position:absolute; left:6px; top:6px; color:#fff; font-weight:bold; pointer-events:none; z-index:10; font-size:12px;"></div>
    
          <div class="duration-timer" style="position:absolute; right:6px; top:6px; color:#4ade80; font-weight:bold; pointer-events:none; z-index:10; font-size:12px; text-shadow: 1px 1px 2px #000;"></div>
          
          <div class="index">${index}</div>
          <div class="ability-name" 
               style="font-size: ${a.name.length > 15 ? '12px' : '16px'};">
            ${a.name}
          </div>
          <div class="ability-icon">${a.ui?.icon || ''}</div>
          <div class="ability-info">
            <div class="ability-meta">
              <div class="ability-times">
                ${a.effectDuration ? `<span class="ability-duration">🕒 ${a.effectDuration/1000} s</span>` : ''}
                <span class="ability-cooldown">⏳ ${a.cooldown/1000} s</span>
              </div>

              <div class="ability-dmg">${a.dynamicDescription}</div>

              <div class="ability-desc">
                ${a.constructor.name === 'LavaFloor' 
                  ? `Target: ${a.selectionCount} tiles` 
                  : ``}
              </div>
            </div>
          </div>
      `;
      // save ref
      this.abilityCards[a.id] = { card, ability: a };

      // placing Abilites
      let placingAbilitesIds = ["lava_floor"];

      // click toggles placing mode
      card.addEventListener('click', () => {
        if (this.abilityManager.activeAbility === a && a.isPlacing) {
          this.abilityManager.cancelActivePlacement();
          card.classList.remove('placing');
        } else {
          if (this.abilityManager.selectAbilityById(a.id)) {
            document.querySelectorAll('.ability-card').forEach(c => c.classList.remove('placing'));
            card.classList.add('placing');
            this.updateSelectionUI();
          } else {
            this.logEvent(`${a.name} not ready`);
          }
        }
      });

      container.appendChild(card);
    }

    // start periodic updater to refresh timers (reads ability._lastUsed timestamps)
    this.abilityTimerInterval = setInterval(() => {
    // If game is paused, we don't update the UI numbers to avoid jumping
    if (this.paused) return; 

    for (const { card, ability } of Object.values(this.abilityCards)) {
        const cooldownOverlay = card.querySelector('.cooldown-overlay');
        const cooldownTimer = card.querySelector('.cooldown-timer');
        const durationTimer = card.querySelector('.duration-timer');

        // --- 1. RELOAD LOGIC (Left Corner) ---
        const remaining = ability.remainingCooldown || 0;
        if (remaining > 0) {
            if (cooldownOverlay) {
                cooldownOverlay.style.display = 'block';
                // Height shrinks as cooldown finishes
                const pct = (remaining / ability.cooldown) * 100;
                cooldownOverlay.style.height = pct + '%';
            }
            if (cooldownTimer) {
                cooldownTimer.textContent = (remaining / 1000).toFixed(1) + "s";
            }
        } else {
            if (cooldownOverlay) cooldownOverlay.style.display = 'none';
            if (cooldownTimer) cooldownTimer.textContent = '';
        }

        // --- 2. DURATION LOGIC (Right Corner) ---
        if (ability.activeInstances && ability.activeInstances.length > 0) {
            // Find the instance with the most time remaining
            const maxDur = Math.max(0, ...ability.activeInstances.map(i => i.durationLeft || 0));
            
            if (maxDur > 0 && durationTimer) {
                durationTimer.textContent = (maxDur / 1000).toFixed(1) + "s";
                card.style.boxShadow = "inset 0 0 10px #4ade80"; // Visual active glow
            } else if (durationTimer) {
                durationTimer.textContent = '';
                card.style.boxShadow = "";
            }
        } else if (durationTimer) {
            durationTimer.textContent = '';
            card.style.boxShadow = "";
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
    lifeButton.className = 'switch-btn life-purchase-btn';
    lifeButton.innerHTML = `❤️ +1 Life (🪙 ${currentPrice}) [E]`;

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
            lifeButton.innerHTML = `❤️ +1 Life (🪙 ${currentPrice}) [E]`;

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
        
      if (isPlacingTower && !isPlacingAbility) {
          // TOWER MODE: Green on Grass, Snow, and Sand
          const isBuildableTerrain = (status === 'X' || status === 'SNW' || status === 'SND');
          if (isBuildableTerrain && !hasTower) {
              color = 'rgba(0,255,0,0.25)'; // GREEN
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
      const center = this.map.tileToWorld(col, row);
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

    if (this.shakeDuration > 0) {
      this.ctx.restore(); 
    }
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
        leaks: 0,
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
            extraLifeBtn = Array.from(document.querySelectorAll('.shop-item')).find(el => el.textContent.includes('Life'));
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
        const towerItems = towerPanel.querySelectorAll('.shop-item');
        if (towerItems[index]) {
          towerItems[index].click();
          towerItems[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      } 
      // Logic for Abilities: Only works if the Ability Bar is currently displayed
      else if (isVisible(abilityPanel)) {
        const abilityCards = abilityPanel.querySelectorAll('.ability-card');
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
    document.getElementById('selectionIndicator').style.display = 'none';
  }

  updateSelectionUI() {
    if (!this.gameStarted || !this.uiSelectionBox) return;

    let displayTitle = "None";

    // 1. Zjistíme, jestli v HTML "svítí" nějaká abilita
    const activeAbilityCard = document.querySelector('.ability-card.placing');
    
    // 2. Zjistíme, jestli v HTML "svítí" nějaká věž
    const activeShopItem = document.querySelector('.shop-item.active');

    // --- LOGIKA PRIORIT ---

    if (activeAbilityCard && this.abilityManager && this.abilityManager.activeAbility) {
        // Pokud svítí abilita, vezmeme její jméno z objektu
        displayTitle = this.abilityManager.activeAbility.name || "Ability";
    } 
    else if (activeShopItem && this.selectedTowerType) {
        // Pokud nesvítí abilita, ale svítí věž, vezmeme jméno z towerTypes
        const towerData = this.towerTypes[this.selectedTowerType];
        displayTitle = towerData?.name || this.selectedTowerType;
    }

    // Nastavení výsledného textu do UI
    this.uiSelectionText.textContent = displayTitle;
    this.uiSelectionBox.style.display = "block";
}
}