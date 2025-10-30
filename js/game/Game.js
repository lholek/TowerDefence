import Map from './Map.js';
import Enemy from './Enemy.js';
import Tower from './Tower.js';

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

    document.getElementById('overlayClose').addEventListener('click', () => this.togglePause());
    document.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'p') this.togglePause();
    });
  }

  async loadGameData(file) {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`Failed to load JSON: ${res.status}`);
    const data = await res.json();

    this.levelData = data.maps[0];
    this.towerTypes = this.levelData.towerTypes || {};
    this.loadMap(this.levelData.layout);
    console.log(this.map.path)
    this.levelData.levels.forEach(l => l.enemies.forEach(e => e._remaining = e.count));
    this.createTowerShop();
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
          this.showOverlayMessage('PAUSED');
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

    const rect = this.canvas.getBoundingClientRect();
    const worldPos = this.map.screenToWorld(e.clientX, e.clientY);
    const tile = this.map.getTileFromCoords(worldPos.x, worldPos.y);

    if (!this.map.isBuildableTile(tile.col, tile.row)) return;
    if (this.towers.some(t => t.col === tile.col && t.row === tile.row)) return;
    if (!this.selectedTowerType) return;

    const type = this.towerTypes[this.selectedTowerType];
    if (!type) return;

    if (this.playerCoins >= type.price) {
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
    const rect = this.canvas.getBoundingClientRect();
    const worldPos = this.map.screenToWorld(e.clientX, e.clientY, rect);

    const tower = this.towers.find(t => Math.hypot(t.x - worldPos.x, t.y - worldPos.y) < 20);
    if (tower) {
        const type = this.towerTypes[tower.typeKey];
        if (type) this.playerCoins += tower.sellPrice || Math.floor(type.price / 2);
        this.towers = this.towers.filter(t => t !== tower);
        this.updateUI();
        this.logEvent(`Sold tower "${type.name}"`);
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
          this.showOverlayMessage(`You lost. You survived for ${this.currentLevelIndex + 1} waves.`);
          this.overlayContent.innerHTML += `<br><button id="restartButton" class="btn big">Play Again</button>`;
          document.getElementById('restartButton').addEventListener('click', () => window.location.reload());
        }
        return false;
      }
      return true;
    });

    const remaining = level.enemies.reduce((s, it) => s + (it._remaining || 0), 0);
    if (remaining === 0 && this.enemies.length === 0) {
      this.currentLevelIndex++;
      if (this.currentLevelIndex >= this.levelData.levels.length) {
        this.showOverlayMessage(`You won. You survived for ${this.currentLevelIndex} waves.`);
        this.overlayContent.innerHTML += `<br><button id="restartButton" class="btn big">Play Again</button>`;
        document.getElementById('restartButton').addEventListener('click', () => window.location.reload());
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
    this.livesText.textContent = `Lives: ${this.playerLives}`;
    this.coinsText.textContent = `Coins: ${this.playerCoins}`;
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
        <div>Price: ${tower.price}</div>
        <div>Damage: ${tower.damage}</div>
        <div>Fire Rate: ${tower.fireRate} ms</div>
        <div>Range: ${tower.range}</div>
        <div>Speed: ${tower.speed}</div>
        <div>Sell Price: ${tower.sellPrice}</div>
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
    const lifeDiv = document.createElement('div');
    lifeDiv.className = 'shop-item';
    lifeDiv.innerHTML = `
      <div class="name">Extra Life</div>
      <div>Price: 10</div>
    `;
    shopDiv.appendChild(lifeDiv);

    lifeDiv.addEventListener('click', () => {
      if (this.playerCoins >= 10) {
        this.playerCoins -= 10;
        this.playerLives += 1;
        this.updateUI();
        this.logEvent("Player bought 1 life");
      } else {
        this.showOverlayMessage('Not enough coins!');
        setTimeout(() => this.gameOverlay.style.display = 'none', 900);
      }
    });
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.map) return;
    this.map.render(this.ctx);
    this.enemies.forEach(e => e.render(this.ctx));
    this.towers.forEach(t => t.render(this.ctx));
  }

  logEvent(text) {
    const div = document.createElement('div');
    div.textContent = text;
    this.eventsList.appendChild(div);
    if (this.eventsList.children.length > 30) this.eventsList.removeChild(this.eventsList.children[0]);
    this.eventsList.scrollTop = this.eventsList.scrollHeight;
  }
}
