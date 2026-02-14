// js/game/Map.js
/*
X - Grass
SND - Sand
SNW - Snow
O - Road
O[SNW] - Snowy Road
O[SND] - Sandy Road
S* - Start (S1, S2...) [Portal]
E* - End (E1, E2...) [Tree]
W - Water (impassable, non-buildable, shootable)
M - Mountain (impassable, non-buildable, non-shootable)
- - Air(impassable, non-buildable, shootable)
*/
export default class Map {
  constructor(canvas, layout, tileSize = 80) {
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
            this.terrainIndices[r][c] = Math.floor(Math.random() * 10);
        }
    }

    // 3. GENERATE VISUAL ASSETS
    // CRITICAL FIX: Generate the actual grass images BEFORE calling _prerenderRoad
    this._generateGrassTiles();

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
    this.camera = {
        x: (this.canvas.width - (this.cols * this.tileSize)) / 2, // Center horizontally
        y: (this.canvas.height - (this.rows * this.tileSize)) / 2, // Center vertically
        zoom: 1, 
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
    this._prerenderWater();

    // 6c. Initialize Grass Layer
    this.grassLayer = document.createElement('canvas');
    this.grassLayer.width = this.cols * this.tileSize;
    this.grassLayer.height = this.rows * this.tileSize;
    this._prerenderGrass();
    
    // AAA Atmosphere settings
    this.sunDir = { x: 1, y: 1 }; 
    this.shadowOpacity = 0.4;

    // BAKE THE ROAD (Now safe because grass images exist)
    this._prerenderRoad();

    // 7. INPUTS & FINAL SETUP
    this.canvas.addEventListener('mousedown', e => this.startDrag(e));
    this.canvas.addEventListener('mousemove', e => this.drag(e));
    this.canvas.addEventListener('mouseup', e => this.stopDrag());
    this.canvas.addEventListener('mouseleave', e => this.stopDrag());
    this.canvas.addEventListener('wheel', e => this.handleZoom(e));
    this.canvas.style.cursor = 'grab';

    // Getting quailty from local storage
    this.quality = localStorage.getItem('graphicsSetting') || 'low';
    if (this.quality === 'low') {
        this.cachedTree = this._preRenderTreeLow(this.tileSize);
        this.cachedMountainLow = this._preRenderMountainLow(this.tileSize);
    } else {
        this.cachedTree = this._preRenderTreeHigh(this.tileSize);
        this.mountainSet = this._preRenderMountainSet(this.tileSize);
    }

    this.clampCamera();

    this.snowTexture = this._preRenderSnow(this.tileSize);
    this.sandTexture = this._preRenderSand(this.tileSize);

    // 9. GAME QUALITY
    this.quality = localStorage.getItem('graphicsSetting') || 'low';
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

  _generateGrassTiles() {
    this.grassVariants = [];
    const baseColors = ['#3f7d3c', '#376d35', '#4a8c46'];

    for (let i = 0; i < 10; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const tctx = canvas.getContext('2d');

        // 1. Base Layer: Gradient for subtle lighting depth
        tctx.fillStyle = baseColors[i % baseColors.length];
        tctx.fillRect(0, 0, this.tileSize, this.tileSize);

        // 2. Flora Layer: Natural distribution
        // Reduced to 45 iterations to keep it "clean" but detailed
        for (let j = 0; j < 3; j++) {
            const lx = Math.random() * this.tileSize;
            const ly = Math.random() * this.tileSize;
            tctx.save();
            tctx.translate(lx, ly);
            tctx.rotate(Math.random() * Math.PI);
            
            const roll = Math.random();

            if (roll < 0.015) { 
                // VERY RARE: Red flower
                this._drawNaturalFlower(tctx, "#e11d48");
            } 
            else if (roll < 0.03) { 
                // VERY RARE: Pink flower
                this._drawNaturalFlower(tctx, "#f472b6");
            } 
            else if (roll < 0.045) { 
                // VERY RARE: Blue flower
                this._drawNaturalFlower(tctx, "#3b82f6");
            } 
            else if (roll < 0.10) { 
                // RARE: Yellow flower
                this._drawNaturalFlower(tctx, "#facc15");
            } 
            else if (roll < 0.25) { 
                // UNCOMMON: Dry brown leaf
                tctx.fillStyle = "#8a5a23";
                tctx.beginPath();
                tctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
                tctx.fill();
            }
            else if (roll < 0.60) { 
                // COMMON: Dark green leaf
                tctx.fillStyle = "#14532d"; 
                tctx.beginPath();
                tctx.ellipse(0, 0, 3, 1.2, 0, 0, Math.PI * 2);
                tctx.fill();
            } 
            else { 
                // COMMON: Light green leaf
                tctx.fillStyle = "#1a9c4d";
                tctx.beginPath();
                tctx.ellipse(0, 0, 3, 1.2, 0, 0, Math.PI * 2);
                tctx.fill();
            }
            
            tctx.restore();
        }
        this.grassVariants.push(canvas);
    }
  }

  _drawNaturalFlower(ctx, color) {
    // 1. Organic Ground Shadow (Soft and slightly offset)
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0.8, 0.8, 2.8, 2.2, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Petal Layers
    for(let k = 0; k < 5; k++) {
        ctx.save();
        ctx.rotate((Math.PI * 2) / 5 * k);
        
        // A. Petal Gradient (Darker at the base, brighter at the tip)
        const pGrad = ctx.createRadialGradient(0, 0, 0, 2, 0, 3);
        pGrad.addColorStop(0, this._adjustColor(color, -20)); // Deep center
        pGrad.addColorStop(1, color); // Bright edge
        
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        // Use an irregular ellipse for more natural look
        ctx.ellipse(1.8, 0, 2.0, 1.4, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // B. Subtle Petal Vein (Small highlight line)
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0.5, 0);
        ctx.lineTo(2.5, 0);
        ctx.stroke();
        
        ctx.restore();
    }

    // 3. 3D Flower Center (Pollen Core)
    // Dark base for depth
    ctx.fillStyle = "#854d0e"; 
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright Pollen dots
    ctx.fillStyle = "#fef08a"; 
    ctx.beginPath();
    ctx.arc(-0.3, -0.3, 1.1, 0, Math.PI * 2); // Slightly offset for light source
    ctx.fill();
    
    // Tiny detail dots
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(0.2, 0.2, 0.6, 0.6);
    ctx.fillRect(-0.5, 0.4, 0.5, 0.5);
  }

  // Helper to make petal bases darker automatically
  _adjustColor(hex, amt) {
      let usePound = false;
      if (hex[0] == "#") { hex = hex.slice(1); usePound = true; }
      let num = parseInt(hex, 16);
      let r = (num >> 16) + amt;
      let g = (num >> 8 & 0x00FF) + amt;
      let b = (num & 0x0000FF) + amt;
      r = Math.max(Math.min(255, r), 0);
      g = Math.max(Math.min(255, g), 0);
      b = Math.max(Math.min(255, b), 0);
      return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
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
                if (!this.snowTexture) this.snowTexture = this._preRenderSnow(this.tileSize);
                ctx.drawImage(this.snowTexture, bounds.x, bounds.y);
            } 
            else if (tok === 'SND' || tok === 'O[SND]') {
                if (!this.sandTexture) this.sandTexture = this._preRenderSand(this.tileSize);
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
                if (this.quality === 'low') {
                    if (!this.cachedMountainLow) this.cachedMountainLow = this._preRenderMountainLow(ts);
                    ctx.drawImage(this.cachedMountainLow, bounds.x, bounds.y - yOff);
                } else {
                    if (!this.mountainSet) this.mountainSet = this._preRenderMountainSet(ts);
                    const seed = Math.abs(r * 7 + c * 3) % this.mountainSet.length;
                    const p = this.mountainSet[seed];
                    const hasLeft = (c > 0 && String(this.grid[r][c - 1]) === 'M');
                    const hasRight = (c < this.cols - 1 && String(this.grid[r][c + 1]) === 'M');

                    // 1. Foundation
                    ctx.fillStyle = "#242c3d";
                    if (hasLeft && hasRight) ctx.fillRect(bounds.x, bounds.y, ts, ts);
                    else if (!hasLeft && hasRight) ctx.fillRect(bounds.x + ts * 0.4, bounds.y, ts * 0.6, ts);
                    else if (hasLeft && !hasRight) ctx.fillRect(bounds.x, bounds.y, ts * 0.6, ts);

                    // 2. Connector Fog
                    if (p && (hasLeft || hasRight)) { 
                        ctx.save();
                        let fogAlpha;
                        if (hasLeft && hasRight) {
                           fogAlpha = 0.6;
                           // surrounded → darker fog
                        } else if (hasLeft || hasRight) {
                           fogAlpha = 0.5;
                           // edge → medium fog
                        } else {
                           fogAlpha = 0.75;
                           // isolated → lighter fog 
                        }
                    
                        ctx.globalAlpha = fogAlpha;
                        ctx.globalCompositeOperation = "lighter";
                        ctx.beginPath();
                        ctx.rect(bounds.x - 1, bounds.y - yOff, ts + 2, ts * 1.6);
                        ctx.clip();
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
        for (let c = startCol; c < endCol; c++) {
            const tok = String(this.grid[r][c]);
            const bounds = this.getTileBounds(c, r);
            const ts = this.tileSize;
            console.log()
            // Check for E followed by a number (e.g., E1, E2) but NOT "Enemy" or "Empty"
            if (/^E\d+/.test(tok)) {
                const actualImg = this.cachedTree;
                // If High quality tree is missing (init logic order), simple fallback or ensure init

                if (actualImg) {
                    const isLife = (tok === 'L');
                    const scale = isLife ? 1.6 : 1.0; 
                    const h = actualImg.height * scale;
                    const w = actualImg.width * scale;
                    ctx.drawImage(actualImg, 
                        bounds.x - (w - ts) / 2, 
                        bounds.y - (h - ts), 
                        w, h
                    );
                }
            }

            // This will ignore "SNW" and "SND" because they have letters after S, not numbers
            if (/^S\d+/.test(tok)) {
                const portalX = bounds.x + ts/2;
                const portalY = bounds.y + ts/2;
                const time = performance.now();
                if (this.quality === 'low') this._drawMagicPortalLow(ctx, portalX, portalY, time);
                else this._drawMagicPortalHigh(ctx, portalX, portalY, time);
            }
        }
    }

    ctx.restore();

    // 4. PASS: VIGNETTE
    const vGrad = ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
        this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.8
    );
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, 'rgba(0,5,15,0.4)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    const mapWidth = this.cols * this.tileSize * this.camera.zoom;
    const mapHeight = this.rows * this.tileSize * this.camera.zoom;

    if (mapWidth <= canvasWidth) this.camera.x = (canvasWidth - mapWidth) / 2;
    else { const minX = canvasWidth - mapWidth; const maxX = 0; this.camera.x = Math.min(maxX, Math.max(minX, this.camera.x)); }

    if (mapHeight <= canvasHeight) this.camera.y = (canvasHeight - mapHeight) / 2;
    else { const minY = canvasHeight - mapHeight; const maxY = 0; this.camera.y = Math.min(maxY, Math.max(minY, this.camera.y)); }
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


  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  _seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
  }

  _drawMarker(ctx, x, y, color, label, subtext = "") {
    const size = this.tileSize * 0.6;
    ctx.save();
    ctx.translate(x, y);

    // 1. Outer Glow/Shadow
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;

    // 2. Stone Plate (3D look)
    ctx.fillStyle = "#334155"; // Dark stone base
    this.roundRect(ctx, -size/2, -size/2, size, size, 8, true, false);
    
    // 3. Colored Inset
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    this.roundRect(ctx, -size/2 + 4, -size/2 + 4, size - 8, size - 8, 4, true, false);
    ctx.globalAlpha = 1.0;

    // 4. Text Labels
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = `bold ${this.tileSize * 0.18}px Arial`;
    ctx.fillText(label, 0, 5);
    
    if (subtext) {
        ctx.font = `${this.tileSize * 0.12}px Arial`;
        ctx.fillText(subtext, 0, 18);
    }

    ctx.restore();
  }

  _prerenderRoad() {
    const ctx = this.roadLayer.getContext('2d');
    const ts = this.tileSize;
    const stoneColors = ["#57534e", "#78716c", "#44403c", "#a8a29e"];

    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            const tok = String(this.grid[r][c] ?? '');
            const worldX = c * ts;
            const worldY = r * ts;

            // --- STROM (E) ---
            if (/^E/i.test(tok)) {
                // Pod stromem vykreslíme jen trávu (bez cesty)
                const grassIdx = this.terrainIndices[r][c];
                ctx.drawImage(this.grassVariants[grassIdx], worldX, worldY);
                
                // Přidáme bílé náběhy kořenů přímo do roadLayer, aby byly pod stromem
               // this._drawRootBase(ctx, worldX + ts/2, worldY + ts/2);
                continue; // Přeskočíme kreslení kamenů
            }

            // --- PORTÁL (S) ---
            if (/^S\d+/.test(tok)) {
                // Pod portálem vykreslíme spálenou zem
                this._drawBurnedGround(ctx, worldX, worldY);
                continue; // Přeskočíme kreslení kamenů
            }

            // --- KLASICKÁ CESTA (O) ---
            if (tok === 'O' || tok === 'O[SNW]' || tok === 'O[SND]') {
                // Kameny (tvůj stávající kód pro kameny...)
                const density = 4;
                const step = ts / density;
                for (let i = 0; i < density; i++) {
                    for (let j = 0; j < density; j++) {
                        const gX = c * density + j;
                        const gY = r * density + i;
                        const seed = (gX * 1234) ^ (gY * 5678);
                        const rand = (s) => (Math.abs(Math.sin(s) * 10000) % 1);

                        const x = worldX + (j * step) + (rand(seed) * (step * 0.6));
                        const y = worldY + (i * step) + (rand(seed + 1) * (step * 0.6));
                        const size = step * (0.6 + rand(seed + 2) * 0.5);
                        const rot = rand(seed + 3) * Math.PI;
                        const color = stoneColors[Math.floor(rand(seed + 4) * stoneColors.length)];

                        this._drawAAAStone(ctx, x, y, size, rot, color, rand(seed + 5));
                    }
                }
            }
        }
    }
  }

  _drawAAAStone(ctx, x, y, size, rotation, color, variation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const w = size;
    const h = size * 0.8;

    // 1. SHADOW (Grounds the stone)
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    this.roundRect(ctx, -w/2 + 2, -h/2 + 2, w, h, 4, true);

    // 2. STONE
    ctx.fillStyle = color;
    this.roundRect(ctx, -w/2, -h/2, w, h, 4, true);

    // 3. AAA SHARP HIGHLIGHT (The "Pro" Look)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w/2 + 4, -h/2 + 1);
    ctx.lineTo(w/2 - 4, -h/2 + 1);
    ctx.stroke();

    ctx.restore();
  }

    _prerenderWater() {
        const ctx = this.waterLayer.getContext('2d');
        const ts = this.tileSize;

        ctx.clearRect(0, 0, this.waterLayer.width, this.waterLayer.height);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 'W') {
                    const x = c * ts;
                    const y = r * ts;

                    // 1. ZÁKLAD: Temný, hluboký oceán
                    ctx.fillStyle = "#0b3a5e"; 
                    ctx.fillRect(x, y, ts, ts);

                    // 2. ŠANCE 10% NA ZÁŘI (To, co jsi chtěl)
                    if (Math.random() < 0.1) {
                        const grad = ctx.createRadialGradient(x+ts/2, y+ts/2, 2, x+ts/2, y+ts/2, ts*0.8);
                        grad.addColorStop(0, "rgba(14, 165, 233, 0.15)");
                        grad.addColorStop(1, "transparent");
                        ctx.fillStyle = grad;
                        ctx.fillRect(x, y, ts, ts);
                    }

                    // 3. STÍNY BŘEHU (Zakončení trávy - aby voda nelezla pod ni)
                    const isLand = (row, col) => {
                        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
                        return this.grid[row][col] !== 'W';
                    };

                    ctx.fillStyle = "#4A8C46"; // Silnější stín pro hloubku
                    if (isLand(r-1, c)) ctx.fillRect(x, y, ts, 8);      // Horní břeh
                    if (isLand(r+1, c)) ctx.fillRect(x, y+ts-8, ts, 8); // Dolní břeh
                    if (isLand(r, c-1)) ctx.fillRect(x, y, 8, ts);      // Levý břeh
                    if (isLand(r, c+1)) ctx.fillRect(x+ts-8, y, 8, ts); // Pravý břeh
                }
            }
        }
    }
    
    _prerenderGrass() {
        const ctx = this.grassLayer.getContext('2d');
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === '-') continue;
                const x = c * this.tileSize;
                const y = r * this.tileSize;
                ctx.drawImage(this.grassVariants[this.terrainIndices[r][c]], x, y);
            }
        }
    }

    _drawMagicPortal(ctx, x, y, performanceTime) {
        const time = (typeof performanceTime === 'number' && isFinite(performanceTime)) 
                     ? performanceTime 
                     : performance.now();
        
        // NOVÉ PEKELNÉ BARVY
        const fireLight = "#fef08a";
        const fireMid = "#ef4444";
        const fireDark = "#7f1d1d";
        const obsidianBlack = "#0a0a0a";

        ctx.save();
        ctx.translate(x, y);

        // --- 1. VRSTVA: ŽHNOUCÍ RADIÁLNÍ ZÁŘE ---
        const pulse = Math.sin(time / 400) * 10;
        const baseGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 60 + pulse);
        baseGlow.addColorStop(0, "rgba(127, 29, 29, 0.5)"); // fireDark s opacitou
        baseGlow.addColorStop(0.7, "rgba(239, 68, 68, 0.2)"); // fireMid s opacitou
        baseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = baseGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 70 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // --- 2. VRSTVA: ROTUJÍCÍ OBSIDIÁNOVÉ KAMENY ---
        const stoneCount = 8;
        for (let i = 0; i < stoneCount; i++) {
            ctx.save();
            const angle = (time / 3000) + (i * (Math.PI * 2 / stoneCount));
            const float = Math.sin((time / 600) + i) * 4;
            ctx.rotate(angle);

            // Stín
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(38 + float, 2, 12, 12);

            // Kámen (Obsidián)
            ctx.fillStyle = obsidianBlack;
            ctx.fillRect(35 + float, -5, 10, 10);

            // Žhnoucí runa (Oheň)
            const runeOpacity = 0.5 + Math.sin((time / 200) + i) * 0.5;
            ctx.globalAlpha = runeOpacity;
            ctx.shadowBlur = 15;
            ctx.shadowColor = fireMid;
            ctx.fillStyle = fireLight;
            ctx.fillRect(38 + float, -2, 4, 4);
            ctx.restore();
        }

        // --- 3. VRSTVA: OHNIVÝ VÍR ---
        ctx.save();
        ctx.rotate(-time / 800);
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.rotate((Math.PI * 2) / 3);
            const grad = ctx.createLinearGradient(10, 0, 30, 0);
            grad.addColorStop(0, fireLight);
            grad.addColorStop(1, "transparent");
            ctx.strokeStyle = grad;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.arc(0, 0, 18 + (i * 2), 0, Math.PI * 0.8);
            ctx.stroke();
        }
        ctx.restore();

        // --- 4. VRSTVA: ŽHAVÉ JISKRY ---
        for (let i = 0; i < 8; i++) {
            const seed = i * 1.5;
            const pTime = (time * 0.05 + seed * 100) % 100;
            const opacity = 1 - (pTime / 100);
            const distance = (pTime / 100) * 50;
            const pAngle = seed + (time / 2000);

            const px = Math.cos(pAngle) * distance;
            const py = Math.sin(pAngle) * distance - (pTime * 0.2);

            ctx.globalAlpha = opacity;
            ctx.fillStyle = fireLight;
            ctx.shadowBlur = 8;
            ctx.shadowColor = fireMid;
            ctx.beginPath();
            ctx.arc(px, py, 2.5 * opacity, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- 5. VRSTVA: JÁDRO (Brána do pekel) ---
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        coreGrad.addColorStop(0, "#000000"); 
        coreGrad.addColorStop(0.6, fireDark);
        coreGrad.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

/**
 * Draws a Dark Abyssal Portal
 * Layers: Dark Singularity -> 3 Floating Orange Segments -> Whipping Red Fire -> White Sparks
 * Features: Rare Yellow Lightning & Dense Obsidian Shard Orbit
 */
_drawMagicPortalHigh(ctx, x, y, time) {
    const obsidian = "#050505",
          bloodRed = "#7a0000",
          brightRed = "#ff0000",
          fireOrange = "#f97316",
          lightningYellow = "#fef08a",
          sparkWhite = "#ffffff";

    // --- NEW: UNIQUE SEED PER PORTAL ---
    // We use the X and Y coordinates to create a unique number for THIS portal
    const portalSeed = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
    
    ctx.save();
    ctx.translate(x, y);

    // Use the seed to offset the pulse so they don't all "breathe" at the same time
    const pulse = Math.sin((time / 250) + (portalSeed * 10));
    
    // --- 1. THE DARK SINGULARITY (Core) ---
    ctx.save();
    const coreSize = 22 + (pulse * 2);
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
    coreGrad.addColorStop(0, "#63130a");
    coreGrad.addColorStop(0.7, obsidian);
    coreGrad.addColorStop(1, "transparent");
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- 2. FLOATING ORANGE SEGMENTS (3 Parts) ---
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = fireOrange;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = fireOrange;
    // Rotate slightly different per portal
    const segmentRotation = (time / 1000) + (portalSeed * Math.PI); 
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(segmentRotation + (i * Math.PI * 2 / 3));
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 0.33);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    // --- 3. THE MID VORTEX (Whipping Red Fire) ---
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate(((time / 150) * (1 + i * 0.1)) + portalSeed);
        const radius = 32 + (i * 3.5);
        const fireGrad = ctx.createLinearGradient(radius, -15, radius, 15);
        fireGrad.addColorStop(0, "transparent");
        fireGrad.addColorStop(0.5, i > 3 ? brightRed : bloodRed);
        fireGrad.addColorStop(1, "transparent");
        ctx.strokeStyle = fireGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 0.5);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();

    // --- 4. THE OUTER CIRCLE (White Sparks & Runes) ---
    ctx.save();
    for (let i = 0; i < 15; i++) {
        const angle = (i * Math.PI * 2) / 15 + (time * 0.0008) + portalSeed;
        const r = 48 + (Math.sin(time / 400 + i) * 3);
        ctx.globalAlpha = 0.4 + (Math.sin(time / 300 + i) * 0.4);
        ctx.fillStyle = sparkWhite;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // --- 5. YELLOW LIGHTNING (Unsynced via X/Y) ---
    const strikeInterval = 1500; 
    const strikeDuration = 200;  
    const stoneCount = 10;

    // Use portalSeed to offset the strike timing
    const localPortalTime = time + (portalSeed * 5000);
    
    if (localPortalTime % strikeInterval < strikeDuration) {
        ctx.save();
        ctx.strokeStyle = lightningYellow;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = fireOrange;
        ctx.globalCompositeOperation = "lighter";
        
        // Strike cycle ID
        const strikeID = Math.floor(localPortalTime / strikeInterval);
        
        // Pick a rock index based on the Strike ID AND the Portal Seed
        const rockPseudoRand = Math.abs(Math.sin(strikeID + portalSeed * 100));
        const rockIndex = Math.floor(rockPseudoRand * stoneCount);

        const rockAngle = (-time / 2500) + (rockIndex * (Math.PI * 2 / stoneCount));
        const rockOrbit = 60 + (Math.sin(time / 800 + rockIndex) * 4);
        
        const targetX = Math.cos(rockAngle) * rockOrbit;
        const targetY = Math.sin(rockAngle) * rockOrbit;

        ctx.beginPath();
        ctx.moveTo(0, 0);

        const segments = 2;
        for (let s = 1; s <= segments; s++) {
            let nextX = (targetX / segments) * s;
            let nextY = (targetY / segments) * s;
            if (s < segments) {
                nextX += (Math.random() - 0.5) * 15;
                nextY += (Math.random() - 0.5) * 15;
            }
            ctx.lineTo(nextX, nextY);
        }
        
        ctx.globalAlpha = Math.random() > 0.2 ? 1.0 : 0.4; 
        ctx.stroke();
        // Add impact glow at the rock position
        ctx.fillStyle = lightningYellow;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(targetX, targetY, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // --- 6. OBSIDIAN ROCKS ---
    for (let i = 0; i < stoneCount; i++) {
        ctx.save();
        const angle = (-time / 2500) + (i * (Math.PI * 2 / stoneCount));
        const orbit = 60 + (Math.sin(time / 800 + i) * 4);
        ctx.translate(Math.cos(angle) * orbit, Math.sin(angle) * orbit);
        ctx.rotate(angle + time / 600);
        ctx.fillStyle = obsidian;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "#000";
        ctx.beginPath();
        ctx.moveTo(-4, -2);
        ctx.lineTo(1, -7);
        ctx.lineTo(6, 1);
        ctx.lineTo(-1, 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = bloodRed;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

  // LOW LEVEL: Brighter and simplified
  _drawMagicPortalLow(ctx, x, y, time) {
    const fireLight = "#fef08a", fireMid = "#ef4444", obsidian = "#0a0a0a";
    ctx.save();
    ctx.translate(x, y);

    // 1. Simple Pulse
    const pulse = Math.sin(time / 400) * 5;
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.beginPath(); ctx.arc(0, 0, 45 + pulse, 0, Math.PI * 2); ctx.fill();

    // 2. Simplified Stones (Only 4, no shadowBlur)
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((time / 3000) + (i * Math.PI / 2));
        ctx.fillStyle = obsidian;
        ctx.fillRect(35, -5, 10, 10);
        ctx.fillStyle = fireLight;
        ctx.fillRect(38, -2, 4, 4); // Static rune
        ctx.restore();
    }

    // 3. Bright Core
    ctx.fillStyle = fireMid;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fireLight;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  _preRenderTreeLow(tileSize) {
    const ts = tileSize;
    const canvasSize = Math.round(ts * 2.8); 
    const offCanvas = document.createElement("canvas");
    offCanvas.width = ts * 2.5;
    offCanvas.height = canvasSize;
    const ctx = offCanvas.getContext("2d");

    const cx = offCanvas.width / 2;
    const cy = canvasSize * 0.85;

    // 1. SIMPLE SHADOW
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath();
    ctx.arc(cx, cy, ts * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 2. SIMPLE TRUNK (Straight lines)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx - 5, cy - ts * 1.2);
    ctx.lineTo(cx + 5, cy - ts * 1.2);
    ctx.lineTo(cx + 8, cy);
    ctx.fill();

    // 3. SOLID LEAF CLUSTERS (No random loops)
    const colors = ["#eab308", "#ca8a04"];
    const leafClusters = [
        { x: cx, y: cy - ts * 1.4, r: ts * 0.5 },
        { x: cx - ts * 0.35, y: cy - ts * 1.1, r: ts * 0.4 },
        { x: cx + ts * 0.35, y: cy - ts * 1.1, r: ts * 0.4 }
    ];

    leafClusters.forEach((cluster, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(cluster.x, cluster.y, cluster.r, 0, Math.PI * 2);
        ctx.fill();
    });

    return offCanvas;
  }

  _preRenderTreeHigh(tileSize) {
    const ts = tileSize;
    const canvasSize = Math.round(ts * 3.0); 
    const offCanvas = document.createElement("canvas");
    offCanvas.width = ts * 2.5;
    offCanvas.height = canvasSize;
    const ctx = offCanvas.getContext("2d");

    const cx = offCanvas.width / 2;
    const cy = canvasSize * 0.88;

    // --- 1. DEEP GROUND SHADOW ---
    const shadowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 0.8);
    shadowGrad.addColorStop(0, "rgba(0,0,0,0.45)");
    shadowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ts * 0.8, ts * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- 2. MAIN TRUNK BODY ---
    const trunkGrad = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0);
    trunkGrad.addColorStop(0, "#cbd5e1");
    trunkGrad.addColorStop(0.3, "#ffffff");
    trunkGrad.addColorStop(1, "#94a3b8");
    ctx.fillStyle = trunkGrad;

    ctx.beginPath();
    ctx.moveTo(cx - 10, cy); 
    // Left side & Mid Branch
    ctx.quadraticCurveTo(cx - 5, cy - ts * 0.5, cx - 8, cy - ts * 0.7);
    ctx.lineTo(cx - 22, cy - ts * 0.8); 
    ctx.lineTo(cx - 18, cy - ts * 0.85);
    ctx.quadraticCurveTo(cx - 8, cy - ts * 0.75, cx - 8, cy - ts * 1.1);
    // Top Branching
    ctx.lineTo(cx - 28, cy - ts * 1.45); 
    ctx.lineTo(cx - 22, cy - ts * 1.55);
    ctx.quadraticCurveTo(cx, cy - ts * 1.2, cx + 22, cy - ts * 1.55);
    ctx.lineTo(cx + 28, cy - ts * 1.45);
    // Right side back down
    ctx.quadraticCurveTo(cx + 5, cy - ts * 0.8, cx + 10, cy);
    ctx.fill();

    // --- 3. IMPRESSIVE GNARLED ROOTS (3D Overlay) ---
    const drawGnarledRoot = (xOff, yOff, targetX, targetY, thick) => {
        ctx.save();
        const rGrad = ctx.createLinearGradient(cx + xOff, 0, targetX, 0);
        rGrad.addColorStop(0, "#ffffff");
        rGrad.addColorStop(1, "#64748b");
        ctx.fillStyle = rGrad;
        
        ctx.beginPath();
        ctx.moveTo(cx + xOff - thick, cy + yOff);
        // Create an organic "S" curve for the root
        ctx.bezierCurveTo(
            cx + xOff + (targetX - cx) * 0.5, cy + yOff + 10, 
            targetX - (targetX - cx) * 0.2, cy + targetY - 5, 
            targetX, cy + targetY
        );
        ctx.lineTo(targetX + thick * 0.5, cy + targetY);
        ctx.bezierCurveTo(
            targetX - (targetX - cx) * 0.2, cy + targetY, 
            cx + xOff + (targetX - cx) * 0.5 + thick, cy + yOff + 10, 
            cx + xOff + thick, cy + yOff
        );
        ctx.fill();
        ctx.restore();
    };

    // Draw roots that look like they wrap around and pull the tree down
    drawGnarledRoot(-8, -15, cx - 35, 8, 7);  // Heavy Left Root
    drawGnarledRoot(6, -12, cx + 32, 10, 6);  // Heavy Right Root
    drawGnarledRoot(-2, -8, cx - 5, 12, 8);   // Front Center Root
    drawGnarledRoot(3, -20, cx + 15, 6, 4);   // Smaller Side Root

    // Bark Texture (birch knots)
    ctx.fillStyle = "#1e293b";
    for(let i = 0; i < 22; i++) {
        const yPos = cy - (i * ts * 0.08) - 5;
        const xOff = Math.sin(i * 2.5) * 4;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(cx + xOff - 5, yPos, 9, 1.3);
    }
    ctx.globalAlpha = 1.0;

    // --- 4. DENSE LEAF CLUSTERS ---
    const leafClusters = [
        { x: cx, y: cy - ts * 1.5, r: ts * 0.5 },
        { x: cx - ts * 0.45, y: cy - ts * 1.35, r: ts * 0.4 },
        { x: cx + ts * 0.45, y: cy - ts * 1.35, r: ts * 0.4 },
        { x: cx - ts * 0.5, y: cy - ts * 0.85, r: ts * 0.3 },
        { x: cx + ts * 0.2, y: cy - ts * 1.05, r: ts * 0.3 }
    ];

    leafClusters.forEach(cluster => {
        for (let i = 0; i < 90; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.pow(Math.random(), 0.6) * cluster.r;
            const lx = cluster.x + Math.cos(angle) * dist;
            const ly = cluster.y + Math.sin(angle) * dist;
            const leafSize = 2.5 + Math.random() * 4.5;
            const colors = ["#fbbf24", "#f59e0b", "#d97706", "#78350f", "#fef08a"];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(Math.random() * Math.PI);
            ctx.beginPath();
            ctx.ellipse(0, 0, leafSize, leafSize * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });

    return offCanvas;
}

  _drawLifeTree(ctx, x, y, currentLifes) {
    if (!this.cachedTree) return;
    if (currentLifes <= 0) {
        ctx.fillStyle = "#1a1a1a"; // Mrtvý kmen
        ctx.fillRect(x - 6, y - this.tileSize * 0.5, 12, this.tileSize * 0.6);
        return;
    }

    // Centrování na patu stromu
    const drawX = ~~(x - this.cachedTree.width / 2);
    const drawY = ~~(y - this.cachedTree.height * 0.85);

    ctx.drawImage(this.cachedTree, drawX, drawY);
  }

  _drawRootBase(ctx, cx, cy) {
    const ts = this.tileSize;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 5;
    ctx.shadowColor = "rgba(0,0,0,0.3)";

    // Vykreslíme 4-5 náběhů kořenů do hvězdice
    for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((Math.PI * 2 / 5) * i + 0.5);
        
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.quadraticCurveTo(0, ts * 0.4, 15, ts * 0.45); // Kořen se rozlézá do dálky
        ctx.lineTo(5, ts * 0.45);
        ctx.quadraticCurveTo(0, ts * 0.2, 5, 0);
        ctx.fill();
        ctx.restore();
    }
    ctx.restore();
  }

  _drawBurnedGround(ctx, x, y) {
    const ts = this.tileSize;
    // Základní tmavý flek
    const grad = ctx.createRadialGradient(x + ts/2, y + ts/2, ts * 0.1, x + ts/2, y + ts/2, ts * 0.6);
    grad.addColorStop(0, "#1a1a1a"); // Skoro černá uprostřed
    grad.addColorStop(0.6, "#422006"); // Tmavě hnědá
    grad.addColorStop(1, "rgba(20, 83, 45, 0)"); // Ztrácí se v trávě

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, ts, ts);

    // Detaily popela a sazí (náhodné tečky)
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 20; i++) {
        const px = x + Math.random() * ts;
        const py = y + Math.random() * ts;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  _preRenderMountainSet(ts) {
    const variations = [];
    for (let i = 0; i < 5; i++) {
        
        // --- EDIT THESE NUMBERS ---
        const minHeight = 0.8; // 80% of original size
        const maxHeight = 1.3; // 130% of original size
        
        const hMult = minHeight + (Math.random() * (maxHeight - minHeight)); 
        
        variations.push(this._preRenderMountainParts(ts, hMult));
    }
    return variations;
  }

  _preRenderMountainParts(ts, hMult = 1.0) {
    const h = ts * 1.6;
    const createPart = () => {
        const canvas = document.createElement("canvas");
        canvas.width = ts;
        canvas.height = h;
        return { canvas, ctx: canvas.getContext("2d") };
    };

    const parts = { main: createPart(), left: createPart(), right: createPart(), bg: createPart() };
    
    // Apply the multiplier to the mountain heights
    const mainH = (h * 0.85) * hMult;
    const connectH = (h * 0.55) * 1.0;

    // Use your drawFixedPeak method to draw into the canvases
    this.drawFixedPeak(parts.main.ctx, ts * 0.5, h, 0, ts, mainH, true);
    this.drawFixedPeak(parts.left.ctx, 0, h, -ts * 0.5, ts * 0.5, connectH, false);
    this.drawFixedPeak(parts.right.ctx, ts, h, ts * 0.5, ts * 1.5, connectH, false);

    // Draw the Fog/Mist background part
    const fogGrad = parts.bg.ctx.createLinearGradient(0, h - ts * 1.2, 0, h);
    fogGrad.addColorStop(0, "rgba(255, 255, 255, 0)"); // Transparent top
    fogGrad.addColorStop(0.5, "rgba(203, 213, 225, 0.5)"); // Mist middle
    fogGrad.addColorStop(1, "rgba(15, 23, 42, 0.8)"); // Dark base to blend with ground
    parts.bg.ctx.fillStyle = fogGrad;
    parts.bg.ctx.fillRect(0, h - ts * 1.2, ts, ts * 1.2);
    parts.bg.ctx.fillStyle = fogGrad;
    parts.bg.ctx.fillRect(0, h - ts, ts, ts);

    return { 
        main: parts.main.canvas, 
        left: parts.left.canvas, 
        right: parts.right.canvas, 
        bg: parts.bg.canvas 
    };
  }

  _preRenderMountainHigh(ts) {
    const h = ts * 1.6;
    const canvas = document.createElement("canvas");
    canvas.width = ts;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const drawNaturalPeak = (x, y, pW, pH, colors, isSharp) => {
        ctx.save();
        const segments = 6;
        const pts = [];
        // Create jagged points for a realistic ridge
        for (let i = 0; i <= segments; i++) {
            const pct = i / segments;
            const px = x - (pW/2) + (pW * pct);
            let py = y - (isSharp ? Math.sin(Math.PI * pct) : Math.pow(Math.sin(Math.PI * pct), 0.5)) * pH;
            if (i > 0 && i < segments) py += (Math.random() - 0.5) * (pH * 0.1);
            pts.push({x: px, y: py});
        }

        // Draw Rock Body
        ctx.beginPath();
        ctx.moveTo(pts[0].x, y);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length-1].x, y);
        ctx.fillStyle = colors.rock;
        ctx.fill();

        // Draw Jagged Snow (Clip to rock)
        ctx.clip();
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(x - pW/2, y - pH * 0.6); // Snow line
        pts.forEach(p => ctx.lineTo(p.x, p.y)); // Follow ridge
        ctx.fill();
        ctx.restore();
    };

    // 1. Atmosphere Gradient (Valley Fog)
    const fog = ctx.createLinearGradient(0, h-ts, 0, h);
    fog.addColorStop(0, "rgba(226, 232, 240, 0)");
    fog.addColorStop(0.6, "rgba(255, 255, 255, 0.7)");
    fog.addColorStop(1, "rgba(203, 213, 225, 0.2)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, h-ts, ts, ts);

    // 2. The Range (Back to Front)
    drawNaturalPeak(ts * 0.2, h, ts * 0.9, h * 0.45, {rock: "#334155"}, false);
    drawNaturalPeak(ts * 0.8, h, ts * 0.9, h * 0.4, {rock: "#334155"}, true);
    drawNaturalPeak(ts * 0.5, h, ts * 1.2, h * 0.85, {rock: "#1e293b"}, true);

    return canvas;
}

_preRenderMountainLow(ts) {
    const h = ts * 1.6;
    const canvas = document.createElement("canvas");
    canvas.width = ts;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const drawTriangle = (x, y, w, h, color, hasSnow) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - w/2, y);
        ctx.lineTo(x, y - h);
        ctx.lineTo(x + w/2, y);
        ctx.fill();
        if(hasSnow) {
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.moveTo(x, y - h);
            ctx.lineTo(x + w*0.1, y - h*0.7);
            ctx.lineTo(x - w*0.1, y - h*0.7);
            ctx.fill();
        }
    };

    drawTriangle(ts * 0.3, h, ts * 0.8, h * 0.4, "#475569", false);
    drawTriangle(ts * 0.7, h, ts * 0.8, h * 0.4, "#475569", false);
    drawTriangle(ts * 0.5, h, ts * 1.0, h * 0.8, "#1e293b", true);
    return canvas;
}

// REPLACE your existing drawFixedPeak with this:
drawFixedPeak(ctx, peakX, peakY, leftX, rightX, pH, isMain) {
    // 1. SETUP COLORS (AAA Palette)
    const sunColor = "#64748b";   // Slate-500 (Lit rock)
    const shadeColor = "#1e293b"; // Slate-800 (Shadow rock)
    const snowColor = "#f1f5f9";  // Slate-100 (White snow)
    const snowShadow = "#cbd5e1"; // Slate-300 (Snow in shadow)
    
    // Generate the noise pattern if it doesn't exist yet
    if (!this.rockPattern) this.rockPattern = this._createNoisePattern();

    // 2. CALCULATE GEOMETRY
    // We create jagged ridges for the left and right slopes
    const leftRidge = this._getJaggedLine(leftX, peakY, peakX, peakY - pH, 8, 1.5);
    const rightRidge = this._getJaggedLine(peakX, peakY - pH, rightX, peakY, 8, 1.5);

    // 3. DRAW BASE SHAPE (The Body)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftRidge[0].x, leftRidge[0].y);
    // Trace up the left side
    for(let p of leftRidge) ctx.lineTo(p.x, p.y);
    // Trace down the right side
    for(let p of rightRidge) ctx.lineTo(p.x, p.y);
    ctx.closePath();

    // FILL: Gradient + Noise Pattern
    // A vertical gradient gives "Atmospheric Perspective" (darker at top, misty at bottom)
    const rockGrad = ctx.createLinearGradient(0, peakY - pH, 0, peakY);
    rockGrad.addColorStop(0, shadeColor);
    rockGrad.addColorStop(1, "#0f172a"); // Darker base
    ctx.fillStyle = rockGrad;
    ctx.fill();

    // Overlay texture
    ctx.fillStyle = this.rockPattern;
    ctx.globalCompositeOperation = "overlay"; // Blends texture beautifully
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over"; // Reset blend mode
    ctx.restore();

    // 4. DRAW LIGHTING (Fixed: No center line)
    
    // PART A: The Sun Gradient (The Fill)
    // This needs to be a closed shape so the color fills properly
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftRidge[0].x, leftRidge[0].y);
    for(let p of leftRidge) ctx.lineTo(p.x, p.y);
    // Close the shape vertically down the middle for the fill
    ctx.lineTo(peakX, peakY); 
    ctx.lineTo(leftRidge[0].x, leftRidge[0].y); // Back to start
    ctx.closePath();
    
    // Sun gradient (same as before)
    const sunGrad = ctx.createLinearGradient(leftX, 0, peakX, 0);
    sunGrad.addColorStop(0, "rgba(255,255,255,0.15)");
    sunGrad.addColorStop(1, "rgba(0,0,0,0.0)"); // Transparent at the center seam
    ctx.fillStyle = sunGrad;
    ctx.fill();
    ctx.restore();

    // PART B: The Rim Light (The Stroke)
    // We draw this separately so we DON'T stroke the middle line
    ctx.save();
    ctx.beginPath();
    // Start at the bottom left
    ctx.moveTo(leftRidge[0].x, leftRidge[0].y);
    // Trace ONLY the ridge up to the peak
    for(let p of leftRidge) ctx.lineTo(p.x, p.y);
    // Do NOT close the path or draw a line down the middle
    
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; // Slightly brighter for AAA pop
    ctx.lineWidth = 2;
    ctx.lineCap = 'round'; // Makes the jagged corners smoother
    ctx.stroke();
    ctx.restore();

    // 5. DRAW AAA SNOW CAP
    // Snow shouldn't be a straight line. It should cover the top 35% of the mountain.
    ctx.save();
    ctx.beginPath();
    
    // Start slightly down the left slope
    const snowStartIdx = Math.floor(leftRidge.length * 0.65);
    const snowEndIdx = Math.ceil(rightRidge.length * 0.35);

    ctx.moveTo(leftRidge[snowStartIdx].x, leftRidge[snowStartIdx].y);
    
    // Trace up to peak
    for (let i = snowStartIdx; i < leftRidge.length; i++) ctx.lineTo(leftRidge[i].x, leftRidge[i].y);
    // Trace down right side
    for (let i = 0; i < snowEndIdx; i++) ctx.lineTo(rightRidge[i].x, rightRidge[i].y);

    // CLOSE THE BOTTOM OF SNOW WITH "DRIPS"
    // Instead of a straight line, we zigzag back to the start to look like snow drifts
    const snowBottomY = peakY - pH * 0.65;
    ctx.bezierCurveTo(
        peakX + 10, snowBottomY + 10, // Control point 1 (sagging snow)
        peakX - 10, snowBottomY - 5,  // Control point 2
        leftRidge[snowStartIdx].x, leftRidge[snowStartIdx].y // End
    );

    ctx.closePath();
    
    // Fill Snow
    const snowGrad = ctx.createLinearGradient(0, peakY - pH, 0, peakY - pH * 0.5);
    snowGrad.addColorStop(0, snowColor);
    snowGrad.addColorStop(1, snowShadow);
    ctx.fillStyle = snowGrad;
    ctx.fill();
    ctx.restore();
}

// Add this new helper method to Map class
_getJaggedLine(x1, y1, x2, y2, segments = 5, rough = 2) {
    const points = [{x: x1, y: y1}];
    
    // Recursive midpoint displacement (simplified for loop)
    let dx = (x2 - x1) / segments;
    let dy = (y2 - y1) / segments;
    
    for(let i = 1; i < segments; i++) {
        const progress = i / segments;
        // The closer to the center (0.5), the more "jagged" it can be
        const arc = Math.sin(progress * Math.PI); 
        
        points.push({
            x: x1 + dx * i + (Math.random() - 0.5) * (rough * 5 * arc),
            y: y1 + dy * i + (Math.random() - 0.5) * (rough * 10 * arc)
        });
    }
    points.push({x: x2, y: y2});
    return points;
}

// Add this new helper method to Map class
_createNoisePattern() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; 
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = "#2d3748"; // Base rock color
    ctx.fillRect(0,0,64,64);
    
    // Add noise
    for(let i=0; i<400; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
        ctx.fillRect(Math.random()*64, Math.random()*64, 2, 2);
    }
    return ctx.createPattern(canvas, 'repeat');
}


_preRenderSnow(tileSize) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = tileSize;
    offCanvas.height = tileSize;
    const ctx = offCanvas.getContext("2d");

    // 1. ZÁKLAD: Mnohem tmavší "matná" modro-šedá
    // V HDR bude tato barva vypadat jako "normální bílá", 
    // což nám umožní vykreslit vločky ještě světleji.
    ctx.fillStyle = '#b8c9d9'; 
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 2. TEXTURA POVRCHU (Vysoký kontrast)
    for (let i = 0; i < 350; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;
        
        // Používáme výraznější tmavé body pro simulaci stínů mezi zrnky
        ctx.fillStyle = Math.random() > 0.6 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(60, 90, 120, 0.3)';
        ctx.fillRect(x, y, 1.2, 1.2);
    }

    // 3. HLUBOKÉ STÍNY (Závěje)
    // Přidáme tmavší gradienty, které HDR nerozpije
    const shadowGrad = ctx.createRadialGradient(tileSize, tileSize, 0, tileSize, tileSize, tileSize);
    shadowGrad.addColorStop(0, 'rgba(0, 40, 80, 0.15)');
    shadowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 4. HDR-READY KRYSTALY
    // Místo velkých ploch použijeme mikroskopické, ale velmi kontrastní body
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;
        
        // Ostrý bílý bod (v HDR bude svítit)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
        
        // Temně modrý "halo" efekt kolem krystalu (vytvoří umělý kontrast)
        if (Math.random() > 0.8) {
            ctx.fillStyle = 'rgba(0, 100, 255, 0.4)';
            ctx.fillRect(x - 1, y, 3, 1);
            ctx.fillRect(x, y - 1, 1, 3);
        }
    }

    // 5. ZVÝRAZNĚNÉ HRANY
    // V HDR splývají dlaždice dohromady, proto přidáme tmavou linku na spodek
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, tileSize, tileSize);

    return offCanvas;
}
_preRenderSand(tileSize) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = tileSize;
    offCanvas.height = tileSize;
    const ctx = offCanvas.getContext("2d");

    // 1. Základní barva - bohatší žlutohnědá
    ctx.fillStyle = '#eecd7d';
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 2. Textura zrnek (vysoká hustota)
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * tileSize;
        const y = Math.random() * tileSize;
        const opacity = Math.random() * 0.2;
        // Náhodně tmavší hnědá nebo světlejší žlutá zrnka
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(139, 69, 19, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(x, y, 1.2, 1.2);
    }

    // 3. Efekt větrných dun (více vrstev gradientů)
    const dune = ctx.createLinearGradient(0, 0, tileSize, tileSize * 0.5);
    dune.addColorStop(0, 'rgba(0,0,0,0)');
    dune.addColorStop(0.3, 'rgba(180, 130, 40, 0.15)'); // Stín duny
    dune.addColorStop(0.5, 'rgba(255, 240, 150, 0.2)'); // Vrcholek duny (osvětlený)
    dune.addColorStop(0.7, 'rgba(0,0,0,0)');
    ctx.fillStyle = dune;
    ctx.fillRect(0, 0, tileSize, tileSize);

    // 4. Teplý okraj (Ambient Occlusion)
    // Horní/Levý okraj zesvětlíme (světlo), Dolní/Pravý ztmavíme (stín)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, tileSize, tileSize);
    
    ctx.strokeStyle = 'rgba(120, 80, 20, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();

    return offCanvas;
}
}