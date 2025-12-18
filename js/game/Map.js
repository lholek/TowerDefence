// js/game/Map.js
export default class Map {
  constructor(canvas, layout, tileSize = 80) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // normalize and store grid as 2D token array: this.grid[row][col]
    this.grid = this.normalizeLayout(layout);
    this.rows = this.grid.length;
    this.cols = this.grid[0].length;
    this.tileSize = tileSize;

    // camera state (keep your existing camera code)
    this.camera = {
      x: 0, y: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0,
      minZoom: 0.3, maxZoom: 1
    };

    // detect special tiles, starts/ends
    this.starts = {}; // e.g. {S1:{row,col}, ...}
    this.ends = {};
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = String(this.grid[r][c] ?? '');
        if (/^S/i.test(t)) this.starts[t] = { row: r, col: c };
        if (/^E/i.test(t)) this.ends[t] = { row: r, col: c };
      }
    }

    // Precompute paths for pairs S# -> E#
    this.paths = this.generatePaths();

    // Mouse events for drag/zoom (keep existing handlers)
    this.canvas.addEventListener('mousedown', e => this.startDrag(e));
    this.canvas.addEventListener('mousemove', e => this.drag(e));
    this.canvas.addEventListener('mouseup', e => this.stopDrag());
    this.canvas.addEventListener('mouseleave', e => this.stopDrag());
    this.canvas.addEventListener('wheel', e => this.handleZoom(e));
    this.canvas.style.cursor = 'grab';

    this.clampCamera();

    this.terrainIndices = [];
    for (let r = 0; r < this.rows; r++) {
        this.terrainIndices[r] = [];
        for (let c = 0; c < this.cols; c++) {
            // Assign a random number from 0 to 9
            this.terrainIndices[r][c] = Math.floor(Math.random() * 10);
        }
    }
    this._generateGrassTiles();
    this._generateRoadTemplates();
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
    const baseColor = '#3f7d3c';

    for (let i = 0; i < 10; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const tctx = canvas.getContext('2d');

        // 1. Fill Base
        tctx.fillStyle = baseColor;
        tctx.fillRect(0, 0, this.tileSize, this.tileSize);

        // 2. Add "Organic Blobs" (This fixes the grid look)
        // We draw dark/light blobs that cross tile boundaries
        tctx.fillStyle = 'rgba(0,0,0,0.05)';
        tctx.beginPath();
        tctx.arc(Math.random()*this.tileSize, Math.random()*this.tileSize, this.tileSize, 0, Math.PI*2);
        tctx.fill();

        // 3. Dense Grass Blades (Vertical)
        for (let j = 0; j < 40; j++) {
            const gx = Math.random() * this.tileSize;
            const gy = Math.random() * this.tileSize;
            
            // Dark blade
            tctx.fillStyle = 'rgba(0,0,0,0.1)';
            tctx.fillRect(gx, gy, 1, 4 + Math.random()*4);
            
            // Light blade
            tctx.fillStyle = 'rgba(255,255,255,0.06)';
            tctx.fillRect(gx+1, gy, 1, 2);
        }

        // 4. THE FIX: Corner Softening
        // Faintly darken the corners so tiles don't have "sharp" edges
        const grad = tctx.createRadialGradient(this.tileSize/2, this.tileSize/2, this.tileSize/4, this.tileSize/2, this.tileSize/2, this.tileSize/1.2);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,0,0.08)');
        tctx.fillStyle = grad;
        tctx.fillRect(0, 0, this.tileSize, this.tileSize);

        this.grassVariants.push(canvas);
    }
  }

  _generateStonePath() {
    this.stonePath = document.createElement("canvas");
    this.stonePath.width = this.tileSize;
    this.stonePath.height = this.tileSize;
    const tctx = this.stonePath.getContext("2d");

    // 1. MORTAR (Pitch Black gaps for maximum depth)
    tctx.fillStyle = "#0f172a"; 
    tctx.fillRect(0, 0, this.tileSize, this.tileSize);

    // 2. DARK SLATE STONES (Your specific layout)
    const stones = [
        { x: 0, y: 0, w: 0.45, h: 0.45, c: "#5F6366" },       // Slate Grey
        { x: 0.45, y: 0, w: 0.55, h: 0.35, c: "#62686D" },    // Dark Steel
        { x: 0, y: 0.45, w: 0.35, h: 0.55, c: "#868686" },    // Blueish Charcoal (Brightest)
        { x: 0.35, y: 0.35, w: 0.35, h: 0.35, c: "#817E7D" }, // Center Small
        { x: 0.7, y: 0.35, w: 0.3, h: 0.65, c: "#5F6366" },   // Side Tall
        { x: 0.35, y: 0.7, w: 0.35, h: 0.3, c: "#817E7D" }    // Bottom wide
    ];

    stones.forEach(s => {
        const x = s.x * this.tileSize;
        const y = s.y * this.tileSize;
        const w = s.w * this.tileSize;
        const h = s.h * this.tileSize;

        tctx.save();
        tctx.fillStyle = s.c;

        // 3. JAGGED SHAPE
        tctx.beginPath();
        tctx.moveTo(x + 2, y + 2);
        tctx.lineTo(x + w - 3, y + 3);
        tctx.lineTo(x + w - 2, y + h - 3);
        tctx.lineTo(x + 4, y + h - 2);
        tctx.closePath();
        tctx.fill();

        // 4. THE "STUNNING" GLINT (High Contrast Edges)
        // Even on dark stones, a bright thin edge makes it look premium
        tctx.strokeStyle = "rgba(255, 255, 255, 0.12)"; 
        tctx.lineWidth = 1;
        tctx.beginPath();
        tctx.moveTo(x + 4, y + h - 4);
        tctx.lineTo(x + 3, y + 3);
        tctx.lineTo(x + w - 4, y + 3);
        tctx.stroke();

        // 5. DEEP CRACKS (Weathering)
        if (Math.random() > 0.5) {
            tctx.strokeStyle = "rgba(0,0,0,0.5)";
            tctx.lineWidth = 1.5;
            tctx.beginPath();
            tctx.moveTo(x + w/2, y + 5);
            tctx.lineTo(x + w/2 - 3, y + h - 5);
            tctx.stroke();
        }
        
        tctx.restore();
    });

    // 6. SURFACE NOISE (Subtle Granite Grain)
    for (let i = 0; i < 40; i++) {
        tctx.fillStyle = "rgba(255,255,255,0.03)";
        tctx.fillRect(Math.random() * this.tileSize, Math.random() * this.tileSize, 1, 1);
    }
  }

  // --- RENDER (keeps your original render but uses tokens) ---
  render(ctx) {
    // 1. Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    // Calculate which tiles are visible (Viewport Culling)
    const startCol = Math.max(0, Math.floor(-this.camera.x / (this.tileSize * this.camera.zoom)));
    const endCol = Math.min(this.cols, Math.ceil((this.canvas.width - this.camera.x) / (this.tileSize * this.camera.zoom)));
    const startRow = Math.max(0, Math.floor(-this.camera.y / (this.tileSize * this.camera.zoom)));
    const endRow = Math.min(this.rows, Math.ceil((this.canvas.height - this.camera.y) / (this.tileSize * this.camera.zoom)));

    // SINGLE PASS FOR TERRAIN
    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            const tok = String(this.grid[r][c] ?? '');

            // 1. SKIP DRAWING IF TRANSPARENT TOKEN
            if (tok === '-') {
                continue; // Move to the next tile, leaving this area clear
            }
            
            const bounds = this.getTileBounds(c, r);

            // 1. Always draw grass first as the base
            const grassIdx = this.terrainIndices[r][c];
            ctx.drawImage(this.grassVariants[grassIdx], bounds.x, bounds.y);

            // 2. If it's a road, draw the BAKED template on top
            if (tok === 'O' || /^S/i.test(tok) || /^E/i.test(tok)) {
                const type = this._getRoadType(r, c);
                // This image already contains the bricks and the borders!
                ctx.drawImage(this.roadTiles[type], bounds.x, bounds.y);
            }
        }
    }

    // PASS 2: MARKERS (Keep this separate so they are always on top)
    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            const tok = String(this.grid[r][c] ?? '');
            if (/^S/i.test(tok) || /^E/i.test(tok)) {
                const bounds = this.getTileBounds(c, r);
                const centerX = bounds.x + this.tileSize / 2;
                const centerY = bounds.y + this.tileSize / 2;

                if (/^S/i.test(tok)) {
                    this._drawMarker(ctx, centerX, centerY, "#16a34a", "START", tok);
                } else {
                    this._drawMarker(ctx, centerX, centerY, "#dc2626", "END", tok);
                }
            }
        }
    }

    ctx.restore();
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

  syncSize() {
    const rect = this.canvas.getBoundingClientRect();
    const DPR = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * DPR);
    this.canvas.height = Math.round(rect.height * DPR);
    this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
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

  _generateRoadVariants() {
    this.roadVariants = [];
    // Natural Grey Palette
    const stoneColors = ["#71717a", "#52525b", "#a1a1aa", "#3f3f46", "#78716c", "#44403c"];

    for (let i = 0; i < 8; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const tctx = canvas.getContext("2d");

        // FIX 1: Clear canvas to be transparent (No grass drawn here anymore)
        tctx.clearRect(0, 0, this.tileSize, this.tileSize);

        // FIX 2: Dirt Path Underlay (Using semi-transparent brown)
        // This gives the stones a "grounded" look on the grass below
        tctx.fillStyle = "rgba(68, 64, 60, 0.3)";
        tctx.beginPath();
        tctx.arc(this.tileSize / 2, this.tileSize / 2, this.tileSize / 2.2, 0, Math.PI * 2);
        tctx.fill();

        // 3. Higher Density Stone Scatter
        for (let j = 0; j < 45; j++) {
            const x = Math.random() * this.tileSize;
            const y = Math.random() * this.tileSize;

            const dx = x - this.tileSize / 2;
            const dy = y - this.tileSize / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const normalizedDist = dist / (this.tileSize / 2);
            
            // Edge Erosion: Stones are denser in center, sparse at edges
            if (normalizedDist > 0.8 && Math.random() > 0.1) continue;
            if (normalizedDist > 0.6 && Math.random() > 0.4) continue;

            this._drawSingleStone(tctx, x, y, stoneColors);
        }
        this.roadVariants.push(canvas);
    }
  }

  _drawSingleStone(tctx, x, y, colors) {
    // Deterministic size/color based on position to prevent "flicker"
    const w = 6 + (Math.abs(Math.sin(x)) * 10);
    const h = 5 + (Math.abs(Math.cos(y)) * 8);
    const col = colors[Math.floor(Math.abs(Math.sin(x + y)) * colors.length)];
    const angle = Math.sin(x * y) * 0.5;

    tctx.save();
    tctx.translate(x, y);
    tctx.rotate(angle);

    // 1. Ambient Occlusion (Soft shadow under stone)
    tctx.fillStyle = "rgba(0,0,0,0.3)";
    tctx.beginPath();
    tctx.roundRect(-w/2 + 2, -h/2 + 2, w, h, 3);
    tctx.fill();

    // 2. Stone Body
    tctx.fillStyle = col;
    tctx.beginPath();
    tctx.roundRect(-w/2, -h/2, w, h, 3);
    tctx.fill();

    // 3. 3D Highlight (Top-Left bevel)
    tctx.strokeStyle = "rgba(255,255,255,0.15)";
    tctx.lineWidth = 1;
    tctx.strokeRect(-w/2, -h/2, w, h);

    tctx.restore();
  }
  
  // Add this if you haven't yet
  _seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
  }

  _drawRoadShape(ctx, x, y, w, h, n, s, w_edge, e_edge) {
    const r = 20; // Road edge roundness
    ctx.beginPath();
    // Top-Left
    if (!n && !w_edge) ctx.moveTo(x + r, y); else ctx.moveTo(x, y);
    // Top-Right
    if (!n && !e_edge) { ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); }
    else ctx.lineTo(x + w, y);
    // Bottom-Right
    if (!s && !e_edge) { ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); }
    else ctx.lineTo(x + w, y + h);
    // Bottom-Left
    if (!s && !w_edge) { ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); }
    else ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  _seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  _drawRoadConnections(ctx, r, c, x, y) {
    const connections = [
        { dr: 0, dc: 1, type: 'east' },
        { dr: 1, dc: 0, type: 'south' }
    ];

    connections.forEach(conn => {
        const nr = r + conn.dr;
        const nc = c + conn.dc;

        if (nr < this.rows && nc < this.cols && this.grid[nr][nc] === 'O') {
            const seed = (r * 31) + (c * 17);
            const stoneColors = ["#71717a", "#52525b", "#3f3f46", "#a1a1aa"];
            
            for (let i = 0; i < 4; i++) {
                const sRand = this._seededRandom(seed + i);
                
                const stoneX = (conn.type === 'east') ? x + this.tileSize : x + (sRand * this.tileSize);
                const stoneY = (conn.type === 'south') ? y + this.tileSize : y + (sRand * this.tileSize);

                this._drawSingleStone(ctx, stoneX, stoneY, stoneColors);
            }
        }
    });
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

  _generateRoadTemplates() {
    this.roadTiles = {};
    const types = ['H', 'V', 'LU', 'LD', 'RU', 'RD', 'TU', 'TD', 'TL', 'TR', 'CROSS', 'NONE'];

    // Brick settings
    const bW = this.tileSize / 3;
    const bH = this.tileSize / 4;

    types.forEach(type => {
        const canvas = document.createElement('canvas');
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const tctx = canvas.getContext('2d');
        
        const ts = this.tileSize;
        const p = Math.round(ts * 0.1); 

        const up = /V|LU|RU|TU|TL|TR|CROSS/.test(type);
        const down = /V|LD|RD|TD|TL|TR|CROSS/.test(type);
        const left = /H|LU|LD|TU|TD|TL|CROSS/.test(type);
        const right = /H|RU|RD|TU|TD|TR|CROSS/.test(type);

        // 1. MORTAR BASE
        tctx.fillStyle = "#1e293b"; 
        tctx.fillRect(0, 0, ts, ts);

        // 2. BAKE CONTINUOUS BRICKS
        // We simulate the global offset here so they align across tiles
        tctx.fillStyle = "#475569";
        for (let i = -1; i < 5; i++) {
            for (let j = -1; j < 5; j++) {
                const bx = j * bW;
                const by = i * bH;
                
                // The stagger logic stays the same
                const rowNum = i; 
                const stagger = (rowNum % 2 === 0) ? bW / 2 : 0;

                // Draw brick with 1px mortar gap
                tctx.fillRect(bx + stagger + 1, by + 1, bW - 2, bH - 2);
                
                // Add a tiny baked-in highlight for depth
                tctx.fillStyle = "rgba(255,255,255,0.05)";
                tctx.fillRect(bx + stagger + 1, by + 1, bW - 2, 1);
                tctx.fillStyle = "#475569";
            }
        }

        // 3. BAKE POLISHED BORDERS ON TOP
        tctx.fillStyle = "#94a3b8"; 
        if (!up) tctx.fillRect(0, 0, ts, p);
        if (!down) tctx.fillRect(0, ts - p, ts, p);
        if (!left) tctx.fillRect(0, 0, p, ts);
        if (!right) tctx.fillRect(ts - p, 0, p, ts);

        // Fill the 4 outer corners for perfect connectivity
        tctx.fillRect(0, 0, p, p);
        tctx.fillRect(ts - p, 0, p, p);
        tctx.fillRect(0, ts - p, p, p);
        tctx.fillRect(ts - p, ts - p, p, p);

        this.roadTiles[type] = canvas;
    });
  }

  _getRoadType(r, c) {
    const check = (row, col) => {
        const t = this.getTileStatus(col, row);
        // Returns true if neighbor is a road, start, or end
        return t === 'O' || /^S/i.test(t) || /^E/i.test(t);
    };

    const U = check(r - 1, c);
    const D = check(r + 1, c);
    const L = check(r, c - 1);
    const R = check(r, c + 1);

    if (L && R && U && D) return 'CROSS';
    if (L && R && U) return 'TU';
    if (L && R && D) return 'TD';
    if (U && D && L) return 'TL';
    if (U && D && R) return 'TR';
    if (L && U) return 'LU';
    if (L && D) return 'LD';
    if (R && U) return 'RU';
    if (R && D) return 'RD';
    if (L && R) return 'H';
    if (U && D) return 'V';
    return 'NONE';
  }
}
