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
      minZoom: 0.5, maxZoom: 1
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
    for (const sKey of Object.keys(this.starts)) {
      // match number part
      const id = sKey.replace(/^S/i, '');
      const eKey = 'E' + id;
      if (this.ends[eKey]) {
        const p = this.findPathBFS(this.starts[sKey], this.ends[eKey]);
        if (p) paths[sKey] = p;
        else paths[sKey] = []; // empty path means no route
      }
    }
    // fallback: if there are no S/E pairs, maybe old maps use single path 'O' sequence.
    // We do NOT create fallback path here; Game can handle missing paths.
    return paths;
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
        let fill = '#444';
        if (tok === 'O') fill = '#888';
        else if (/^S/i.test(tok)) fill = '#888';
        else if (/^E/i.test(tok)) fill = '#888';
        else if (tok === '-') fill = 'transparent';
        else if (tok === 'X') fill = '#444444';
        else fill = '#4a4a4a';

        ctx.fillStyle = fill;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        const DPR = window.devicePixelRatio || 1;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1 * DPR; // scale border with DPR
        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
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
}
