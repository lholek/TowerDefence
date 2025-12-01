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
    this.playerLives = 10;

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
    this.livesText = document.getElementById('livesText');
    this.coinsText = document.getElementById('coinsText');
    this.progressBar = document.getElementById('progressBar');
    this.gameOverlay = document.getElementById('gameOverlay');
    this.overlayMessage = document.getElementById('overlayMessage');
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
    //document.getElementById('overlayClose').addEventListener('click', () => this.togglePause());
    /*document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'p') this.togglePause();
    });*/
  }

  async loadGameData(file) {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`Failed to load JSON: ${res.status}`);
    const data = await res.json();

    this.levelData = data.maps[0];
    this.playerCoins = this.levelData.startingCoins ?? 10;
    this.playerLives = this.levelData.startingLives ?? 10;
    this.towerTypes = this.levelData.towerTypes || {};
    this.loadMap(this.levelData.layout);

    // load abilities array if present
    this.abilityManager.loadFromConfigs(this.levelData.abilities || []);

    // Hide or show Abilities button depending on ability presence
    const abilityModeBtn = document.getElementById('abilityModeBtn');
    if (abilityModeBtn) {
      const hasAbilities = (this.levelData.abilities && this.levelData.abilities.length > 0);
      abilityModeBtn.style.display = hasAbilities ? 'block' : 'none';
    }

    this.levelData.levels.forEach(l => l.enemies.forEach(e => e._remaining = e.count));
    this.createTowerShop();
    this.createAbilityBar();
    this.setLevel(this.currentLevelIndex);
    this.updateUI();
}

  loadMap(layout) {
    this.map = new Map(this.canvas, layout);
  }

  start() {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.paused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  togglePause() {
      if (!this.gameStarted) return; // only if game started
      this.paused = !this.paused;
      if (this.paused) {
          this.showOverlayMessage('PAUSED - Press "P" to continue');
      } else {
          this.gameOverlay.style.display = 'none';
      }
  }

  showOverlayMessage(text) {
    this.overlayMessage.textContent = text;
    this.gameOverlay.style.display = 'flex';
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
      this.updateUI();
      this.logEvent(`Player built "${type.name}"`);
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
          this.updateUI();
          this.logEvent(`Sold tower "${type ? type.name : tower.typeKey}"`);
      }
  }

  loop(now) {
    const deltaTime = now - (this.lastTime || now);
    this.lastTime = now;
    if (!this.paused && this.gameStarted && this.playerLives > 0) {
      this.update(deltaTime);
      this.render();
    }
    requestAnimationFrame(this.loop.bind(this));
  }

  update(deltaTime) {
    // 1. Safety Checks
    if (!this.levelData) return;
    const level = this.levelData.levels[this.currentLevelIndex];

    let allWavesComplete = true; 

    // ----------------------------------------------------------------
    // 2. SPAWNING LOGIC (Sequential Phasing for Old Maps / Concurrent for New Maps)
    // ----------------------------------------------------------------

    const currentGroupIndex = level._currentGroupIndex;

    // Check if we are still processing items in the level's enemies array
    if (currentGroupIndex < level.enemies.length) {
        const item = level.enemies[currentGroupIndex];

        // We are not finished spawning all groups in the level sequence
        allWavesComplete = false;

        // --- If it is a NEW WAVE (with groups): Spawn all internal groups concurrently ---
        if (item.groups) {
            // A. Handle Wave Delay
            if (item._delayTimer > 0) {
                item._delayTimer -= deltaTime;
            } else {
                // B. Process Groups inside the Wave (Concurrent)
                let waveFinished = true;
                for (const group of item.groups) {
                    if (group._remaining > 0) {
                        waveFinished = false; // Wave is NOT finished

                        group._intervalTimer += deltaTime;

                        if (group._intervalTimer >= group.interval) {
                           group._intervalTimer -= group.interval; 
                           this.spawnEnemy(group);   
                           group._remaining--;
                        }
                    }
                }

                // C. Check if Wave (New Format) is completed
                if (waveFinished) {
                    level._currentGroupIndex++; // Move to next item in the sequence
                }
            }
        } 

        // --- If it is an OLD ENEMY group (Flat List): Spawn this item sequentially ---
        else {
             // 1. Spawning
             if (item._remaining > 0) {
                const spawnRate = item.fireRate || item.interval || 1000;

                // Ensure timer is initialized (if not done in setLevel for some reason)
                if (typeof item._intervalTimer === 'undefined') {
                    const itemFirstDelay = item.firstDelay || 0;
                    item._intervalTimer = spawnRate - itemFirstDelay;
                }

                item._intervalTimer += deltaTime;

                if (item._intervalTimer >= spawnRate) {
                  item._intervalTimer -= spawnRate; 
                  this.spawnEnemy(item); 
                  item._remaining--;
                }
             } 

             // 2. Check if Old Group is finished
             if (item._remaining === 0) {
                 level._currentGroupIndex++; // Move to next item in the sequence
             }
        }
    } 
    // --- End of Spawning Logic ---

    // ----------------------------------------------------------------
    // 3. UPDATE ENTITIES
    // ----------------------------------------------------------------
    this.enemies.forEach(e => e.update(deltaTime));
    this.towers.forEach(t => t.update(deltaTime, this.enemies));
    this.abilityManager.update(deltaTime);

    // ----------------------------------------------------------------
    // 4. REMOVE DEAD/ESCAPED ENEMIES & CHECK GAME OVER
    // ----------------------------------------------------------------
    this.enemies = this.enemies.filter(e => {
      // Case A: Enemy Killed
      if (e.health <= 0) {
        this.playerCoins += e.coinReward || 1;
        this.enemiesKilled++;
        this.updateUI();
        return false; 
      }

      // Case B: Enemy Reached End
      if (e.currentIndex >= e.path.length - 1) {
        this.playerLives--;
        this.updateUI();

        // Check for Game Over (Loss)
        if (this.playerLives <= 0) {
          this.gameStarted = false;
          this.showOverlayMessage(`You lost. You survived for ${this.currentLevelIndex + 1} waves. Returning to Main menu...`);
          setTimeout(() => this.resetGameToMenu(), 5000);
        }
        return false; 
      }

      return true; 
    });

    // ----------------------------------------------------------------
    // 5. LEVEL COMPLETION CHECK
    // ----------------------------------------------------------------
    // Level is complete if all groups are spawned (allWavesComplete is true) AND all enemies are defeated/gone.
    if (this.playerLives > 0 && allWavesComplete && this.enemies.length === 0) {
      this.currentLevelIndex++;

      if (this.currentLevelIndex >= this.levelData.levels.length) {
        // Game Won
        this.showOverlayMessage(`You won! You survived for ${this.currentLevelIndex} waves. Returning to Main menu...`);
        setTimeout(() => this.resetGameToMenu(), 5000);
        this.gameStarted = false;
      } else {
        // Start Next Level
        this.setLevel(this.currentLevelIndex);
      }
    }
  }

  // Helper method to spawn a single enemy based on config
  spawnEnemy(config) {
     // Default to S1E1 if no path is specified
     const pathKey = config.path || 'S1E1'; 
     const path = this.map.paths[pathKey];

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

    // --- NEW: Initialize the sequential tracking index for old maps ---
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
        item._delayTimer = item.delay || 0;

        if (item.groups) {
          item.groups.forEach(g => {
             g._remaining = g.count;

             const groupInterval = g.interval || 1000;
             const groupFirstDelay = g.firstDelay || 0;
             g._intervalTimer = groupInterval - groupFirstDelay;
          });
        }
      } 
      // Setup for Old Format (Flat Enemy List)
      else {
        item._remaining = item.count;

        const itemInterval = item.fireRate || item.interval || 1000;
        const itemFirstDelay = item.firstDelay || 0;
        item._intervalTimer = itemInterval - itemFirstDelay; 
      }
    });

    this.updateUI();
    this.logEvent(`Wave ${index + 1} started`);
  }
  
  updateUI() {
    this.levelText.textContent = `Level ${this.currentLevelIndex + 1}`;
    this.livesText.textContent = `❤️ Lives: ${this.playerLives}`;
    this.coinsText.textContent = `🪙 Coins: ${this.playerCoins}`;
    const percent = this.totalEnemiesInLevel === 0 ? 100 : (this.enemiesKilled / this.totalEnemiesInLevel) * 100;
    this.progressBar.style.width = `${percent}%`;
  }

  createTowerShop() {
    const shopDiv = document.getElementById('towerShop');
    shopDiv.innerHTML = '';

    for (const [key, tower] of Object.entries(this.towerTypes)) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <div class="name">${tower.name}</div>
        <div>🪙 Price: ${tower.price}</div>
        <div>⚔️ Damage: ${tower.damage}</div>
        <div>🕐 Fire Rate: ${tower.fireRate} ms</div>
        <div>💥 DPS: ${(tower.damage * 1000 / tower.fireRate).toFixed(2)}</div>
        <div>🎯 Range: ${tower.range}</div>
        <div>🗲 Speed: ${tower.speed}</div>
        <div>💰 Sell Price: ${tower.sellPrice}</div>
      `;
      shopDiv.appendChild(div);

      div.addEventListener('click', () => {
        if (this.selectedTowerType === key) {
          this.selectedTowerType = null;
          div.style.border = 'none';
        } else {
          this.selectedTowerType = key;
          shopDiv.querySelectorAll('.shop-item').forEach(i => i.style.border = 'none');
          div.style.border = `5px solid ${tower.color}`;
        }
      });
    }

    // Extra life item

    // --- Ensure lifePrice is initialized ---
    if (typeof this.lifePrice === 'undefined') {
      this.lifePrice = 10; // starting price
    }

    // --- Extra life item ---
    const lifeDiv = document.createElement('div');
    lifeDiv.className = 'shop-item';
    lifeDiv.innerHTML = `
      <div class="name">❤️ Extra Life</div>
      <div class="price">🪙 Price: ${this.lifePrice}</div>
    `;
    shopDiv.appendChild(lifeDiv);

    lifeDiv.addEventListener('click', () => {
      if (this.playerCoins >= this.lifePrice) {
        this.playerCoins -= this.lifePrice;
        this.playerLives += 1;
        this.updateUI();
        this.logEvent(`Player bought 1 life for ${this.lifePrice}`);
      
        // --- Price progression ---
        const nextPrices = [10, 25, 50, 75, 100, 150, 200];
        const currentIndex = nextPrices.indexOf(this.lifePrice);
        if (currentIndex !== -1 && currentIndex < nextPrices.length - 1) {
          this.lifePrice = nextPrices[currentIndex + 1];
        } else {
          this.lifePrice = 200; // cap at 200
        }
      
        // Update displayed price
        lifeDiv.querySelector('.price').textContent = `🪙 Price: ${this.lifePrice}`;
      } else {
        this.showOverlayMessage('Not enough coins!');
        setTimeout(() => this.gameOverlay.style.display = 'none', 900);
      }
    });
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

    for (const a of this.abilityManager.getAvailable()) {
      const card = document.createElement('div');
      card.className = 'ability-card';
      card.id = a.id;
      card.style.position = 'relative'; // ensure overlays position correctly
      // inner structure: icon, name, cooldown, duration, description
      card.innerHTML = `
       <div class="cooldown-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); pointer-events:none;"></div>
       <div class="cooldown-timer" style="position:absolute; right:6px; top:6px; color:#fff; font-weight:bold; pointer-events:none;"></div>
        <div class="ability-icon">${a.ui?.icon || ''}</div>
        <div class="ability-info">
          <div class="ability-name">${a.name}</div>
          <div class="ability-meta">
            <span class="ability-duration">🕒 Duration: ${a.effectDuration} ms</span>
            <span class="ability-cooldown">⏳ Cooldown: ${Math.max(0, (a.cooldown - (a.effectDuration||0)))} ms</span>
            <div class="ability-dmg">⚔️${a.description || ''}</div>
            <div class="ability-desc">${a.description_text || ''}</div>
            <div class="ability-timer" data-ability="${a.id}"></div>
          </div>
        </div>
      `;

      // save ref
      this.abilityCards[a.id] = { card, ability: a };

      // click toggles placing mode
      card.addEventListener('click', () => {
        if (this.abilityManager.activeAbility === a && a.isPlacing) {
          this.abilityManager.cancelActivePlacement();
          card.classList.remove('placing');
        } else {
          if (this.abilityManager.selectAbilityById(a.id)) {
            document.querySelectorAll('.ability-card').forEach(c => c.classList.remove('placing'));
            card.classList.add('placing');
          } else {
            this.logEvent(`${a.name} not ready`);
          }
        }
      });

      container.appendChild(card);
    }

    // start periodic updater to refresh timers (reads ability._lastUsed timestamps)
    this.abilityTimerInterval = setInterval(() => {
      const now = performance.now();
      for (const { card, ability } of Object.values(this.abilityCards)) {
        const overlay = card.querySelector('.cooldown-overlay');
        const timer = card.querySelector('.cooldown-timer');
        // no cooldown defined -> hide visuals
        if (!ability.cooldown) {
          if (overlay) overlay.style.display = 'none';
          if (timer) timer.textContent = '';
          continue;
        }
        // only treat abilities with an explicit numeric _lastUsed > 0 as "used"
        const last = ability._lastUsed;
        if (typeof last !== 'number' || last <= 0) {
          if (overlay) overlay.style.display = 'none';
          if (timer) timer.textContent = '';
          continue;
        }
        const remaining = Math.max(0, last + ability.cooldown - now);
        if (remaining > 0) {
          if (overlay) {
            overlay.style.display = 'block';
            const pct = (remaining / ability.cooldown) * 100;
            overlay.style.height = pct + '%';
            overlay.style.transition = 'height 250ms linear';
          }
          if (timer) {
            const sec = Math.ceil(remaining / 1000);
            timer.textContent = sec < 60 ? `00:${String(sec).padStart(2,'0')}` : `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
          }
        } else {
          if (overlay) overlay.style.display = 'none';
          if (timer) timer.textContent = '';
        }
      }
    }, 250);
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

    // update immediate timer text
    if (timer) {
      const updateOnce = () => {
        const now = performance.now();
        const remaining = Math.max(0, ability._lastUsed + ability.cooldown - now);
        const sec = Math.ceil(remaining / 1000);
        timer.textContent = sec < 60 ? `00:${String(sec).padStart(2,'0')}` : `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
        if (remaining <= 0) {
          timer.textContent = '';
        } else {
          // schedule next quick update
          setTimeout(updateOnce, Math.min(300, remaining));
        }
      };
      updateOnce();
    }
  }

  render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (!this.map) return;

      // Draw the map
      this.map.render(this.ctx);

      // --- Draw hovered tile (inside camera transform so it matches map) ---
      if (this.hoveredTile) {
          this.map.applyCameraTransform(this.ctx);
      
          const col = this.hoveredTile.col;
          const row = this.hoveredTile.row;
          const pos = this.map.tileToWorld(col, row);
          const x = pos.x;
          const y = pos.y;
      
          // --- Determine hover color ---
          let color = 'rgba(255,0,0,0.25)'; // default red (blocked)
      
          // --- TOWER --- //
          const status = this.map.getTileStatus(col, row);
          const hasTower = this.towers.some(t => t.col === col && t.row === row);
          let buildingTower = (this.abilityManager.activeAbility == null);
          if (buildingTower && status == 'X' && !hasTower) {
            color = 'rgba(0,255,0,0.25)'; // green only if status AND no tower
          }

          // --- LAVA FLOOR --- //
          if (!buildingTower) {
            if (status === 'O' || /^S\d*/i.test(status) || /^E\d*/i.test(status)) {
              color = 'rgba(0,255,0,0.25)'; // green if active ability
            }
          }

          this.ctx.fillStyle = color;
          const center = this.map.tileToWorld(col, row);
          const calculatedX = center.x - this.map.tileSize / 2;
          const calculatedY = center.y - this.map.tileSize / 2;
          this.ctx.fillRect(calculatedX, calculatedY, this.map.tileSize, this.map.tileSize);
        
          this.map.resetTransform(this.ctx);

          // render ability preview overlay (after map and before UI)
          if (this.abilityManager && typeof this.abilityManager.renderPreview === 'function') {
            this.abilityManager.renderPreview(this.ctx);
          }          
      }

      // Draw towers and enemies
      // --- OPTIMIZATION: Centralize Camera Transforms ---

      // 1. Apply camera transform ONCE
      this.map.applyCameraTransform(this.ctx);

      // 2. Draw all world-space items
      // We pass 'this.map' so render methods know the tileSize, etc.
      this.towers.forEach(t => t.render(this.ctx, this.map));
      
      // Also render all bullets under the same transform
      for (const tower of this.towers) {
          for (const bullet of tower.bullets) {
              bullet.render(this.ctx); // Bullet.js render is already correct
          }
      }

      this.enemies.forEach(e => e.render(this.ctx, this.map));
      
      // Assumes abilityManager.render also draws in world-space
      this.abilityManager.render(this.ctx);

      // 3. Reset transform ONCE
      this.map.resetTransform(this.ctx);

      // --- END OPTIMIZATION ---
  }

  logEvent(text) {
    const div = document.createElement('div');
    div.textContent = text;
    this.eventsList.appendChild(div);
    if (this.eventsList.children.length > 30) this.eventsList.removeChild(this.eventsList.children[0]);
    this.eventsList.scrollTop = this.eventsList.scrollHeight;
  }

  resetGame() {
    this.gameStarted = false;
    this.paused = false;

    this.enemies = [];
    this.towers = [];

    // Use dynamic defaults from current map if defined
    this.playerCoins = this.levelData?.startingCoins ?? 10;
    this.playerLives = this.levelData?.startingLives ?? 10;

    this.currentLevelIndex = 0;
    this.enemiesKilled = 0;
    this.spawnTimer = 0;

    this.gameOverlay.style.display = 'none';
    this.updateUI();

    // Show main menu overlay
    this.showOverlayMessage("Main Menu");
    this.overlayContent.innerHTML = `<br><button id="startButton" class="btn">Start Game</button>`;

    document.getElementById('startButton').addEventListener('click', () => {
      this.overlayContent.innerHTML = '';
      this.gameOverlay.style.display = 'none';
      this.setLevel(0);
      this.start();
    });
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

    // hide in-game overlay if visible
    if (this.gameOverlay) this.gameOverlay.style.display = 'none';

    // show the existing start overlay (main menu)
    const startOverlay = document.getElementById('startOverlay');
    if (startOverlay) {
      startOverlay.style.display = 'flex';
    }

    // restore dynamic defaults (if JSON provided)
    this.playerCoins = this.levelData?.startingCoins ?? 10;
    this.playerLives = this.levelData?.startingLives ?? 10;

    // reset UI
    this.updateUI();

    // reload map to reset positions (keeps same map loaded so dropdown still reflects choice)
    if (this.levelData) {
      this.loadMap(this.levelData.layout);
    }
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
}