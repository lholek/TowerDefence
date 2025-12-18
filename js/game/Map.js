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
        x: 0, y: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0,
        minZoom: 0.3, maxZoom: 1
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

    this.clampCamera();
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

    // 1. VÝPOČET VIDITELNÉ OBLASTI A SOURADNIC (Musí být nahoře!)
    const startCol = Math.max(0, Math.floor(-this.camera.x / (this.tileSize * this.camera.zoom)));
    const endCol = Math.min(this.cols, Math.ceil((this.canvas.width - this.camera.x) / (this.tileSize * this.camera.zoom)));
    const startRow = Math.max(0, Math.floor(-this.camera.y / (this.tileSize * this.camera.zoom)));
    const endRow = Math.min(this.rows, Math.ceil((this.canvas.height - this.camera.y) / (this.tileSize * this.camera.zoom)));

    const sourceX = startCol * this.tileSize;
    const sourceY = startRow * this.tileSize;
    const sourceW = (endCol - startCol) * this.tileSize;
    const sourceH = (endRow - startRow) * this.tileSize;

    // 2. PASS: ZÁKLADNÍ TRÁVA (Vykreslovaná po dlaždicích)
    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            if (this.grid[r][c] === '-') continue;
            const bounds = this.getTileBounds(c, r);
            ctx.drawImage(this.grassVariants[this.terrainIndices[r][c]], bounds.x, bounds.y);
        }
    }

    // 3. PASS: VODA (Prerenderovaná vrstva - nyní už sourceX existuje)
    ctx.drawImage(this.waterLayer, sourceX, sourceY, sourceW, sourceH, sourceX, sourceY, sourceW, sourceH);

    // 4. PASS: CESTA (Prerenderovaná vrstva)
    ctx.drawImage(this.roadLayer, sourceX, sourceY, sourceW, sourceH, sourceX, sourceY, sourceW, sourceH);

    // 5. PASS: MARKERY (Start/Cíl)
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tok = String(this.grid[r][c] ?? '');
        if (/^S/i.test(tok)) {
          const bounds = this.getTileBounds(c, r);
          // PŘIDEJTE performance.now() JAKO ČTVRTÝ PARAMETR:
          this._drawMagicPortal(ctx, bounds.x + this.tileSize/2, bounds.y + this.tileSize/2, performance.now());
        }
        if (/^E/i.test(tok)) {
          const bounds = this.getTileBounds(c, r);
          // Zatím posíláme 100% zdraví, později propojíme s logikou hry
          this._drawLifeTree(ctx, bounds.x + this.tileSize/2, bounds.y + this.tileSize/2, 100);
        }
      }
    }

    ctx.restore(); // Konec transformace kamery

    // 6. PASS: AAA Cinematic Vignette (Screen-space efekt)
    const vGrad = ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, this.canvas.width/4, this.canvas.width/2, this.canvas.height/2, this.canvas.width);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
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
            if (tok === 'O' || /^S/i.test(tok) || /^E/i.test(tok)) {
                const worldX = c * ts;
                const worldY = r * ts;

                // 1. DRAW GRASS UNDERLAY
                // This ensures grass is the "mortar" between stones
                const grassIdx = this.terrainIndices[r][c];
                ctx.drawImage(this.grassVariants[grassIdx], worldX, worldY);

                // 2. SUBTLE DIRT BLEND (The "a little bit of brown" you asked for)
                // A soft radial glow of dirt color so it doesn't look like floating stones
                const grad = ctx.createRadialGradient(worldX+ts/2, worldY+ts/2, 0, worldX+ts/2, worldY+ts/2, ts/1.2);
                grad.addColorStop(0, "rgba(69, 53, 39, 0.4)"); // Center dirt
                grad.addColorStop(1, "rgba(69, 53, 39, 0)");   // Fade to grass
                ctx.fillStyle = grad;
                ctx.fillRect(worldX, worldY, ts, ts);

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

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] === 'W') {
            const x = c * ts;
            const y = r * ts;

            // Hluboká voda
            ctx.fillStyle = "#075985";
            ctx.fillRect(x, y, ts, ts);
            
            // Odlesky a hloubka
            const grad = ctx.createLinearGradient(x, y, x + ts, y + ts);
            grad.addColorStop(0, "rgba(255, 255, 255, 0.1)");
            grad.addColorStop(1, "rgba(0, 0, 0, 0.2)");
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, ts, ts);
          }
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

  _drawLifeTree(ctx, x, y, currentLifes) {
    const time = performance.now() * 0.001;
    const ts = this.tileSize;
    const isAlive = currentLifes > 0;
    
    const isHit = (performance.now() - this.lastHitTime) < 500;
    const shakeX = isHit ? Math.sin(performance.now() * 0.1) * 8 : 0;

    // Barvy: Bříza a Tyrkysová
    const woodColor = isAlive ? "#ffffff" : "#2d2d30";
    const barkDetail = isAlive ? "#334155" : "#18181b"; // Čárky na bříze
    const turquoiseDeep = "#0d9488"; // Sytá tyrkysová
    const turquoiseLight = "#2dd4bf"; // Zářivá tyrkysová (Cyan/Teal)

    ctx.save();
    ctx.translate(x + shakeX, y);

    // 1. KRATŠÍ KOŘENY (Více zapuštěné)
    ctx.strokeStyle = woodColor;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, ts * 0.2);
        const angle = (i * Math.PI * 2) / 5;
        // Zkráceno z 45 na 25
        ctx.quadraticCurveTo(
            Math.cos(angle) * 15, ts * 0.22,
            Math.cos(angle) * 25, ts * 0.28 
        );
        ctx.stroke();
    }

    // 2. TYRKYSOVÁ AURA
    if (isAlive) {
        const pulse = Math.sin(time * 2) * 8;
        const grad = ctx.createRadialGradient(0, -ts*0.2, 0, 0, -ts*0.2, ts * 0.8 + pulse);
        grad.addColorStop(0, "rgba(45, 212, 191, 0.3)"); 
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -ts*0.2, ts, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. MASIVNÍ KMEN BŘÍZY
    ctx.lineWidth = 16; 
    ctx.beginPath();
    ctx.moveTo(0, ts * 0.25);
    ctx.lineTo(0, -ts * 0.2);
    ctx.stroke();

    // DETAIL KŮRY (Černé rýhy typické pro břízu)
    if (isAlive) {
        ctx.strokeStyle = barkDetail;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const h = (ts * 0.15) - (i * ts * 0.1);
            ctx.beginPath();
            ctx.moveTo(-6, h);
            ctx.lineTo(-2, h);
            ctx.moveTo(3, h + 5);
            ctx.lineTo(7, h + 5);
            ctx.stroke();
        }
    }

    // 4. VĚTVE A TYRKYSOVÉ LISTÍ
    const branchPoints = [
        { angle: -Math.PI / 3.5, len: ts * 0.5, drift: 0 },
        { angle: -Math.PI / 2, len: ts * 0.6, drift: 0.5 },
        { angle: -Math.PI / 1.4, len: ts * 0.5, drift: 1 },
    ];

    branchPoints.forEach((b) => {
        const wind = Math.sin(time + b.drift) * 0.06;
        const endX = Math.cos(b.angle + wind) * b.len;
        const endY = Math.sin(b.angle + wind) * b.len - (ts * 0.15);

        ctx.strokeStyle = woodColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, -ts * 0.15);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        if (isAlive) {
            ctx.save();
            ctx.translate(endX, endY);
            ctx.shadowBlur = 15;
            ctx.shadowColor = turquoiseDeep;

            // Hustší trsy tyrkysového listí
            for (let j = 0; j < 4; j++) {
                const lx = Math.sin(time * 1.5 + j) * 8;
                const ly = Math.cos(time * 1.5 + j) * 6;
                const size = 12 + j * 2;
                
                const lGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, size);
                lGrad.addColorStop(0, turquoiseLight);
                lGrad.addColorStop(1, turquoiseDeep);
                ctx.fillStyle = lGrad;

                ctx.beginPath();
                ctx.arc(lx, ly, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    });

    // 5. STOUPAJÍCÍ MAGICKÉ LÍSTKY (Změna směru - nahoru)
    if (isAlive) {
        ctx.fillStyle = turquoiseLight;
        ctx.shadowBlur = 5;
        for (let i = 0; i < 4; i++) {
            const pTime = (time * 0.4 + i / 4) % 1;
            const px = Math.sin(i * 10 + time) * 45;
            // Částice nyní stoupají od země nahoru k nebi
            const py = (ts * 0.2) - (pTime * ts * 1.2); 
            ctx.globalAlpha = (1 - pTime) * 0.7;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}
}