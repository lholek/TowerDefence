// js/game/Map.js
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
        maxZoom: 2
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

    // 8. PRE-RENDER TREE
    if(this.quality == "low"){
      this.cachedTree = this._preRenderTreeLow(this.tileSize);
    } else {
      this.cachedTree = this._preRenderTreeHigh(this.tileSize);
    }

    this.clampCamera();

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
    const isWalkable = (r,c) => {
      const tok = String(this.grid[r][c] ?? '');
      // treat 'O' and any S*/E*/T* as walkable; treat 'X' as obstacle; treat '-' as blocked for pathing
      if (tok === 'X') return false;
      if (tok === 'W') return false;
      if (tok === '-') return false;
      // everything else is walkable (O, S1, E1, L, etc.)
      return true;
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
  render(ctx) {
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    // Výpočet viditelné oblasti
    const startCol = Math.max(0, Math.floor(-this.camera.x / (this.tileSize * this.camera.zoom)));
    const endCol = Math.min(this.cols, Math.ceil((this.canvas.width - this.camera.x) / (this.tileSize * this.camera.zoom)));
    const startRow = Math.max(0, Math.floor(-this.camera.y / (this.tileSize * this.camera.zoom)));
    const endRow = Math.min(this.rows, Math.ceil((this.canvas.height - this.camera.y) / (this.tileSize * this.camera.zoom)));

    const sX = startCol * this.tileSize;
    const sY = startRow * this.tileSize;
    const sW = (endCol - startCol) * this.tileSize;
    const sH = (endRow - startRow) * this.tileSize;

    // 1. PASS: TRÁVA
    ctx.drawImage(this.grassLayer, sX, sY, sW, sH, sX, sY, sW, sH);

    // 2. PASS: OCEÁN (Základ + Maskovaný Shader)
    if (this.waterLayer) {
        ctx.drawImage(this.waterLayer, sX, sY, sW, sH, sX, sY, sW, sH);
        //this.drawWaterOverlay(ctx, startRow, endRow, startCol, endCol);
    }

    // 3. PASS: CESTA
    ctx.drawImage(this.roadLayer, sX, sY, sW, sH, sX, sY, sW, sH);

    // 4. PASS: OBJEKTY
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (String(this.grid[r][c]).startsWith('S')) {
          const bounds = this.getTileBounds(c, r);
          const portalX = bounds.x + this.tileSize / 2;
          const portalY = bounds.y + this.tileSize / 2;

          // 1. Calculate distance to screen center (or player)
          const screenCenterX = this.camera.x + (this.canvas.width / 2);
          const screenCenterY = this.camera.y + (this.canvas.height / 2);
          const dist = Math.hypot(portalX - screenCenterX, portalY - screenCenterY);

          // 2. High Quality if close, Low Quality if far
          // Adjust '500' based on your screen size
          const isLow = this.quality === 'low';
          if (isLow ) {
            this._drawMagicPortalLow(ctx, portalX, portalY, performance.now());
          } else {
            this._drawMagicPortalHigh(ctx, portalX, portalY, performance.now());
          }
        }
      }
    }

    ctx.restore();

    // 5. PASS: AAA CINEMATIC VIGNETTE
    const vGrad = ctx.createRadialGradient(
        this.canvas.width / 2,  // Center X (now 615px)
        this.canvas.height / 2, // Center Y (300px)
        this.canvas.width / 3, 
        this.canvas.width / 2, 
        this.canvas.height / 2, 
        this.canvas.width * 0.9
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
    if (tok === 'O') return false;        // path
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

  _renderGlobalShadows(ctx, sR, eR, sC, eC) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${this.shadowOpacity})`;
    
    for (let r = sR; r < eR; r++) {
        for (let c = sC; c < eC; c++) {
            const tok = String(this.grid[r][c] ?? '');
            // Only markers and towers cast these long shadows
            if (/^S|E/i.test(tok)) {
                const bounds = this.getTileBounds(c, r);
                const cx = bounds.x + this.tileSize / 2;
                const cy = bounds.y + this.tileSize / 2;

                ctx.beginPath();
                ctx.ellipse(
                    cx + (this.tileSize * 0.3 * this.sunDir.x), 
                    cy + (this.tileSize * 0.3 * this.sunDir.y), 
                    this.tileSize * 0.4, 
                    this.tileSize * 0.2, 
                    Math.PI / 4, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }
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
            if (/^S/i.test(tok)) {
                // Pod portálem vykreslíme spálenou zem
                this._drawBurnedGround(ctx, worldX, worldY);
                continue; // Přeskočíme kreslení kamenů
            }

            // --- KLASICKÁ CESTA (O) ---
            if (tok === 'O') {
                const grassIdx = this.terrainIndices[r][c];
                ctx.drawImage(this.grassVariants[grassIdx], worldX, worldY);

                // Dirt blend
                const grad = ctx.createRadialGradient(worldX+ts/2, worldY+ts/2, 0, worldX+ts/2, worldY+ts/2, ts/1.2);
                grad.addColorStop(0, "rgba(69, 53, 39, 0.4)");
                grad.addColorStop(1, "rgba(69, 53, 39, 0)");
                ctx.fillStyle = grad;
                ctx.fillRect(worldX, worldY, ts, ts);

                // Kameny (tvůj stávající kód pro kameny...)
                                // 3. DRAW SEAMLESS STONES
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

  _drawOvergrowthEdge(ctx, r, c, side) {
    const ts = this.tileSize;
    const wx = c * ts;
    const wy = r * ts;
    // How far the grass encroaches onto the road stones (e.g., 25% of a tile)
    const depth = ts * 0.25; 
    
    // Dark, semi-transparent grass color representing unkempt edges
    ctx.fillStyle = "rgba(47, 79, 31, 0.6)";

    const numPatches = 12; // Number of grass blobs per tile edge

    for (let i = 0; i < numPatches; i++) {
        const noiseFunc = (s) => (Math.abs(Math.sin(s * (r+c)*i)) % 1);
        const noise = noiseFunc(i);
        // Randomize blob size
        const sizeX = (ts * 0.08) + (noise * ts * 0.1);
        const sizeY = (ts * 0.08) + (noiseFunc(i+10) * ts * 0.1);

        let x, y;

        // Position blobs randomly along the specified edge
        if (side === 'N') {
            x = wx + Math.random() * ts; 
            y = wy + (noise * depth) - sizeY/2; // Jitter inwards from top
        } else if (side === 'S') {
            x = wx + Math.random() * ts; 
            y = wy + ts - (noise * depth) - sizeY/2; // Jitter inwards from bottom
        } else if (side === 'W') {
            x = wx + (noise * depth) - sizeX/2; // Jitter inwards from left
            y = wy + Math.random() * ts;
        } else if (side === 'E') {
            x = wx + ts - (noise * depth) - sizeX/2; // Jitter inwards from right
            y = wy + Math.random() * ts;
        }
        
        ctx.beginPath();
        // Draw an irregular oval blob
        ctx.ellipse(x, y, sizeX, sizeY, Math.random()*Math.PI, 0, Math.PI*2);
        ctx.fill();
    }
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

  // Unused
  drawWaterOverlay(ctx, startRow, endRow, startCol, endCol) {
    const ts = this.tileSize;
    const time = performance.now() * 0.0004; // Majestátní pomalý pohyb
    
    ctx.save();
    
    // MASKA: Odlesky se vykreslí JEN ve vodě, nikdy na trávě
    ctx.beginPath();
    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            if (this.grid[r][c] === 'W') {
                ctx.rect(c * ts, r * ts, ts, ts);
            }
        }
    }
    ctx.clip();

    // ODLESKY SLUNCE (Caustics)
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 2;

    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            if (this.grid[r][c] === 'W') {
                this._drawOceanGlimmer(ctx, c * ts, r * ts, ts, time, r, c);
            }
        }
    }
    ctx.restore();
  }

_drawOceanGlimmer(ctx, x, y, ts, time, r, c) {
    // Matematika pro propojené vlnění přes více bloků
    const noise = Math.sin(time + r * 0.5 + c * 0.3) * 10;
    const noise2 = Math.cos(time * 0.8 + c * 0.5 - r * 0.2) * 8;

    ctx.strokeStyle = "rgba(180, 240, 255, 0.07)"; // Velmi jemné, luxusní odlesky
    
    ctx.beginPath();
    // Kreslíme jemnou "síť" světla
    ctx.moveTo(x - 20 + noise, y + ts/2 + noise2);
    ctx.bezierCurveTo(
        x + ts/2, y + noise,
        x + ts/2, y + ts + noise2,
        x + ts + 20 + noise, y + ts/2 - noise
    );
    ctx.stroke();
}

_drawCausticWeb(ctx, x, y, ts, time, seed, alpha) {
    // Globální posun založený na X a Y souřadnicích dlaždice
    // Tím zajistíme, že vzor přechází plynule z jednoho čtverce do druhého
    const globalX = x / ts;
    const globalY = y / ts;

    const shiftX = Math.sin(time + globalX * 0.5) * 15;
    const shiftY = Math.cos(time * 0.8 + globalY * 0.5) * 12;

    ctx.strokeStyle = `rgba(180, 245, 255, ${alpha})`;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    // Vytváříme "tekutou" síť, která nerespektuje hranice dlaždic
    ctx.moveTo(x - 20 + shiftX, y + ts/2 + shiftY);
    ctx.bezierCurveTo(
        x + ts/2 + shiftX, y - 30 + shiftY,
        x + ts/2 - shiftX, y + ts + 30 + shiftY,
        x + ts + 20 + shiftX, y + ts/2 - shiftY
    );
    ctx.stroke();
}
_drawCausticNode(ctx, x, y, ts, time, seed) {
    const driftX = Math.sin(time + seed) * 15;
    const driftY = Math.cos(time * 0.7 + seed) * 10;

    ctx.strokeStyle = "rgba(180, 240, 255, 0.08)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Interaktivní sítě světla (působí jako tekutý krystal)
    for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i + time;
        const px = x + ts/2 + Math.cos(angle) * (ts/3) + driftX;
        const py = y + ts/2 + Math.sin(angle) * (ts/3) + driftY;
        
        ctx.moveTo(px, py);
        ctx.lineTo(x + ts/2 + driftX, y + ts/2 + driftY);
    }
    ctx.stroke();
}

  _drawCausticWave(ctx, x, y, ts, time, seed, alpha, scale) {
      const offX = Math.sin(time + seed) * 10;
      const offY = Math.cos(time * 0.5 + seed) * 10;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(186, 242, 255, ${alpha})`;
      ctx.lineWidth = 3 * scale;

      // Organická křivka simulující lom světla na dně
      ctx.moveTo(x + offX, y + ts/2 + offY);
      ctx.bezierCurveTo(
          x + ts/2, y + offY,
          x + ts/2, y + ts + offY,
          x + ts + offX, y + ts/2 + offY
      );
      ctx.stroke();
  }

_drawCrystalReflection(ctx, x, y, ts, time, offset, alpha, scale) {
    const s = Math.sin(time + offset) * 8;
    const c = Math.cos(time * 0.7 + offset) * 5;

    ctx.beginPath();
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeStyle = `rgba(186, 242, 255, ${alpha})`;
    
    // Tvar "nekonečné" vlny (Caustics)
    ctx.moveTo(x + 5 + s, y + ts * 0.5 + c);
    ctx.bezierCurveTo(
        x + ts * 0.3 + s, y + ts * 0.2 - c,
        x + ts * 0.7 - s, y + ts * 0.8 + c,
        x + ts - 5 - s, y + ts * 0.5 - c
    );
    ctx.stroke();
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
}