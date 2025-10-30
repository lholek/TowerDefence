export default class Map {
    constructor(canvas, layout, tileSize = 80) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.layout = layout.map(row => row.split(''));
        this.rows = this.layout.length;
        this.cols = this.layout[0].length;
        this.tileSize = tileSize;

        // Kamera
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

        // Path
        this.path = this.generatePath();

        // Eventy
        this.canvas.addEventListener('mousedown', e => this.startDrag(e));
        this.canvas.addEventListener('mousemove', e => this.drag(e));
        this.canvas.addEventListener('mouseup', e => this.stopDrag());
        this.canvas.addEventListener('mouseleave', e => this.stopDrag());
        this.canvas.addEventListener('wheel', e => this.handleZoom(e));
        this.canvas.style.cursor = 'grab';

        // Clamp initial camera
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
                const pos = this.tileToWorld(c, r);
                const x = pos.x - this.tileSize / 2;
                const y = pos.y - this.tileSize / 2;
                ctx.fillStyle = this.layout[r][c] === 'O' ? '#888' : '#444';
                ctx.fillRect(x, y, this.tileSize, this.tileSize);
                ctx.strokeStyle = '#222';
                ctx.strokeRect(x, y, this.tileSize, this.tileSize);
            }
        }

        ctx.restore();
    }

    // --- TILE CONVERSIONS ---
    tileToWorld(col, row) {
        return { x: col * this.tileSize + this.tileSize / 2, y: row * this.tileSize + this.tileSize / 2 };
    }

    worldToTile(x, y) {
        return { col: Math.floor(x / this.tileSize), row: Math.floor(y / this.tileSize) };
    }

    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (screenX - rect.left - this.camera.x) / this.camera.zoom,
            y: (screenY - rect.top - this.camera.y) / this.camera.zoom
        };
    }

    getTileFromCoords(x, y) {
        const tile = this.worldToTile(x, y);
        tile.col = Math.max(0, Math.min(this.cols - 1, tile.col));
        tile.row = Math.max(0, Math.min(this.rows - 1, tile.row));
        return tile;
    }

    getTileCenter(col, row) {
        return this.tileToWorld(col, row);
    }

    isBuildableTile(col, row) {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows && this.layout[row][col] !== 'O';
    }

    // --- DRAG & ZOOM ---
    startDrag(e) {
        // Only allow middle mouse button (wheel) for dragging
        if (e.button !== 1) return; // 1 = middle button
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
        this.clampCamera(); // keep camera inside map
    }
    
    stopDrag() {
        if (this.camera.dragging) {
            this.camera.dragging = false;
            this.canvas.style.cursor = 'grab';
            this.clampCamera(); // clamp camera when drag ends
        }
    }

    handleZoom(e) {
        e.preventDefault();
        const zoomFactor = 1.05;
        const mouse = this.screenToWorld(e.clientX, e.clientY);

        if (e.deltaY < 0) this.camera.zoom *= zoomFactor;
        else this.camera.zoom /= zoomFactor;

        // Clamp zoom
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.zoom, this.camera.maxZoom));

        // Zoom around mouse
        const world = this.screenToWorld(e.clientX, e.clientY);
        this.camera.x += (mouse.x - world.x) * this.camera.zoom;
        this.camera.y += (mouse.y - world.y) * this.camera.zoom;

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
        const mapWidth = this.cols * this.tileSize * this.camera.zoom;
        const mapHeight = this.rows * this.tileSize * this.camera.zoom;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // X-axis
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
}
