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

        tctx.fillStyle = baseColors[i % baseColors.length];
        tctx.fillRect(0, 0, this.tileSize, this.tileSize);

        // Přidání lístků a jetele
        for (let j = 0; j < 15; j++) {
            const lx = Math.random() * this.tileSize;
            const ly = Math.random() * this.tileSize;
            tctx.save();
            tctx.translate(lx, ly);
            tctx.rotate(Math.random() * Math.PI);
            
            if (Math.random() > 0.7) {
                tctx.fillStyle = "#8a5a23"; // Suchý list
                tctx.beginPath();
                tctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI * 2);
                tctx.fill();
            } else {
                tctx.fillStyle = "#4ade80"; // Jetel
                for(let k=0; k<3; k++) {
                    tctx.rotate((Math.PI * 2) / 3);
                    tctx.beginPath();
                    tctx.arc(2, 0, 1.5, 0, Math.PI * 2);
                    tctx.fill();
                }
            }
            tctx.restore();
        }
        this.grassVariants.push(canvas);
    }
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
            if (/^S|E/i.test(tok)) {
                const bounds = this.getTileBounds(c, r);
                this._drawMarker(ctx, bounds.x + this.tileSize/2, bounds.y + this.tileSize/2, /^S/i.test(tok) ? "#16a34a" : "#dc2626", tok);
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

                // 4. ADD EDGE OVERGROWTH (Grass covering the road edges)
                this._drawGrassOvergrowth(ctx, r, c);
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

  _drawGrassOvergrowth(ctx, r, c) {
    const ts = this.tileSize;
    const wx = c * ts;
    const wy = r * ts;

    const isNotRoad = (nr, nc) => {
        if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) return true;
        const nt = String(this.grid[nr][nc] ?? '');
        return !(nt === 'O' || /^S/i.test(nt) || /^E/i.test(nt));
    };

    ctx.fillStyle = "rgba(40, 70, 25, 0.5)"; // Deep grass color
    
    // Check neighbors: if North is grass, draw overgrowth on the top of this tile
    const sides = [
        { d: [-1, 0], x: wx, y: wy, w: ts, h: ts * 0.2 }, // North
        { d: [1, 0], x: wx, y: wy + ts * 0.8, w: ts, h: ts * 0.2 }, // South
        { d: [0, -1], x: wx, y: wy, w: ts * 0.2, h: ts }, // West
        { d: [0, 1], x: wx + ts * 0.8, y: wy, w: ts * 0.2, h: ts } // East
    ];

    sides.forEach(s => {
        if (isNotRoad(r + s.d[0], c + s.d[1])) {
            // Draw a fuzzy edge of grass over the stones
            for(let i=0; i<10; i++) {
                const px = s.x + Math.random() * s.w;
                const py = s.y + Math.random() * s.h;
                ctx.beginPath();
                ctx.arc(px, py, 4 + Math.random() * 6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
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
}