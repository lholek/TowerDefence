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
    this._generateRoadVariants();
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
    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            const center = this.tileToWorld(c, r);
            const x = center.x - this.tileSize / 2;
            const y = center.y - this.tileSize / 2;
            const tok = String(this.grid[r][c] ?? '');

            if (tok === 'X') {
                // RENDER DETAILED GRASS
                const variantIndex = this.terrainIndices[r][c];
                ctx.drawImage(this.grassVariants[variantIndex], x, y);
            } else if (tok === 'O') {
                // 1. Draw the pre-generated tile (The base road)
                const roadIdx = this.terrainIndices[r][c] % this.roadVariants.length;
                ctx.drawImage(this.roadVariants[roadIdx], x, y);

                // 2. SEAMLESS OVERLAP LOGIC
                // We check neighbors. If there's a road to the East or South, 
                // we draw "Bridge Stones" that literally sit on the line between them.
                const neighbors = [
                    { dr: 0, dc: 1, side: 'E' }, // East
                    { dr: 1, dc: 0, side: 'S' }  // South
                ];
              
                neighbors.forEach((n, i) => {
                    const nr = r + n.dr;
                    const nc = c + n.dc;

                    // If the neighbor is also a road
                    if (nr < this.rows && nc < this.cols && this.grid[nr][nc] === 'O') {
                        // Use a unique seed based on tile position so stones don't "blink"
                        const seed = (r * 1000) + c + i;

                        // Draw 3-4 stones directly on the boundary line
                        for (let j = 0; j < 3; j++) {
                            const sRand = this._seededRandom(seed + j);

                            // Position stones exactly on the seam
                            const bridgeX = (n.side === 'E') ? x + this.tileSize : x + (sRand * this.tileSize);
                            const bridgeY = (n.side === 'S') ? y + this.tileSize : y + (sRand * this.tileSize);
                        
                            // Draw the stone (this will overlap both tiles)
                            this._drawSingleStone(ctx, bridgeX, bridgeY, ["#71717a", "#52525b", "#a1a1aa"]);
                        }
                    }
                });
            } else if (tok === '-') {
                ctx.fillStyle = 'transparent';
                ctx.fillRect(x, y, this.tileSize, this.tileSize);
            } else {
                // OTHER TILES
                let fill = '#111';
                switch (true) {
                    case (/^S/i.test(tok)): fill = '#1b4332'; break;
                    case (/^E/i.test(tok)): fill = '#450a0a'; break;
                    default: fill = '#1a1a1a'; break;
                }
                ctx.fillStyle = fill;
                ctx.fillRect(x, y, this.tileSize, this.tileSize);
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
    const center = this.tileToWorld(col, row);
    const x = center.x - this.tileSize / 2;
    const y = center.y - this.tileSize / 2;
    return { x, y, width: this.tileSize, height: this.tileSize };
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
    // 1. Natural Grey Palette (Zinc, Slate, and Stone Greys)
    const stoneColors = ["#71717a", "#52525b", "#a1a1aa", "#3f3f46", "#78716c", "#44403c"];

    for (let i = 0; i < 8; i++) {
        const canvas = document.createElement("canvas");
        canvas.width = this.tileSize;
        canvas.height = this.tileSize;
        const tctx = canvas.getContext("2d");

        // 2. Draw Grass Background
        const grassRef = this.grassVariants[i % this.grassVariants.length];
        tctx.drawImage(grassRef, 0, 0);

        // 3. Subtle "Dirt Path" underlay
        tctx.fillStyle = "rgba(68, 64, 60, 0.2)";
        tctx.beginPath();
        tctx.arc(this.tileSize/2, this.tileSize/2, this.tileSize/2.2, 0, Math.PI*2);
        tctx.fill();

        // 4. Higher Density Stone Scatter (Approx 30-40 attempts)
        for (let j = 0; j < 40; j++) {
            const x = Math.random() * this.tileSize;
            const y = Math.random() * this.tileSize;

            // NATURAL EDGE LOGIC: 
            // Stones are very likely in the center, but rare at the corners.
            const dx = x - this.tileSize / 2;
            const dy = y - this.tileSize / 2;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const normalizedDist = dist / (this.tileSize / 2);
            
            // If we are near the edge (dist > 0.7), we have a high chance to skip drawing
            if (normalizedDist > 0.8 && Math.random() > 0.1) continue;
            if (normalizedDist > 0.6 && Math.random() > 0.4) continue;

            this._drawSingleStone(tctx, x, y, stoneColors);
        }
        this.roadVariants.push(canvas);
    }
  }

  _drawSingleStone(tctx, x, y, colors) {
    // Use seeded random or math for size if calling from render to prevent blinking
    // For now, we'll keep it simple:
    const w = 8 + (Math.abs(Math.sin(x + y)) * 6); 
    const h = 6 + (Math.abs(Math.cos(x * y)) * 6);
    const col = colors[Math.floor(Math.abs(Math.sin(x)) * colors.length)];

    tctx.save();
    tctx.translate(x, y);

    // 1. Soft Shadow (makes it look like it's on top of grass)
    tctx.fillStyle = "rgba(0,0,0,0.25)";
    tctx.beginPath();
    tctx.roundRect(-w/2 + 1, -h/2 + 1, w + 1, h + 1, 3);
    tctx.fill();

    // 2. Stone Body
    tctx.fillStyle = col;
    tctx.beginPath();
    tctx.roundRect(-w/2, -h/2, w, h, 3);
    tctx.fill();

    // 3. Simple highlight
    tctx.strokeStyle = "rgba(255,255,255,0.1)";
    tctx.lineWidth = 1;
    tctx.strokeRect(-w/2, -h/2, w, h);

    tctx.restore();
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
}
