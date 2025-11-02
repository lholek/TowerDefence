export default class Map {
    constructor(canvas, layout, tileSize = 80) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // layout: array of strings -> convert to 2D array of chars
        this.layout = layout.map(row => row.split(''));
        this.rows = this.layout.length;
        this.cols = this.layout[0].length;
        this.tileSize = tileSize;

        // Camera state
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            dragging: false,
            lastX: 0,
            lastY: 0,
            minZoom: 0.5,
            maxZoom: 1
        };

        // Precompute path
        this.path = this.generatePath();

        // Mouse events for drag/zoom
        this.canvas.addEventListener('mousedown', e => this.startDrag(e));
        this.canvas.addEventListener('mousemove', e => this.drag(e));
        this.canvas.addEventListener('mouseup', e => this.stopDrag());
        this.canvas.addEventListener('mouseleave', e => this.stopDrag());
        this.canvas.addEventListener('wheel', e => this.handleZoom(e));
        this.canvas.style.cursor = 'grab';

        // Ensure camera is clamped initially
        this.clampCamera();
    }

    // --- PATH GENERATION ---
    generatePath() {
        const openTiles = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.layout[r][c] === 'O') openTiles.push({ x: c, y: r });
            }
        }

        if (!openTiles.length) return [];

        let start = openTiles.find(t => t.x === 0) || openTiles[0];
        const path = [start];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);
        let current = start;
        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

        const neighbors = tile =>
            dirs.map(d => ({ x: tile.x + d.x, y: tile.y + d.y }))
                .filter(n => n.x >= 0 && n.x < this.cols && n.y >= 0 && n.y < this.rows
                    && this.layout[n.y][n.x] === 'O'
                    && !visited.has(`${n.x},${n.y}`));

        while (true) {
            const nextTiles = neighbors(current);
            if (nextTiles.length === 0) break;
            const next = nextTiles[0];
            path.push(next);
            visited.add(`${next.x},${next.y}`);
            current = next;
        }

        return path;
    }

    // --- RENDER ---
    render(ctx) {
        ctx.save();
        ctx.translate(this.camera.x, this.camera.y);
        ctx.scale(this.camera.zoom, this.camera.zoom);

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const center = this.tileToWorld(c, r);
                const x = center.x - this.tileSize / 2;
                const y = center.y - this.tileSize / 2;
                ctx.fillStyle = this.layout[r][c] === 'O' ? '#888' : '#444';
                ctx.fillRect(x, y, this.tileSize, this.tileSize);
                ctx.strokeStyle = '#222';
                ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            }
        }

        ctx.restore();
    }

    // --- TILE / COORD conversions ---
    // returns center of tile in world coords
    tileToWorld(col, row) {
        return {
            x: col * this.tileSize + this.tileSize / 2,
            y: row * this.tileSize + this.tileSize / 2
        };
    }

    // convert world coords -> tile indices
    worldToTile(x, y) {
        return {
            col: Math.floor(x / this.tileSize),
            row: Math.floor(y / this.tileSize)
        };
    }

    // convert raw client/screen coordinates (e.clientX/clientY) -> world coords
    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        // account for canvas position and camera transform
        const worldX = (screenX - rect.left - this.camera.x) / this.camera.zoom;
        const worldY = (screenY - rect.top - this.camera.y) / this.camera.zoom;
        return { x: worldX, y: worldY };
    }

    // Accepts world coordinates (NOT screen coordinates)
    // Returns clamped {col,row}
    getTileFromCoords(worldX, worldY) {
        const t = this.worldToTile(worldX, worldY);
        return {
            col: Math.max(0, Math.min(this.cols - 1, t.col)),
            row: Math.max(0, Math.min(this.rows - 1, t.row))
        };
    }

    // get center position (keeps compatibility with older code)
    getTileCenter(col, row) {
        return this.tileToWorld(col, row);
    }

    isBuildableTile(col, row) {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows && this.layout[row][col] !== 'O';
    }

    // --- DRAG & ZOOM ---
    startDrag(e) {
        // Only allow middle mouse for dragging (wheel)
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

        // Client coordinates of the mouse
        const screenX = e.clientX;
        const screenY = e.clientY;

        // World coords under mouse *before* zoom
        const before = this.screenToWorld(screenX, screenY);

        // Update zoom
        if (e.deltaY < 0) this.camera.zoom *= zoomFactor;
        else this.camera.zoom /= zoomFactor;

        // clamp zoom
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.zoom, this.camera.maxZoom));

        // After changing zoom, set camera.x/y so the same world point stays under the cursor
        const rect = this.canvas.getBoundingClientRect();
        // camera.x is a screen-space translation (in client pixels)
        this.camera.x = screenX - rect.left - before.x * this.camera.zoom;
        this.camera.y = screenY - rect.top - before.y * this.camera.zoom;

        // Enforce bounds
        this.clampCamera();
    }

    applyCameraTransform(ctx) {
        ctx.save();
        ctx.translate(this.camera.x, this.camera.y);
        ctx.scale(this.camera.zoom, this.camera.zoom);
    }

    resetTransform(ctx) {
        ctx.restore();
    }

    // --- CAMERA BOUNDS ---
    clampCamera() {
        const rect = this.canvas.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;

        const mapWidth = this.cols * this.tileSize * this.camera.zoom;
        const mapHeight = this.rows * this.tileSize * this.camera.zoom;

        // If map narrower than canvas — center it
        if (mapWidth <= canvasWidth) {
            this.camera.x = (canvasWidth - mapWidth) / 2;
        } else {
            const minX = canvasWidth - mapWidth;
            const maxX = 0;
            this.camera.x = Math.min(maxX, Math.max(minX, this.camera.x));
        }

        // Y-axis
        if (mapHeight <= canvasHeight) {
            this.camera.y = (canvasHeight - mapHeight) / 2;
        } else {
            const minY = canvasHeight - mapHeight;
            const maxY = 0;
            this.camera.y = Math.min(maxY, Math.max(minY, this.camera.y));
        }
    }

    // world coords (not screen)
    isInsideMap(worldX, worldY) {
        const mapWidth = this.cols * this.tileSize;
        const mapHeight = this.rows * this.tileSize;
        return worldX >= 0 && worldX < mapWidth && worldY >= 0 && worldY < mapHeight;
    }

    // Returns tile bounds in world coordinates (top-left + size)
    getTileBounds(col, row) {
        const center = this.tileToWorld(col, row);
        const x = center.x - this.tileSize / 2;
        const y = center.y - this.tileSize / 2;
        return { x, y, width: this.tileSize, height: this.tileSize };
    }

    // Make canvas.width/height match CSS/displayed size (client pixels).
    // Keeps drawing and client mouse coords in the same coordinate space.
    syncSize() {
        const rect = this.canvas.getBoundingClientRect();
        const DPR = window.devicePixelRatio || 1;

        // Set actual backing store size with DPR for sharpness
        this.canvas.width = Math.round(rect.width * DPR);
        this.canvas.height = Math.round(rect.height * DPR);

        // Make sure the canvas style remains the same (do not overwrite CSS)
        // Scale the context so drawing calls are in CSS pixels coordinates
        this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

}
