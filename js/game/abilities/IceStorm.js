// abilities/IceStorm.js
// Targeted ability - freezes a stretch of path. Enemies standing on an icy
// tile move slower (enemy_slow) and take more damage from every source
// (enemy_vulnerability). The tile-selection logic is a copy of LavaFloor's
// on purpose, so each ability stays independent of the other.
import Ability from './Ability.js';
import { groupNum } from '../CardFx.js';

export default class IceStorm extends Ability {
  constructor(game, config = {}) {
    super(game, config);
    this.id = config.configId || this.id;
    this.selectionCount = config.selectionCount || config.selection_count || config.count || 3;

    // Same limits as the editor's steppers: slow 0-100 (so a hand-edited JSON
    // can't make enemies walk backwards), vulnerability 0 and up (no max).
    // enemy_slow 80 = enemies on the ice move 80% slower (20% of their speed)
    this.enemySlow = this._percent(config.enemy_slow, 80);
    // enemy_vulnerability 50 = enemies on the ice take +50% damage
    this.enemyVulnerability = this._percent(config.enemy_vulnerability, 50, Infinity);

    this.isPlacing = false;    // true while player selects tiles
    this.pendingSelections = []; // store selected tiles while in placing mode

    // AbilityManager.renderPreview / Game.renderCursor read these
    this.previewFill = 'rgba(120, 200, 255, 1)';
    this.previewStroke = 'rgba(30, 90, 170, 0.9)';
    this.cursorStyle = 'ice';
  }

  startPlacing() {
    if (!this.available()) return false;
    this.isPlacing = true;
    this.pendingSelections = [];
    return true;
  }

  cancelPlacing() {
    this.isPlacing = false;
    this.pendingSelections = [];
  }

  /* Getter dynamicDescription */
  get dynamicDescription() {
    return `-${this.enemySlow}% Enemy Speed / +${this.enemyVulnerability}% Damage taken`;
  }

  // Beta 1.1 card (see Ability.js)
  get cardTheme() {
    return 'concept-ice-storm';
  }

  get cardStats() {
    return {
      stat: `<span class="concept-num concept-good">-${groupNum(this.enemySlow)}%</span> Enemy Speed`,
      sub: `<span class="concept-num concept-good">+${groupNum(this.enemyVulnerability)}%</span> Damage taken`
    };
  }

  // True if an active ice tile of this ability lies at (col, row).
  // AbilityManager.updateIceEffects() uses this for every enemy each frame.
  coversTile(col, row) {
    return this.activeInstances.some(inst => inst.tile.col === col && inst.tile.row === row);
  }

  // Same BFS "snake" along the path as LavaFloor._getCenteredPathTiles.
  _getCenteredPathTiles(centerTile, count) {
    if (!this.game || !this.game.map || !centerTile || count <= 0) return [];

    const mapGrid = this.game.map.grid;
    if (!mapGrid || !Array.isArray(mapGrid) || mapGrid.length === 0) return [];

    const maxRows = mapGrid.length;
    if (maxRows === 0 || mapGrid[0].length === 0) return [];
    const maxCols = mapGrid[0].length;

    const { col: startCol, row: startRow } = centerTile;
    if (startRow < 0 || startRow >= maxRows || startCol < 0 || startCol >= maxCols) return [];

    const isPathTile = (type) =>
      type === 'O' ||
      type === 'O[SNW]' ||
      type === 'O[SND]' ||
      /^S\d+/.test(type) ||
      /^E\d+/.test(type);

    if (!isPathTile(mapGrid[startRow][startCol])) return [];

    const queue = [{ col: startCol, row: startRow }];
    const visited = new Set([`${startCol},${startRow}`]);
    const connectedTiles = [];
    const directions = [
      { dc: 0, dr: -1 },
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 },
      { dc: 1, dr: 0 }
    ];

    while (queue.length > 0 && connectedTiles.length < count) {
      const { col, row } = queue.shift();
      const currentType = mapGrid[row][col];

      // Only real road tiles get frozen - S/E markers just let the snake pass
      if (currentType === 'O' || currentType === 'O[SNW]' || currentType === 'O[SND]') {
        connectedTiles.push({ col, row });
      }

      for (const dir of directions) {
        const nextCol = col + dir.dc;
        const nextRow = row + dir.dr;
        const nextKey = `${nextCol},${nextRow}`;
        if (nextRow >= 0 && nextRow < maxRows && nextCol >= 0 && nextCol < maxCols && !visited.has(nextKey)) {
          if (isPathTile(mapGrid[nextRow][nextCol])) {
            visited.add(nextKey);
            queue.push({ col: nextCol, row: nextRow });
          }
        }
      }
    }

    return connectedTiles;
  }

  // override to handle placement click (we expect tile coords)
  handleCanvasClick(worldX, worldY) {
    const tile = this.game.map.getTileFromCoords(worldX, worldY);
    const tiles = this._getCenteredPathTiles(tile, this.selectionCount);

    if (!tiles || tiles.length === 0) {
      this.game.logEvent('Ability must be placed on the path.');
      return false;
    }

    this.activate(tiles);
    this.isPlacing = false;
    this.pendingSelections = [];

    const card = document.getElementById(this.id);
    if (card) {
      card.classList.remove('placing');
      card.classList.remove('selected');
    }

    if (this.game.abilityManager) {
      this.game.abilityManager.activeAbility = null;
      this.game.abilityManager.previewTiles = [];
    }

    this.game.updateSelectionUI();
    return true;
  }

  activate(tileList) {
    this.remainingCooldown = this.cooldown;

    // No onTick - the slow / vulnerability is applied per enemy by
    // AbilityManager.updateIceEffects(), these instances only mark the tiles.
    // Tiles of one use share a stormId, so render() draws one continuous
    // storm over them instead of a separate one per tile.
    this._stormCounter = (this._stormCounter || 0) + 1;
    const stormId = this._stormCounter;
    for (const t of tileList) {
      this.activeInstances.push({
        tile: t,
        stormId,
        durationLeft: this.effectDuration
      });
    }
    this.game.abilityManager.notifyAbilityUsed(this);
  }

  render(ctx) {
    const isActiveInManager = this.game.abilityManager?.activeAbility === this;
    if (this.activeInstances.length === 0 && (!isActiveInManager || !this.isPlacing)) {
      return;
    }

    const time = performance.now() * 0.001;
    const ts = this.game.map.tileSize;
    const quality = this.game.map.graphicsSettings.abilities || 'low';
    const colorObj = this._parseToRGB(this.color || 'rgba(44, 131, 186, 0.6)');

    // active storms, one per use
    const storms = new Map();
    for (const inst of this.activeInstances) {
      if (!storms.has(inst.stormId)) storms.set(inst.stormId, { tiles: [], durationLeft: inst.durationLeft });
      storms.get(inst.stormId).tiles.push(inst.tile);
    }

    for (const storm of storms.values()) {
      // fade in over the first 0.6 s, fade out over the last 1 s
      const elapsed = (this.effectDuration - storm.durationLeft) / 1000;
      const fade = Math.max(0, Math.min(1, elapsed / 0.6, storm.durationLeft / 1000));
      this._drawStorm(ctx, storm.tiles, colorObj, ts, time, quality, fade);
    }

    // placement preview: just the frozen ground, no storm
    if (isActiveInManager && this.isPlacing && this.pendingSelections.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      for (const t of this.pendingSelections) this._drawIceGround(ctx, t, colorObj, ts, 'low');
      ctx.restore();
    }
  }

  // Frozen ground of one tile - the ability's color, frosted edges and
  // (high) a few hairline cracks in the ice.
  _drawIceGround(ctx, tile, colorObj, ts, quality) {
    const c = this.game.map.tileToWorld(tile.col, tile.row);
    const x = c.x - ts / 2;
    const y = c.y - ts / 2;
    const base = this._adjustRGB(colorObj, -25);

    ctx.fillStyle = `rgba(${base.r}, ${base.g}, ${base.b}, 0.8)`;
    ctx.beginPath();
    ctx.roundRect(x - 2, y - 2, ts + 4, ts + 4, 4);
    ctx.fill();

    // frost creeping in from the edges
    const frost = ctx.createRadialGradient(c.x, c.y, ts * 0.25, c.x, c.y, ts * 0.75);
    frost.addColorStop(0, 'rgba(235, 248, 255, 0)');
    frost.addColorStop(1, 'rgba(235, 248, 255, 0.45)');
    ctx.fillStyle = frost;
    ctx.fillRect(x, y, ts, ts);

    if (quality === 'high') {
      ctx.strokeStyle = 'rgba(240, 250, 255, 0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const s = tile.col * 31 + tile.row * 17 + i * 7;
        const sx = x + ts * (0.15 + 0.7 * this._hash(s));
        const sy = y + ts * (0.15 + 0.7 * this._hash(s + 1));
        const a = this._hash(s + 2) * Math.PI * 2;
        const len = ts * (0.18 + 0.15 * this._hash(s + 3));
        const mx = sx + Math.cos(a) * len * 0.5 + (this._hash(s + 4) - 0.5) * ts * 0.08;
        const my = sy + Math.sin(a) * len * 0.5 + (this._hash(s + 5) - 0.5) * ts * 0.08;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(mx, my);
        ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
        // small side branch
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(a + 0.9) * len * 0.35, my + Math.sin(a + 0.9) * len * 0.35);
        ctx.stroke();
      }
    }
  }

  // One blizzard over all tiles of a use: swirling snow-fog, fast snow
  // streaks and lots of falling snow, plus an occasional white-out. No
  // sideways wind on purpose - the road can run in any direction, and a
  // storm blowing along it would look like it pushes the enemies forward.
  // Everything is clipped to the frozen tiles, so it reads as one zone.
  _drawStorm(ctx, tiles, colorObj, ts, time, quality, fade) {
    if (tiles.length === 0 || fade <= 0) return;

    ctx.save();
    // abilities draw on top of the enemies (Game.render) - keep the ground
    // about as see-through as Lava Floor's, so enemies stay visible
    ctx.globalAlpha = 0.6 * fade;
    for (const t of tiles) this._drawIceGround(ctx, t, colorObj, ts, quality);

    // clip to the frozen tiles + bounding box for the particles
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ctx.beginPath();
    for (const t of tiles) {
      const c = this.game.map.tileToWorld(t.col, t.row);
      const x = c.x - ts / 2, y = c.y - ts / 2;
      ctx.rect(x - 1, y - 1, ts + 2, ts + 2);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + ts); maxY = Math.max(maxY, y + ts);
    }
    ctx.clip();
    ctx.globalAlpha = fade;

    const W = maxX - minX;
    const H = maxY - minY;
    const wrap = (v, size) => ((v % size) + size) % size;
    const seed0 = tiles[0].col * 101 + tiles[0].row * 37;

    if (quality === 'high') {
      // 1. snow-fog banks swirling in place (no wind direction - the road
      // can run any way, so the storm must not push or hold the enemies)
      const mistCount = Math.max(2, Math.ceil(tiles.length / 3));
      for (let i = 0; i < mistCount; i++) {
        const s = seed0 + i * 13;
        const r = ts * (0.7 + 0.5 * this._hash(s));
        const ph = this._hash(s + 2) * Math.PI * 2;
        const mx = minX + this._hash(s + 1) * W + Math.sin(time * 0.35 + ph) * ts * 0.35;
        const my = minY + this._hash(s + 3) * H + Math.cos(time * 0.27 + ph) * ts * 0.2;
        const breath = 0.7 + 0.3 * Math.sin(time * 0.8 + ph);
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, r);
        g.addColorStop(0, `rgba(230, 245, 255, ${0.3 * breath})`);
        g.addColorStop(0.5, `rgba(230, 245, 255, ${0.12 * breath})`);
        g.addColorStop(1, 'rgba(230, 245, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(mx - r, my - r, r * 2, r * 2);
      }

      // 2. fast snow streaks falling straight down, tilted a little to
      // either side at random - no overall direction
      const lashCount = tiles.length * 2;
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < lashCount; i++) {
        const s = seed0 + 500 + i * 7;
        const speed = ts * (3 + 2 * this._hash(s));
        const len = ts * (0.25 + 0.2 * this._hash(s + 1));
        const tilt = (this._hash(s + 4) - 0.5) * 0.5; // -0.25 .. 0.25
        const lx = minX + this._hash(s + 2) * W;
        const ly = minY + wrap(this._hash(s + 3) * (H + len) + time * speed, H + len) - len;
        const a = 0.5 * (0.5 + 0.5 * Math.sin(time * 3 + i));
        ctx.strokeStyle = `rgba(240, 250, 255, ${a})`;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + len * tilt, ly + len);
        ctx.stroke();
      }
    }

    // 3. falling snow - far small dots and near bigger flakes; each one
    // sways left / right on its own, so the snow as a whole only goes down
    const flakeCount = tiles.length * (quality === 'high' ? 14 : 5);
    for (let i = 0; i < flakeCount; i++) {
      const s = seed0 + 1000 + i * 3;
      const near = this._hash(s) > 0.7;
      const speed = ts * (near ? 0.9 : 0.55) * (0.8 + 0.4 * this._hash(s + 1));
      const swayPh = this._hash(s + 5) * Math.PI * 2;
      const swayAmp = ts * (near ? 0.12 : 0.07);
      const fx = minX + this._hash(s + 2) * W + Math.sin(time * (1.2 + this._hash(s + 6)) + swayPh) * swayAmp;
      const fy = minY + wrap(this._hash(s + 3) * H + time * speed, H);
      const r = ts * (near ? 0.035 + 0.015 * this._hash(s + 4) : 0.015 + 0.01 * this._hash(s + 4));
      ctx.fillStyle = near ? 'rgba(245, 252, 255, 0.95)' : 'rgba(245, 252, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. white-out - every few seconds the storm thickens for a moment
    if (quality === 'high') {
      const phase = ((time + seed0 * 0.13) % 7) / 7;
      let w = 0;
      if (phase > 0.62 && phase <= 0.74) w = (phase - 0.62) / 0.12;
      else if (phase > 0.74 && phase < 0.9) w = 1 - (phase - 0.74) / 0.16;
      if (w > 0) {
        ctx.fillStyle = `rgba(235, 248, 255, ${0.22 * w})`;
        ctx.fillRect(minX, minY, W, H);
      }
    }

    ctx.restore();
  }

  // config value as a whole % in 0-100, fallback when missing / not a number
  _percent(value, fallback, max = 100) {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : fallback;
  }

  // stable pseudo-random 0..1 for a seed - keeps each storm's layout fixed
  _hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  stopPlacing() {
    this.isPlacing = false;
    this.pendingSelections = [];
    const card = document.getElementById(this.id);
    if (card) {
      card.classList.remove('placing');
      card.classList.remove('selected');
    }
  }

  _parseToRGB(color) {
    if (color.startsWith('rgb')) {
      const vals = color.match(/\d+/g);
      return { r: parseInt(vals[0]), g: parseInt(vals[1]), b: parseInt(vals[2]) };
    }
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(s => s + s).join('');
    return {
      r: parseInt(hex.substring(0, 2), 16) || 0,
      g: parseInt(hex.substring(2, 4), 16) || 0,
      b: parseInt(hex.substring(4, 6), 16) || 0
    };
  }

  _adjustRGB(rgb, percent) {
    const adj = (val) => Math.max(0, Math.min(255, Math.round(val + (val * (percent / 100)))));
    return { r: adj(rgb.r), g: adj(rgb.g), b: adj(rgb.b) };
  }

  // Preview: same tiles the click would freeze
  getPreviewTiles(worldX, worldY, map) {
    if (!map) return [];
    const tile = map.getTileFromCoords(worldX, worldY);
    if (!tile) return [];
    return this._getCenteredPathTiles(tile, this.selectionCount || 3) || [];
  }
}
