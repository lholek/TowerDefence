// js/game/Map.js
import { MapTextures } from './MapTextures.js';

const SPECIAL_TILE_VISUAL_OFFSET = 6;

export default class Map {
    constructor(canvas, layout, tileSize = 80, opts = {}) {
        this.graphicsSettings = JSON.parse(localStorage.getItem('graphicsSettings')) || {};
        this.editorMode = Boolean(opts.editor);

        // If editorMode, install a deterministic PRNG for the duration of prerenders
        let _origRandom = null;
        if (this.editorMode) {
            _origRandom = Math.random;
            let _seed = 123456789;
            Math.random = function() {
                // LCG: deterministic sequence
                _seed = (_seed * 1664525 + 1013904223) >>> 0;
                return _seed / 4294967296;
            };
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 1. NORMALIZE GRID (Basics first)
        this.grid = this.normalizeLayout(layout);
        this.rows = this.grid.length;
        this.cols = this.grid[0].length;
        this.tileSize = tileSize;

        // 2. TERRAIN VARIATION (Required for visuals)
        // We do this BEFORE the road so the road knows what grass is underneath it
        this.terrainIndices = [];
        for (let r = 0; r < this.rows; r++) {
            this.terrainIndices[r] = [];
            for (let c = 0; c < this.cols; c++) {
                // Default to variant 0; real game will fill a variety later.
                this.terrainIndices[r][c] = 0;
            }
        }

        // 3. GENERATE VISUAL ASSETS
        // CRITICAL FIX: Generate the actual grass images BEFORE calling _prerenderRoad

        if (this.graphicsSettings.terrain === 'low') {
            this._generateGrassTilesLow();
        } else {
            this._generateGrassTiles();
        }

        if (!this.editorMode && this.grassVariants && this.grassVariants.length > 1) {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    this.terrainIndices[r][c] = Math.floor(Math.random() * this.grassVariants.length);
                }
            }
        }

        // 4. DETECT SPECIAL TILES
        this.starts = {}; 
        this.ends = {};
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const t = String(this.grid[r][c] ?? '');
                if (/^S/i.test(t)) this.starts[t] = { row: r, col: c };
                if (/^E/i.test(t)) this.ends[t] = { row: r, col: c };
            }
        }

        // 5. PATHS & CAMERA
        this.paths = this.generatePaths();

        const initialZoom = 1;
        // Calculate the center based on the actual map size vs canvas size
        const startX = (this.canvas.width - (this.cols * this.tileSize * initialZoom)) / 2;
        const startY = (this.canvas.height - (this.rows * this.tileSize * initialZoom)) / 2;

        this.camera = {
            x: startX, 
            y: startY,
            zoom: initialZoom, 
            dragging: false, 
            lastX: 0, 
            lastY: 0,
            minZoom: 0.3, 
            maxZoom: 1.7
        };

        // 6. INITIALIZE AAA ROAD SYSTEM (Prerendering)
        this.roadLayer = document.createElement('canvas');
        this.roadLayer.width = this.cols * this.tileSize;
        this.roadLayer.height = this.rows * this.tileSize;

        // 6b. Initialize Water Layer
        this.waterLayer = document.createElement('canvas');
        this.waterLayer.width = this.cols * this.tileSize;
        this.waterLayer.height = this.rows * this.tileSize;

        this.qualityWater = this.graphicsSettings.water || 'low';
        if (this.qualityWater === 'low') {
            this._prerenderWater();
        } else {
            this._prerenderWaterHigh();
        }

        // 6c. Initialize Grass, Sand and Snow Layers
        this.grassLayer = document.createElement('canvas');
        this.grassLayer.width = this.cols * this.tileSize;
        this.grassLayer.height = this.rows * this.tileSize;

        if (this.graphicsSettings.terrain === 'low') {
            this._prerenderGrass();
        } else{
            this._prerenderGrass();
        }

        // AAA Atmosphere settings
        this.sunDir = { x: 1, y: 1 }; 
        this.shadowOpacity = 0.4;

        // BAKE THE ROAD (Now safe because grass images exist)
        this._prerenderRoad();

        // Prerender vignette overlay and mountain foundation variants
        this._prerenderVignette(canvas.width, canvas.height);
        this._preRenderMountainFoundations(this.tileSize);

        // If in editor mode, ensure only one variant exists for variant sets
        if (this.editorMode) {
            try {
                if (this.mountainSet && Array.isArray(this.mountainSet) && this.mountainSet.length > 1) {
                    this.mountainSet = [this.mountainSet[0]];
                }
                if (this.grassVariants && Array.isArray(this.grassVariants) && this.grassVariants.length > 1) {
                    this.grassVariants = [this.grassVariants[0]];
                }
            } catch (e) {}
        }

        // Editor mode: generate one static canvas per object/version and attach
        if (this.editorMode) {
            try {
                // Trees
                try {
                    this.editorTreeLow = typeof this._preRenderTreeLow === 'function' ? this._preRenderTreeLow(this.tileSize) : null;
                } catch (e) { this.editorTreeLow = null; }
                try {
                    this.editorTreeHigh = typeof this._preRenderTreeHigh === 'function' ? this._preRenderTreeHigh(this.tileSize) : null;
                } catch (e) { this.editorTreeHigh = null; }

                // Portals (draw into dedicated canvases)
                try {
                    const pW = Math.round(this.tileSize * 3);
                    const pH = Math.round(this.tileSize * 3);
                    const pcLow = document.createElement('canvas'); pcLow.width = pW; pcLow.height = pH;
                    const pctxLow = pcLow.getContext('2d');
                    if (typeof this._drawMagicPortalLow === 'function') this._drawMagicPortalLow(pctxLow, pW/2, pH/2, 0);
                    this.editorPortalLow = pcLow;
                } catch (e) { this.editorPortalLow = null; }
                try {
                    const pW = Math.round(this.tileSize * 3);
                    const pH = Math.round(this.tileSize * 3);
                    const pcHigh = document.createElement('canvas'); pcHigh.width = pW; pcHigh.height = pH;
                    const pctxHigh = pcHigh.getContext('2d');
                    if (typeof this._drawMagicPortalHigh === 'function') this._drawMagicPortalHigh(pctxHigh, pW/2, pH/2, 0);
                    this.editorPortalHigh = pcHigh;
                } catch (e) { this.editorPortalHigh = null; }

                // Grass low/high (capture first variant)
                try {
                    const save = this.grassVariants ? this.grassVariants.slice() : null;
                    if (typeof this._generateGrassTilesLow === 'function') this._generateGrassTilesLow();
                    if (this.grassVariants && this.grassVariants[0]) {
                        const g = document.createElement('canvas'); g.width = this.tileSize; g.height = this.tileSize;
                        g.getContext('2d').drawImage(this.grassVariants[0], 0, 0);
                        this.editorGrassLow = g;
                    }
                    if (typeof this._generateGrassTiles === 'function') this._generateGrassTiles();
                    if (this.grassVariants && this.grassVariants[0]) {
                        const g2 = document.createElement('canvas'); g2.width = this.tileSize; g2.height = this.tileSize;
                        g2.getContext('2d').drawImage(this.grassVariants[0], 0, 0);
                        this.editorGrassHigh = g2;
                    }
                    if (save) this.grassVariants = save;
                } catch (e) { this.editorGrassLow = this.editorGrassLow || null; this.editorGrassHigh = this.editorGrassHigh || null; }

                // Water capture
                try {
                    const saveWL = this.waterLayer;
                    if (typeof this._prerenderWater === 'function') this._prerenderWater();
                    const wLow = document.createElement('canvas'); wLow.width = this.tileSize; wLow.height = this.tileSize;
                    wLow.getContext('2d').drawImage(this.waterLayer, 0, 0, this.tileSize, this.tileSize, 0, 0, this.tileSize, this.tileSize);
                    this.editorWaterLow = wLow;
                    if (typeof this._prerenderWaterHigh === 'function') this._prerenderWaterHigh();
                    const wHigh = document.createElement('canvas'); wHigh.width = this.tileSize; wHigh.height = this.tileSize;
                    wHigh.getContext('2d').drawImage(this.waterLayer, 0, 0, this.tileSize, this.tileSize, 0, 0, this.tileSize, this.tileSize);
                    this.editorWaterHigh = wHigh;
                    if (saveWL) this.waterLayer = saveWL;
                } catch (e) { this.editorWaterLow = this.editorWaterLow || null; this.editorWaterHigh = this.editorWaterHigh || null; }

                // Mountains
                try { this.editorMountainLow = typeof this._preRenderMountainLow === 'function' ? this._preRenderMountainLow(this.tileSize) : null; } catch(e){ this.editorMountainLow = null; }
                try { this.editorMountainHigh = typeof this._preRenderMountainHigh === 'function' ? this._preRenderMountainHigh(this.tileSize) : null; } catch(e){ this.editorMountainHigh = null; }
                
                // Editor lock: generate and cache a single mountain variant for the whole editor session.
                try {
                    this.mountainSet = [this._preRenderMountainParts(this.tileSize, 1.0)];
                    if (!this.cachedMountainLow) this.cachedMountainLow = this._preRenderMountainLow(this.tileSize);
                    if (!this.cachedMountainHigh) this.cachedMountainHigh = this._preRenderMountainHigh(this.tileSize);
                } catch (e) {
                    // ignore mountain locking errors
                }

                // Editor lock: pre-generate deterministic snow, sand, ice and lava textures now,
                // so later render() doesn't create a random variant on first paint.
                try {
                    this.snowTexture = this.graphicsSettings.terrain === 'low'
                        ? this._preRenderSnowLow(this.tileSize)
                        : this._preRenderSnowHigh(this.tileSize);
                    this.sandTexture = this.graphicsSettings.terrain === 'low'
                        ? this._preRenderSandLow(this.tileSize)
                        : this._preRenderSandHigh(this.tileSize);
                } catch (e) {
                    // ignore editor terrain caching errors
                }

            } catch (e) {
                // ignore editor asset generation errors
            }
        }

        // 7. INPUTS & FINAL SETUP
        this.canvas.addEventListener('mousedown', e => this.startDrag(e));
        this.canvas.addEventListener('mousemove', e => this.drag(e));
        this.canvas.addEventListener('mouseup', e => this.stopDrag());
        this.canvas.addEventListener('mouseleave', e => this.stopDrag());
        this.canvas.addEventListener('wheel', e => this.handleZoom(e));
        this.canvas.style.cursor = 'grab';

        // Getting quailty from local storage
        const treeQuality = this.graphicsSettings.trees || 'low';
        if (treeQuality === 'low') {
            this.cachedTree = this._preRenderTreeLow(this.tileSize);
        } else {
            this.cachedTree = this._preRenderTreeHigh(this.tileSize);
        }

        this.clampCamera();

        // 9. GAME QUALITY
        this.quality = localStorage.getItem('graphicsSetting') || 'low';

        // Restore Math.random if we hijacked it for editor deterministic prerenders
        if (this.editorMode && _origRandom) {
            Math.random = _origRandom;
        }
    }

    // Normalize: expects layout already as array-of-arrays
    normalizeLayout(layout) {
      if (!Array.isArray(layout) || layout.length === 0) {
        throw new Error("Invalid layout format — expect array of rows");
      }
      // If rows are strings, convert to single-char tokens (not recommended now)
      if (typeof layout[0] === 'string') {
        return layout.map(row => row.split('').map(ch => ch));
      }
      // If rows are arrays already - copy them
      if (Array.isArray(layout[0])) {
        return layout.map(row => row.slice());
      }
      throw new Error('Unsupported layout row format');
    }

    // Simple BFS pathfinder (grid, 4-neighbors) => returns array of {col,row} or null
    findPathBFS(start, end) {
      const sr = start.row, sc = start.col;
      const er = end.row, ec = end.col;

      const inBounds = (r,c) => r>=0 && r<this.rows && c>=0 && c<this.cols;
      const isWalkable = (r, c) => {
        const tok = String(this.grid[r][c] ?? '');

        // Regex breakdown:
        // ^(O|L)$      -> Matches exactly "O"
        // ^[SET]\d+$   -> Matches S, E
        const walkablePattern = /^(O|O\[SNW\]|O\[SND\])$|^[SE]\d+$/;

        return walkablePattern.test(tok);
      };

      const dirs = [[0,-1],[0,1],[-1,0],[1,0]]; // up,down,left,right
      const q = [];
      const prev = Array.from({length:this.rows}, ()=>Array(this.cols).fill(null));
      const seen = Array.from({length:this.rows}, ()=>Array(this.cols).fill(false));

      q.push({r:sr,c:sc});
      seen[sr][sc] = true;

      while (q.length) {
        const cur = q.shift();
        if (cur.r === er && cur.c === ec) break;

        for (const d of dirs) {
          const nr = cur.r + d[1];
          const nc = cur.c + d[0];
          if (!inBounds(nr,nc)) continue;
          if (seen[nr][nc]) continue;
          if (!isWalkable(nr,nc)) continue;
          seen[nr][nc] = true;
          prev[nr][nc] = cur;
          q.push({r: nr, c: nc});
        }
      }

      // if end not reached
      if (!seen[er][ec]) return null;

      // reconstruct path from end -> start
      const path = [];
      let cur = {r: er, c: ec};
      while (cur) {
        path.push({col: cur.c, row: cur.r});
        const p = prev[cur.r][cur.c];
        cur = p;
      }
      path.reverse();
      return path;
    }

    // Generate paths for all matching S# -> E# (S1 -> E1, S2->E2)
    generatePaths() {
      const paths = {};

      // Loop through every Start point (S1, S2...)
      for (const [startKey, startCoords] of Object.entries(this.starts)) {
        
        // Loop through every End point (E1, E2...)
        for (const [endKey, endCoords] of Object.entries(this.ends)) {

          // Create a unique key like "S1E2"
          const pathKey = startKey + endKey;

          // Calculate path specifically between these two points
          const path = this.findPathBFS(startCoords, endCoords);

          if (path && path.length > 0) {
            paths[pathKey] = path;
          } else {
            paths[pathKey] = []; // Empty array if no path possible
          }
        }
      }
      return paths;
    }

    // --- RENDER (keeps your original render but uses tokens) ---
    // In Map.js

    render(ctx, playerLifes = 0, towers = [], enemies = []) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.camera.x, this.camera.y);
        ctx.scale(this.camera.zoom, this.camera.zoom);

        // 1. Visible Area calculation
        const startCol = Math.max(0, Math.floor(-this.camera.x / (this.tileSize * this.camera.zoom)));
        const endCol = Math.min(this.cols, Math.ceil((this.canvas.width - this.camera.x) / (this.tileSize * this.camera.zoom)));
        const startRow = Math.max(0, Math.floor(-this.camera.y / (this.tileSize * this.camera.zoom)));
        const endRow = Math.min(this.rows, Math.ceil((this.canvas.height - this.camera.y) / (this.tileSize * this.camera.zoom)));

        const sX = startCol * this.tileSize;
        const sY = startRow * this.tileSize;
        const sW = (endCol - startCol) * this.tileSize;
        const sH = (endRow - startRow) * this.tileSize;

        // 2. PASS: BACKGROUND (Floor)
        ctx.drawImage(this.grassLayer, sX, sY, sW, sH, sX, sY, sW, sH);
        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const tok = String(this.grid[r][c]);
                const bounds = this.getTileBounds(c, r);
            
                if (tok === 'SNW' || tok === 'M' || tok === 'O[SNW]') {
                    if (!this.snowTexture)
                        this.snowTexture = (
                            this.graphicsSettings.terrain === 'low'
                                ? this._preRenderSnowLow(this.tileSize)
                                : this._preRenderSnowHigh(this.tileSize)
                        );
                    ctx.drawImage(this.snowTexture, bounds.x, bounds.y);
                } else if (tok === 'SND' || tok === 'O[SND]') {
                    if (!this.sandTexture)
                        this.sandTexture = (
                            this.graphicsSettings.terrain === 'low'
                                ? this._preRenderSandLow(this.tileSize)
                                : this._preRenderSandHigh(this.tileSize)
                    );
                    ctx.drawImage(this.sandTexture, bounds.x, bounds.y);
                }
            }
        }

        if (this.waterLayer) ctx.drawImage(this.waterLayer, sX, sY, sW, sH, sX, sY, sW, sH);
        ctx.drawImage(this.roadLayer, sX, sY, sW, sH, sX, sY, sW, sH);


        // --- HELPER: Sort dynamic entities into rows for performance ---
        // This allows us to draw them inside the row loop without searching arrays every time
        const rowTowers = new Array(this.rows).fill(null).map(() => []);
        const rowEnemies = new Array(this.rows).fill(null).map(() => []);

        // Organize Towers
        towers.forEach(t => {
            if(t.row >= startRow && t.row < endRow) {
                rowTowers[t.row].push(t);
            }
        });

        // Organize Enemies (Using fuzzy Y to determine visual row if they are moving)
        enemies.forEach(e => {
            // Calculate visual row based on Y position (center of entity)
            // Enemies might be between tiles, so we use their world Y to slot them correctly
            const r = Math.floor((e.y + this.tileSize * 0.2) / this.tileSize); 
            if(r >= startRow && r < endRow) {
                rowEnemies[r].push(e);
            }
        });


        // 3. PASS: THE WORLD (Y-Sorted Row-by-Row)
        for (let r = startRow; r < endRow; r++) {

            // LAYER 1: ENEMIES (Bottom)
            // Draw enemies belonging to this row
            for (const enemy of rowEnemies[r]) {
                enemy.render(ctx, this);
            }

            // LAYER 2: TOWERS (Middle)
            // Draw towers belonging to this row
            // Because this happens BEFORE mountains in the same loop, 
            // a Mountain at this row will draw OVER this tower (hiding it behind).
            for (const tower of rowTowers[r]) {
                tower.render(ctx, this);
            }

            // LAYER 3: MOUNTAINS & FOG (High)
            for (let c = startCol; c < endCol; c++) {
                const tok = String(this.grid[r][c]);
                const bounds = this.getTileBounds(c, r);
                const ts = this.tileSize;

                if (tok === 'M') {
                    const yOff = (ts * 1.6) - ts;
                    const mountainQuality = this.graphicsSettings.mountains || 'low';
                    if (mountainQuality === 'low') {
                        if (!this.cachedMountainLow) this.cachedMountainLow = this._preRenderMountainLow(ts);
                        ctx.drawImage(this.cachedMountainLow, bounds.x, bounds.y - yOff);
                    } else {
                        if (!this.mountainSet) this.mountainSet = this._preRenderMountainSet(ts);
                        const seed = Math.abs(r * 7 + c * 3) % this.mountainSet.length;
                        const p = this.mountainSet[seed];
                        const hasLeft = (c > 0 && String(this.grid[r][c - 1]) === 'M');
                        const hasRight = (c < this.cols - 1 && String(this.grid[r][c + 1]) === 'M');

                        // 1. Foundation
                        const mf = this.mountainFoundations;
                        if (hasLeft && hasRight) ctx.drawImage(mf.both, bounds.x, bounds.y);
                        else if (!hasLeft && hasRight) ctx.drawImage(mf.rightOnly, bounds.x, bounds.y);
                        else if (hasLeft && !hasRight) ctx.drawImage(mf.leftOnly, bounds.x, bounds.y);

                        // 2. Connector Fog
                        if (p && (hasLeft || hasRight)) { 
                            ctx.save();

                            let fogAlpha;
                            if (hasLeft && hasRight) {
                               // Deep between two mountains: Make it more visible/solid
                               fogAlpha = 0.5; 
                               ctx.globalCompositeOperation = "screen"; // Smooth brightening
                            } else {
                               // On the edge of a mountain range: Make it very subtle/faded
                               fogAlpha = 0.3;
                               ctx.globalCompositeOperation = "source-over"; // Normal blending for edges
                            }
                        
                            ctx.globalAlpha = fogAlpha;
                        
                            // Create a clipping mask so fog doesn't bleed onto other tiles
                            ctx.beginPath();
                            ctx.rect(bounds.x - 1, bounds.y - yOff, ts + 2, ts * 1.6);
                            ctx.clip();
                        
                            // Draw the mountain background texture as the "fog"
                            ctx.drawImage(p.bg, bounds.x, bounds.y - yOff);

                            ctx.restore();
                        }

                        // 3. Peaks
                        if (p) {
                            if (hasLeft) ctx.drawImage(p.left, bounds.x, bounds.y - yOff);
                            if (hasRight) ctx.drawImage(p.right, bounds.x, bounds.y - yOff);
                            ctx.drawImage(p.main, bounds.x, bounds.y - yOff);
                        }
                    }
                }
            }

            // LAYER 4: TREES & PORTALS (Top)
            // In editor mode we suppress Map's own drawing of trees/portals so
            // the editor overlay can render deterministic static images instead.
            if (!this.editorMode) {
                for (let c = startCol; c < endCol; c++) {
                    const tok = String(this.grid[r][c]);
                    const bounds = this.getTileBounds(c, r);
                    const ts = this.tileSize;
                    // Check for E followed by a number (e.g., E1, E2) but NOT "Enemy" or "Empty"
                    if (/^E\d+/.test(tok)) {
                        const actualImg = this.cachedTree;

                        if (actualImg) {
                            const scale = 1.2; 
                            const h = actualImg.height * scale;
                            const w = actualImg.width * scale;
                            ctx.drawImage(actualImg, 
                                bounds.x - (w - ts) / 2, 
                                bounds.y - (h - ts) - SPECIAL_TILE_VISUAL_OFFSET, 
                                w, h
                            );
                        }
                    }

                    // This will ignore "SNW" and "SND" because they have letters after S, not numbers
                    if (/^S\d+/.test(tok)) {
                        const portalX = bounds.x + ts/2;
                        const portalY = bounds.y + ts/2 - SPECIAL_TILE_VISUAL_OFFSET;
                        const time = performance.now();

                        const portalSetting = this.graphicsSettings.portals || 'low';

                        if (portalSetting === 'low') {
                            this._drawMagicPortalLow(ctx, portalX, portalY, time);
                        } else {
                            this._drawMagicPortalHigh(ctx, portalX, portalY, time);
                        }
                    }
                }
            }
        }

        ctx.restore();

        // 4. PASS: VIGNETTE
        ctx.drawImage(this.vignetteLayer, 0, 0);
    }

    // --- TILE / COORD conversions ---
    tileToWorld(col, row) {
      return {
        x: col * this.tileSize + this.tileSize / 2,
        y: row * this.tileSize + this.tileSize / 2
      };
    }

    worldToTile(x, y) {
      return {
        col: Math.floor(x / this.tileSize),
        row: Math.floor(y / this.tileSize)
      };
    }

    screenToWorld(screenX, screenY) {
      const rect = this.canvas.getBoundingClientRect();
      const worldX = (screenX - rect.left - this.camera.x) / this.camera.zoom;
      const worldY = (screenY - rect.top - this.camera.y) / this.camera.zoom;
      return { x: worldX, y: worldY };
    }

    getTileFromCoords(worldX, worldY) {
      const t = this.worldToTile(worldX, worldY);
      return {
        col: Math.max(0, Math.min(this.cols - 1, t.col)),
        row: Math.max(0, Math.min(this.rows - 1, t.row))
      };
    }

    isBuildableTile(col, row) {
      // bounds check
      if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    
      const tok = String(this.grid[row][col] ?? '');
    
      // Block paths and special start/end tiles
      if (tok === 'M') return false;
      if (tok === 'O' || tok === 'O[SNW]' || tok === 'O[SND]') return false; // path
      if (/^S\d+/i.test(tok)) return false; // start tiles like S1, S2
      if (/^E\d+/i.test(tok)) return false; // end tiles like E1, E2
      if (tok === '-') return false;        // blocked tiles
      if (tok === 'W') return false;        // blocked tiles
      if (tok === 'ICE') return false;      // ice terrain
      if (tok === 'LAVA') return false;     // lava terrain
    
      // everything else (X, B, L, etc.) is buildable
      return true;
    }

    getTileStatus(col, row) {
      if (col < 0 || col >= this.cols) return '!';
      if (row < 0 || row >= this.rows) return '!';
      return String(this.grid[row][col] ?? '');
    }

    // --- DRAG & ZOOM (keep your existing functions) ---
    startDrag(e) {
      if (e.button !== 1) return;
      this.camera.dragging = true;
      this.camera.lastX = e.clientX;
      this.camera.lastY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    }

    drag(e) {
      if (!this.camera.dragging) return;
      const dx = e.clientX - this.camera.lastX;
      const dy = e.clientY - this.camera.lastY;
      this.camera.x += dx;
      this.camera.y += dy;
      this.camera.lastX = e.clientX;
      this.camera.lastY = e.clientY;
      this.clampCamera();
    }

    stopDrag() {
      if (this.camera.dragging) {
        this.camera.dragging = false;
        this.canvas.style.cursor = 'grab';
        this.clampCamera();
      }
    }

    handleZoom(e) {
      e.preventDefault();
      const zoomFactor = 1.05;
      const screenX = e.clientX;
      const screenY = e.clientY;
      const before = this.screenToWorld(screenX, screenY);
      if (e.deltaY < 0) this.camera.zoom *= zoomFactor;
      else this.camera.zoom /= zoomFactor;
      this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.zoom, this.camera.maxZoom));
      const rect = this.canvas.getBoundingClientRect();
      this.camera.x = screenX - rect.left - before.x * this.camera.zoom;
      this.camera.y = screenY - rect.top - before.y * this.camera.zoom;
      this.clampCamera();
    }

    applyCameraTransform(ctx) { ctx.save(); ctx.translate(this.camera.x, this.camera.y); ctx.scale(this.camera.zoom, this.camera.zoom); }
    resetTransform(ctx) { ctx.restore(); }

    clampCamera() {
        // Use the actual internal pixel width/height of the canvas
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Always calculate map size including the current zoom
        const mapWidth = this.cols * this.tileSize * this.camera.zoom;
        const mapHeight = this.rows * this.tileSize * this.camera.zoom;
        
        // --- X Axis ---
        if (mapWidth <= canvasWidth) {
            // Map is smaller: Force it to stay in the middle
            this.camera.x = (canvasWidth - mapWidth) / 2;
        } else {
            // Map is larger: Clamp between 0 and the negative offset
            const minX = canvasWidth - mapWidth;
            const maxX = 0;
            this.camera.x = Math.min(maxX, Math.max(minX, this.camera.x));
        }
    
        // --- Y Axis ---
        if (mapHeight <= canvasHeight) {
            // Map is smaller: Force it to stay in the middle
            this.camera.y = (canvasHeight - mapHeight) / 2;
        } else {
            // Map is larger: Clamp between 0 and the negative offset
            const minY = canvasHeight - mapHeight;
            const maxY = 0;
            this.camera.y = Math.min(maxY, Math.max(minY, this.camera.y));
        }
    }

    isInsideMap(worldX, worldY) {
      const mapWidth = this.cols * this.tileSize;
      const mapHeight = this.rows * this.tileSize;
      return worldX >= 0 && worldX < mapWidth && worldY >= 0 && worldY < mapHeight;
    }

    getTileBounds(col, row) {
      return {
          x: Math.round(col * this.tileSize), // Use Math.round to prevent sub-pixel gaps
          y: Math.round(row * this.tileSize),
          width: this.tileSize,
          height: this.tileSize
      };
    }


    _seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

}
Object.assign(Map.prototype, MapTextures);