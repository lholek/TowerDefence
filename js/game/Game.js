import Map from './Map.js';
import Enemy from './Enemy.js';
import Tower from './Tower.js';

// add near other imports
import AbilityManager from './abilities/AbilityManager.js';

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.towers = [];
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
    this.canvas.addEventListener('mouseleave', () => this.hoveredTile = null);

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
      const tower = new Tower(this.map, tile.col, tile.row);
      tower.range = type.range;
      tower.fireRate = type.fireRate;
      tower.damage = type.damage;
      tower.color = type.color;
      tower.bulletSpeed = type.speed || 3;
      tower.sellPrice = type.sellPrice || 1;
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
    if (!this.levelData) return;
    const level = this.levelData.levels[this.currentLevelIndex];

    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
        const nextType = level.enemies.find(e => e._remaining > 0);
        if (nextType) {
            this.enemies.push(
                new Enemy(this.map, this.map.path, 0, 0, nextType.speed, nextType.health, nextType.coinReward)
            );
            nextType._remaining--;
        }
        this.spawnTimer = 0;
    }

    this.enemies.forEach(e => e.update(deltaTime));
    this.towers.forEach(t => t.update(deltaTime, this.enemies));
    this.abilityManager.update(deltaTime);

    this.enemies = this.enemies.filter(e => {
      if (e.health <= 0) {
        this.playerCoins += e.coinReward || 1;
        this.enemiesKilled++;
        this.updateUI();
        return false;
      }
      if (e.currentIndex >= e.path.length - 1) {
        this.playerLives--;
        this.updateUI();
        if (this.playerLives <= 0) {
          this.gameStarted = false;
          this.showOverlayMessage(`You lost. You survived for ${this.currentLevelIndex + 1} waves.  Returning to Main menu...`);
          // return to the main start overlay (no reload)
          setTimeout(() => this.resetGameToMenu(), 5000); // slight delay so player sees the message
        }
        return false;
      }
      return true;
    });

    const remaining = level.enemies.reduce((s, it) => s + (it._remaining || 0), 0);
    if (this.playerLives > 0 && remaining === 0 && this.enemies.length === 0) {
      this.currentLevelIndex++;
      if (this.currentLevelIndex >= this.levelData.levels.length) {
        this.showOverlayMessage(`You won! You survived for ${this.currentLevelIndex} waves. Returning to Main menu...`);
        setTimeout(() => this.resetGameToMenu(), 5000);
        this.gameStarted = false;
      } else {
        this.setLevel(this.currentLevelIndex);
      }
    }
  }

  setLevel(index) {
    this.currentLevelIndex = index;
    this.enemiesKilled = 0;
    this.spawnTimer = 0;
    const level = this.levelData.levels[index];
    this.totalEnemiesInLevel = level.enemies.reduce((s, e) => s + (e.count || 0), 0);
    level.enemies.forEach(e => { if (e._remaining === undefined) e._remaining = e.count; });
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
          div.style.border = `3px solid ${tower.color}`;
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
      <div class="name">Extra Life</div>
      <div class="price">Price: ${this.lifePrice}</div>
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
        lifeDiv.querySelector('.price').textContent = `Price: ${this.lifePrice}`;
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

    for (const a of this.abilityManager.getAvailable()) {
      const card = document.createElement('div');
      card.className = 'ability-card';
      card.id = a.id;
      // inner structure: icon, name, cooldown, duration, description
      card.innerHTML = `
        <div class="ability-icon">${a.ui?.icon || ''}</div>
        <div class="ability-info">
          <div class="ability-name">${a.name}</div>
          <div class="ability-meta">
            <span class="ability-duration">🕒 Duration: ${a.effectDuration} ms</span>
            <span class="ability-cooldown">⏳ Cooldown: ${a.cooldown - a.effectDuration} ms</span>
            <div class="ability-dmg">⚔️${a.description || ''}</div>
            <div class="ability-desc">${a.description_text || ''}</div>
            <div class="ability-timer" data-ability="${a.id}"></div>
          </div>
        </div>
      `;

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
  }

  startAbilityCooldownTimer(ability, card) {
    const overlay = card.querySelector('.cooldown-overlay');
    if (!overlay) return;

    const cd = ability.cooldown;
    overlay.style.display = 'block';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.transition = `height ${cd}ms linear`;

    // Start shrinking overlay
    requestAnimationFrame(() => {
      overlay.style.height = '0%';
    });

    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.height = '100%';
    }, cd);
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
          if (!buildingTower && status == 'O') {
            color = 'rgba(0,255,0,0.25)'; // green if active ablity
          }
        
          this.ctx.fillStyle = color;
          const center = this.map.tileToWorld(col, row);
          const calculatedX = center.x - this.map.tileSize / 2;
          const calculatedY = center.y - this.map.tileSize / 2;
          this.ctx.fillRect(calculatedX, calculatedY, this.map.tileSize, this.map.tileSize);
        
          this.map.resetTransform(this.ctx);
      }

      // Draw towers and enemies
      this.towers.forEach(t => t.render(this.ctx));
      this.enemies.forEach(e => e.render(this.ctx));
      this.abilityManager.render(this.ctx);
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
    this.overlayContent.innerHTML = `<br><button id="startButton" class="btn big">Start Game</button>`;

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
}