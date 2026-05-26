import { currentLevelData, currentTileType, setCurrentTileType, tileTypes, getCurrentMap, getNextAvailableMarker } from './level_data.js';
import { modifyJson } from './json_functions.js';
import GameMap from '../game/Map.js';

// Get references to elements (will be imported by main.js)
let canvas, ctx, mapCanvasContainer, mapLayoutWrapper, tileKey;
let setStatus;

// Canvas rendering constants
const TILE_SIZE = 60; // Base size for drawing tiles (this.tileSize equivalent)

// Camera State 
const camera = {
    x: 0, y: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0,
    minZoom: 0.1, maxZoom: 1
};

// Global variable to store the position of the currently hovered tile
let hoveredTile = { r: -1, c: -1 };

// --- GameMap instance used for visual rendering ---
let editorMapInstance = null;
let editorMapLayoutKey = ''; // Tracks layout shape to know when to rebuild

/**
 * Forces a full rebuild of the GameMap rendering instance on the next renderMap() call.
 * Call this whenever a completely new map is loaded (e.g. from JSON import).
 */
export function resetEditorMap() {
    editorMapInstance = null;
    editorMapLayoutKey = '';
}

let hoverTimer;

// --- New Drawing State Variables ---
let isDrawingLeft = false; // Tracks if left button (0) is held for drawing
let isDrawingRight = false; // Tracks if right button (2) is held for erasing
let hasDrawn = false; // Tracks if any tile was modified during a draw session
let activeDrawTileType = null; // Locks the tile type for the current drag session

// --- Dynamic Brush State ---
let brushShape = 'square'; // 'square' or 'star'
let brushSize = 1;        // Radius/Size (1 to 20)

// Placeholder for external module references
export function setModuleReferences(refs) {
    canvas = refs.canvas;
    ctx = refs.ctx;
    mapCanvasContainer = refs.mapCanvasContainer;
    mapLayoutWrapper = refs.mapLayoutWrapper;
    tileKey = refs.tileKey;
    setStatus = refs.setStatus;
}

// --- Coordinate Conversion Helpers ---

/**
 * Converts screen coordinates (mouse click) to world coordinates (unscaled, untranslated map space).
 */
function screenToWorld(screenX, screenY) {
    const rect = canvas.getBoundingClientRect();
    // Account for possible CSS scaling of the canvas element
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Convert screen (client) coords to canvas drawing-buffer coords,
    // then apply reverse camera transform and zoom to get world coords.
    const canvasX = (screenX - rect.left) * scaleX;
    const canvasY = (screenY - rect.top) * scaleY;

    const worldX = (canvasX - camera.x) / camera.zoom;
    const worldY = (canvasY - camera.y) / camera.zoom;
    return { x: worldX, y: worldY };
}

/**
 * Converts world coordinates to raw tile index (column, row).
 */
function worldToTile(x, y) {
    return {
        col: Math.floor(x / TILE_SIZE),
        row: Math.floor(y / TILE_SIZE)
    };
}

/**
 * Gets the clamped tile index from screen coordinates.
 */
function getTileFromScreen(screenX, screenY, rows, cols) {
    const world = screenToWorld(screenX, screenY);
    const tile = worldToTile(world.x, world.y);
    
    return {
        col: Math.max(0, Math.min(cols - 1, tile.col)),
        row: Math.max(0, Math.min(rows - 1, tile.row))
    };
}


// --- Camera Movement Logic ---

function clampCamera() {
    // Use canvas drawing-buffer size (not CSS pixels) for camera clamping
    const containerWidth = canvas.width;
    const containerHeight = canvas.height;
    
    const layout = currentLevelData.maps[0].layout;

    // Guard against empty layout before accessing layout[0].length
    if (!layout || layout.length === 0 || layout[0].length === 0) {
        return; 
    }

    const rows = layout.length;
    const cols = layout[0].length;
    
    // Total rendered map dimensions after zoom (in drawing-buffer units)
    const mapWidth = cols * TILE_SIZE * camera.zoom;
    const mapHeight = rows * TILE_SIZE * camera.zoom;

    // Clamp X
    if (mapWidth <= containerWidth) {
        camera.x = (containerWidth - mapWidth) / 2;
    } else {
        const minX = containerWidth - mapWidth;
        const maxX = 0;
        camera.x = Math.min(maxX, Math.max(minX, camera.x));
    }

    // Clamp Y
    if (mapHeight <= containerHeight) {
        camera.y = (containerHeight - mapHeight) / 2;
    } else {
        const minY = containerHeight - mapHeight;
        const maxY = 0;
        camera.y = Math.min(maxY, Math.max(minY, camera.y));
    }
    
    // Rerender after clamping
    renderMap();
}

function startDrag(e) {
    // Only allow drag on middle click (button 1). Exclude left (0) and right (2) clicks.
    if (e.button !== 1) return; 

    e.preventDefault(); 
    camera.dragging = true;
    // Store last positions in canvas drawing-buffer coords
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    camera.lastX = (e.clientX - rect.left) * scaleX;
    camera.lastY = (e.clientY - rect.top) * scaleY;
    mapCanvasContainer.classList.add('panning');
}

function drag(e) {
    if (!camera.dragging) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const newX = (e.clientX - rect.left) * scaleX;
    const newY = (e.clientY - rect.top) * scaleY;
    const dx = newX - camera.lastX;
    const dy = newY - camera.lastY;
    camera.x += dx;
    camera.y += dy;
    camera.lastX = newX;
    camera.lastY = newY;
    clampCamera(); 
}

function stopDrag() {
    if (camera.dragging) {
        camera.dragging = false;
        mapCanvasContainer.classList.remove('panning');
        clampCamera();
    }
}

function handleZoom(e) {
    e.preventDefault();
    
    const zoomFactor = 1.1; 
    const screenX = e.clientX;
    const screenY = e.clientY;
    
    // 1. Get world coordinate *before* zoom
    const beforeWorld = screenToWorld(screenX, screenY);
    
    // 2. Apply zoom factor
    if (e.deltaY < 0) camera.zoom *= zoomFactor;
    else camera.zoom /= zoomFactor;
    
    // 3. Clamp zoom level
    camera.zoom = Math.max(camera.minZoom, Math.min(camera.zoom, camera.maxZoom));
    
    // 4. Adjust camera position (pan) so the point under the cursor stays fixed in screen space
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (screenX - rect.left) * scaleX;
    const canvasY = (screenY - rect.top) * scaleY;
    camera.x = canvasX - beforeWorld.x * camera.zoom;
    camera.y = canvasY - beforeWorld.y * camera.zoom;
    
    clampCamera(); 
}

function resolvePlacementTileType(tileType) {
    if (tileType === 'S' || tileType === 'E') {
        return getNextAvailableMarker(tileType);
    }

    return tileType;
}

// --- Drawing Logic Helpers ---

/**
 * Applies the given tile type using the CURRENT BRUSH shape.
 */
function applyTileToCurrentPosition(screenX, screenY, tileType) {
    const layout = currentLevelData.maps[0].layout;
    if (!layout || layout.length === 0) return false;

    const resolvedTileType = resolvePlacementTileType(tileType);

    // If we are placing a Start or End, and we have already drawn something 
    // during this specific click-and-hold session, STOP.
    const isMarker = (resolvedTileType.startsWith('S') && resolvedTileType !== 'SNW' && resolvedTileType !== 'SND') || resolvedTileType.startsWith('E');
    if (isMarker && hasDrawn) {
        return false; 
    }

    const { row, col } = getTileFromScreen(screenX, screenY, layout.length, layout[0].length);
    const tilesToPaint = getBrushAffectedTiles(row, col);

    let changed = false;

    tilesToPaint.forEach(tile => {
        if (tile.r >= 0 && tile.r < layout.length && tile.c >= 0 && tile.c < layout[0].length) {
            const oldTile = String(layout[tile.r][tile.c]);
            const tileToPlace = resolvedTileType;

            // Standard placement logic
            if (oldTile !== tileToPlace) {
                // Prevent overwriting a different S with an S, or E with an E
                // This stops the "machine gun" effect even for big brushes
                const isMarkerS = (t) => t.startsWith('S') && t !== 'SNW' && t !== 'SND';
                const isMarkerE = (t) => t.startsWith('E');
                            
                const overwritingSameCategory = 
                    (isMarkerS(oldTile) && isMarkerS(tileToPlace)) ||
                    (isMarkerE(oldTile) && isMarkerE(tileToPlace));
                            
                if (overwritingSameCategory) return;

                layout[tile.r][tile.c] = tileToPlace;
                changed = true;
            }
        }
    });

    if (changed) {
        hasDrawn = true; // This prevents the next "move" event from placing another marker
        renderMap(layout);
        return true;
    }
    return false;
}
// --- Interaction Handlers (Drawing/Erasing) ---

function handleMapDrawStart(e) {
    // If we are currently panning with the middle mouse button, ignore drawing attempt
    if (camera.dragging) return; 

    // Left click (button 0)
    if (e.button === 0) {
        isDrawingLeft = true;
        isDrawingRight = false; // Ensure only one mode is active
        hasDrawn = false;
        activeDrawTileType = resolvePlacementTileType(currentTileType);
        const wasApplied = applyTileToCurrentPosition(e.clientX, e.clientY, activeDrawTileType);

        if (wasApplied) {
            if (activeDrawTileType.startsWith('S') && activeDrawTileType !== 'SNW' && activeDrawTileType !== 'SND') {
                setCurrentTileType('REFRESH_S');
            } else if (activeDrawTileType.startsWith('E')) {
                setCurrentTileType('REFRESH_E');
            }
        }
    } 
    // Right click (button 2)
    else if (e.button === 2) {
        e.preventDefault(); // Prevents context menu
        isDrawingRight = true;
        isDrawingLeft = false; // Ensure only one mode is active
        hasDrawn = false;
        activeDrawTileType = '-';
        applyTileToCurrentPosition(e.clientX, e.clientY, activeDrawTileType); // Default tile for erasing
    }
}

function handleMapDrawStop() {
    // 1. Sync changes to the JSON editor if drawing occurred
    if (hasDrawn && (isDrawingLeft || isDrawingRight)) {
        resetEditorMap();
        // Call modifyJson with an empty operation to sync the already-changed currentLevelData 
        // back to the JSON editor and trigger any required updates.
        modifyJson(() => {}, `Map updated by drag-drawing.`, true);
    }

    // 2. Clear drawing state
    isDrawingLeft = false;
    isDrawingRight = false;
    hasDrawn = false;
    activeDrawTileType = null;
}

function handleMapDrawMove(e) {
    // If panning is active, do not draw
    if (camera.dragging) return; 
    
    // Apply tile if the left button is held down
    if (isDrawingLeft) {
        applyTileToCurrentPosition(e.clientX, e.clientY, activeDrawTileType ?? currentTileType);
    } 
    // Apply default tile if the right button is held down
    else if (isDrawingRight) {
        applyTileToCurrentPosition(e.clientX, e.clientY, activeDrawTileType ?? '-');
    }
}

/**
 * Resets the drawing state when the window loses focus (e.g., Alt+Tab is used).
 * This is crucial to prevent the continuous drawing feature from getting stuck "on".
 */
function handleWindowFocusChange() {
    handleMapDrawStop();
}


// --- Main Interaction Setup ---

export function setupMapInteractions() {
    // Primary interactions for Panning/Zooming
    mapCanvasContainer.addEventListener('mousedown', startDrag);
    mapCanvasContainer.addEventListener('mousemove', drag);
    mapCanvasContainer.addEventListener('mouseup', stopDrag);
    mapCanvasContainer.addEventListener('mouseleave', stopDrag);
    mapCanvasContainer.addEventListener('wheel', handleZoom);
    
    // Disable context menu (right-click)
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    
    // Setup Continuous Drawing/Erasing
    canvas.addEventListener('mousedown', handleMapDrawStart); 
    canvas.addEventListener('mouseup', handleMapDrawStop); 
    canvas.addEventListener('mouseleave', handleMapDrawStop); 
    canvas.addEventListener('mousemove', handleMapDrawMove); 

    // Tile Hover effect
    canvas.addEventListener('mousemove', handleMapHover);
    canvas.addEventListener('mouseleave', renderMap); // Clear hover when mouse leaves
    
    // FIX: Reset drawing state if window loses focus (Alt+Tab)
    window.addEventListener('blur', handleWindowFocusChange);

    // Initial clamp/render to ensure map is centered on load
    clampCamera();
}

function handleMapHover(e) {
    const layout = currentLevelData.maps[0].layout;

    if (!layout || layout.length === 0 || layout[0].length === 0) return;

    const { row, col } = getTileFromScreen(e.clientX, e.clientY, layout.length, layout[0].length);
    const coordDisplay = document.getElementById('tileCoordinates');

    if (row >= 0 && row < layout.length && col >= 0 && col < layout[0].length) {
        
        // --- 1. Instant Visual Update (Brush/Ghost Tiles) ---
        if (hoveredTile.r !== row || hoveredTile.c !== col) {
            hoveredTile = { r: row, c: col };
            renderMap(layout); // Re-renders immediately so the brush follows the mouse
        }

        // --- 2. Delayed Coordinate Update (50ms) ---
        clearTimeout(hoverTimer); // Reset the timer every time the mouse moves
        hoverTimer = setTimeout(() => {
            if (coordDisplay) {
                coordDisplay.textContent = `X: ${col}, Y: ${row}`;
            }
        }, 25); 

    } else {
        // Clear everything if mouse leaves the map area
        clearTimeout(hoverTimer);
        if (coordDisplay) coordDisplay.textContent = "W: -, H: -";

        if (hoveredTile.r !== -1) {
            hoveredTile = { r: -1, c: -1 };
            renderMap(layout);
        }
    }
}


// --- Map Rendering (Canvas API) ---

/**
 * Renders the map grid onto the canvas.
 */
export function renderMap(layout = currentLevelData.maps[0].layout) {
    // ----------------------------------------------------
    // ADDED GUARD CLAUSES TO PREVENT TypeError
    // ----------------------------------------------------
    if (!ctx || !layout || !Array.isArray(layout) || layout.length === 0) return;

    // Check 2: Does the first row exist and is it not empty? 
    if (!layout[0] || !Array.isArray(layout[0]) || layout[0].length === 0) {
        setStatus("Error: Map layout's first row is missing or empty.", true);
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); 
        return; 
    }
    
    const rows = layout.length;
    const cols = layout[0].length;
    // ----------------------------------------------------

    // 1. Resize Canvas to match its CSS/display size (avoid drawing-buffer scaling)
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));

    // 2. Build or rebuild the GameMap instance when the layout shape changes.
    //    We use TILE_SIZE from the editor so the scale matches 1:1.
    const layoutKey = `${rows}x${cols}`;
    if (!editorMapInstance || editorMapLayoutKey !== layoutKey) {
        editorMapInstance = new GameMap(canvas, layout, TILE_SIZE);

        // GameMap registers its own drag/zoom listeners on the canvas in its constructor.
        // The editor has its own handlers for these, so we must neutralise the Map ones
        // by replacing them with no-ops bound to a dummy object that can never fire.
        // The cleanest way: replace the three bound methods so they do nothing.
        editorMapInstance.startDrag = () => {};
        editorMapInstance.drag      = () => {};
        editorMapInstance.stopDrag  = () => {};
        editorMapInstance.handleZoom = () => {};

        editorMapLayoutKey = layoutKey;
    } else {
        // Layout shape is the same — just update the grid in-place so the
        // next render() call picks up any tile edits the user made.
        editorMapInstance.grid = editorMapInstance.normalizeLayout(layout);

        // Rebuild the road/water layers so edited tiles are reflected correctly.
        // These are fast offscreen-canvas operations.
        editorMapInstance._prerenderRoad();
        editorMapInstance._prerenderWater
            ? editorMapInstance._prerenderWater()
            : editorMapInstance._prerenderWaterHigh?.();
        editorMapInstance._prerenderGrass();
    }

    // 3. Sync the editor camera → GameMap camera so pan/zoom is shared.
    editorMapInstance.camera.x    = camera.x;
    editorMapInstance.camera.y    = camera.y;
    editorMapInstance.camera.zoom = camera.zoom;

    // Expose internals for debugging in the page context
    try {
        window._editorMapDebug = window._editorMapDebug || {};
        window._editorMapDebug.instance = editorMapInstance;
        window._editorMapDebug.camera = camera;
    } catch (err) {
        // ignore in environments where window is not available
    }

    // 4. Let GameMap do all the heavy visual rendering (terrain, roads, water,
    //    mountains, trees, portals, vignette…). Pass no towers/enemies.
    editorMapInstance.render(ctx);

    // Light grid overlay for precise alignment in the editor
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.lineWidth = 1 / camera.zoom;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';

    for (let c = 0; c <= cols; c++) {
        const x = c * TILE_SIZE;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rows * TILE_SIZE);
        ctx.stroke();
    }

    for (let r = 0; r <= rows; r++) {
        const y = r * TILE_SIZE;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cols * TILE_SIZE, y);
        ctx.stroke();
    }

    ctx.restore();

    // 5. BRUSH GHOST OVERLAY — drawn on top in world-space
    if (hoveredTile.r !== -1 && hoveredTile.c !== -1) {
        const ghostTiles = getBrushAffectedTiles(hoveredTile.r, hoveredTile.c);

        ctx.save();
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.zoom, camera.zoom);

        if (isDrawingRight) {
            ctx.fillStyle   = 'rgba(255, 0, 0, 0.3)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        } else {
            ctx.fillStyle   = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        }
        ctx.lineWidth = 2 / camera.zoom;

        ghostTiles.forEach(tile => {
            const gx = tile.c * TILE_SIZE;
            const gy = tile.r * TILE_SIZE;
            ctx.fillRect(gx, gy, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(gx, gy, TILE_SIZE, TILE_SIZE);
        });

        ctx.restore();
    }

    // Re-render the key/palette every time
    createTileKey();

    // Call the update function to ensure the "map_size" metadata is correct
    updateMapInfo();
}

/**
 * Creates the key/legend for tile types and selection controls.
 */
function createTileKey() {
    const container = document.getElementById('tileKey');
    if (!container) return;

    // Uložení pozice scrollu
    const activeSlider = container.querySelector('.tile-grid-main');
    const savedScrollLeft = activeSlider ? activeSlider.scrollLeft : 0;

    const labels = {
        'X': 'Grass', 'SNW': 'Snow', 'SND': 'Sand', 'O': 'Path',
        'O[SNW]': 'Path Snow', 'O[SND]': 'Path Sand', 'S': 'Start',
        'E': 'End',
        'W': 'Water', 'M': 'MountainS', '-': 'Air'
    };

    const customOrder = [
        'S', 'O', 'E', 'O[SNW]','X', 'O[SND]',
        'SNW', 'SND', 'W', 'M', '-'
    ];

    const sortedTiles = customOrder.filter(type => labels[type] !== undefined);

    let html = `
        <div class="tile-editor-header">
            <strong>Selected:</strong> <span id="currentTileDisplay" class="current-tile-display"></span> 
            <span id="tileCoordinates" class="tileCoordinates">X: - | Y: -</span>
        </div>
        
        <div class="tile-slider-wrapper">
            <div class="tile-grid-main" id="tileSlider">
    `;
    
    sortedTiles.forEach(type => {
        const labelText = labels[type] || 'Unknown';
        let baseType = type.replace(/[\[\]]/g, '-').replace(/[0-9]/g, '').toLowerCase().replace('--', '-').replace(/-$/, '') || '-';
        if (type === 'O[SNW]') baseType = 'o-snw';
        if (type === 'O[SND]') baseType = 'o-snd';
        if (type === 'S[SNW]') baseType = 's-snw';
        if (type === 'S[SND]') baseType = 's-snd';

        html += `
            <div class="tile-item">
                <span class="tile-label">${labelText}</span>
                <button 
                    class="tile-selector-btn tile-${baseType}" 
                    data-tile="${type}"
                    onclick="window.app.mapEditor.setTileType('${type}')">
                    ${type}
                </button>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;

    const newSlider = document.getElementById('tileSlider');
    if (newSlider) {
        newSlider.scrollLeft = savedScrollLeft;

        // HORIZONTÁLNÍ SCROLL KOLEČKEM
        newSlider.addEventListener('wheel', (evt) => {
            evt.preventDefault();
            newSlider.scrollLeft += evt.deltaY;
        }, { passive: false });
    }

    if (typeof updateCurrentTileDisplay === 'function') {
        updateCurrentTileDisplay(); 
    }
}

/**
 * Updates the visual display of the currently selected tile type.
 */
function updateCurrentTileDisplay() {
    const display = document.getElementById('currentTileDisplay');
    if (display) {
        display.textContent = currentTileType;
        
        tileTypes.map(t => t.replace(/[0-9]/g, '').toLowerCase() || '-').forEach(baseType => display.classList.remove(`tile-${baseType}`));
        
        const baseType = currentTileType.replace(/[0-9]/g, '').toLowerCase() || '-';
        display.classList.add(`tile-${baseType}`);
    }
}

/**
 * Sets the tile type and updates the display.
 */
export function setTileType(type) {
    setCurrentTileType(type);
    updateCurrentTileDisplay();
}

// --- Map Resizing ---

export function resizeMap() {
    const widthInput = document.getElementById('mapWidth');
    const heightInput = document.getElementById('mapHeight');
    
    const newCols = parseInt(widthInput.value);
    const newRows = parseInt(heightInput.value);
    
    if (isNaN(newCols) || isNaN(newRows) || newCols < 3 || newRows < 3) {
        setStatus('Map dimensions must be valid numbers (min 3x3).', true);
        return;
    }

    modifyJson((data) => {
        const oldLayout = data.maps[0].layout;
        const oldRows = oldLayout.length;
        const oldCols = oldLayout.length > 0 ? oldLayout[0].length : 0;
        
        const newLayout = [];
        
        for (let r = 0; r < newRows; r++) {
            const newRow = [];
            for (let c = 0; c < newCols; c++) {
                // Preserve existing tile data, otherwise use empty tile '-'
                if (r < oldRows && c < oldCols) {
                    newRow.push(oldLayout[r][c]);
                } else {
                    newRow.push('-');
                }
            }
            newLayout.push(newRow);
        }
        
        data.maps[0].layout = newLayout;
    }, `Map successfully resized to ${newCols}x${newRows}.`);
    
    // Recalculate camera position after resize
    clampCamera();
}


// --- Validation and Controls ---

// Global function exposed to HTML button (Toggle Map Visibility)
export function toggleMapVisibility() {
    mapLayoutWrapper.classList.toggle('d-none');
    setStatus(mapLayoutWrapper.classList.contains('d-none') ? 'Visual Map Editor hidden.' : 'Visual Map Editor shown.');
    // Re-render to fix any canvas drawing issues after showing
    if (!mapLayoutWrapper.classList.contains('d-none')) {
        // Initial clamp and render on show
        clampCamera();
        renderMap();
    }
}

/**
 * Performs validation for marker pairs and path connectivity.
 * Matches game engine logic for O, O[SNW], O[SND], and S/E markers.
 */
export function checkMapValidity() {
    const data = currentLevelData;
    const layout = data.maps[0].layout;

    const starts = new Map(); // Store as { id: {r, c, type} }
    const ends = new Map();

    // 1. Collect all points using regex to support S1, S[SNW], E1, etc.
    for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[r].length; c++) {
            const tile = String(layout[r][c] ?? '');
            
            // Matches 'S' followed by anything, but excludes base SNW/SND tiles
            if (/^S/.test(tile) && tile !== 'SNW' && tile !== 'SND') {
                starts.set(tile.substring(1), { r, c, type: tile });
            }
            // Matches 'E' followed by anything (E1, E[SND], etc.)
            if (/^E/.test(tile)) {
                ends.set(tile.substring(1), { r, c, type: tile });
            }
        }
    }

    // 2. Initial check for missing markers
    if (starts.size === 0 || ends.size === 0) {
        const missingParts = [];
        if (starts.size === 0) missingParts.push("Start (S*)");
        if (ends.size === 0) missingParts.push("End (E*)");
        setStatus(`Map Check: Missing ${missingParts.join(' and ')}.`, true);
        return;
    }

    let errors = [];

    // 3. Check if every Start has a matching End and a valid path
    starts.forEach((startPos, id) => {
        if (!ends.has(id)) {
            errors.push(`Missing End (E${id}) for Start S${id}`);
        } else {
            const endPos = ends.get(id);
            // Check physical pathing using the BFS function
            if (!findPath(layout, startPos, endPos)) {
                errors.push(`No path possible from S${id} to E${id}`);
            }
        }
    });

    // 4. Check for "Dangling" ends (End with no matching Start)
    ends.forEach((pos, id) => {
        if (!starts.has(id)) {
            errors.push(`End E${id} has no matching Start S${id}`);
        }
    });

    // 5. Final Status Output
    if (errors.length === 0) {
        setStatus(`Map Valid! Total paths verified: ${starts.size}`, false);
    } else {
        setStatus(`Map Errors: ${errors.join(' | ')}`, true);
    }
}

/**
 * BFS Pathfinding matching the game engine's logic.
 * Treats O, O[SNW], O[SND], and any S# / E# markers as walkable.
 */
function findPath(layout, start, end) {
    const rows = layout.length;
    const cols = layout[0].length;
    
    const sr = start.r, sc = start.c;
    const er = end.r, ec = end.c;

    const isWalkable = (r, c) => {
        const tok = String(layout[r][c] ?? '');
        // Regex from game engine: matches paths and markers
        const walkablePattern = /^(O|O\[SNW\]|O\[SND\])$|^[SE]\d+$/;
        return walkablePattern.test(tok);
    };

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // up, down, left, right
    const q = [{ r: sr, c: sc }];
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false));

    seen[sr][sc] = true;

    while (q.length > 0) {
        const cur = q.shift();

        // Path found
        if (cur.r === er && cur.c === ec) return true;

        for (const [dc, dr] of dirs) {
            const nr = cur.r + dr;
            const nc = cur.c + dc;

            // Boundary and walkable checks
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr][nc]) {
                if (isWalkable(nr, nc)) {
                    seen[nr][nc] = true;
                    q.push({ r: nr, c: nc });
                }
            }
        }
    }

    return false; // No path found
}
/**
 * Updates the map_size field in the map's description based on the current layout
 * AND updates the display elements with IDs 'mapWidth' and 'mapHeight'.
 */
function updateMapSizeDescription() {
    const map = getCurrentMap(); 
    const layout = map.layout;
    
    // Check for a non-empty, non-malformed layout array
    if (layout.length > 0 && Array.isArray(layout[0]) && layout[0].length > 0) {
        // Width is number of columns (length of first row)
        const width = layout[0].length; 
        // Height is number of rows (length of the layout array)
        const height = layout.length;

        // --- FIX: Update the DOM display elements ---
        const widthElement = document.getElementById('mapWidth');
        const heightElement = document.getElementById('mapHeight');
        
        // Use .value for inputs/textareas, .textContent for everything else (span, div, etc.)
        const updateElement = (element, value) => {
            if (element) {
                const tagName = element.tagName;
                if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                    element.value = value;
                } else {
                    element.textContent = value;
                }
            }
        };

        updateElement(widthElement, width);
        updateElement(heightElement, height);
        // ---------------------------------------------
        
        const newMapSize = `${width}x${height}`;

        // Update JSON metadata only if the value has actually changed
        // This part remains critical to ensuring the JSON source of truth is correct.
        if (map.description[0]["map_size"] !== newMapSize) {
            // Use modifyJson to update the source of truth and refresh the UI
            modifyJson((data) => {
                // Update the description field
                data.maps[0].description[0]["map_size"] = newMapSize;
            }, `Map size metadata updated to ${newMapSize}.`);
        }
    }
}

// New public function that can be called externally (e.g., from main.js or json_functions.js)
export function updateMapInfo() {
    updateMapSizeDescription();
}

// Brush sizes

/**
 * Generates a brush matrix dynamically based on shape and size.
 */
function getDynamicBrushMatrix(shape, size) {
    // size 1 = 1x1, size 2 = 3x3, size 3 = 5x5, etc.
    const side = (size * 2) - 1;
    const center = size - 1;
    let matrix = [];

    for (let r = 0; r < side; r++) {
        matrix[r] = [];
        for (let c = 0; c < side; c++) {
            if (shape === 'square') {
                // Square is always filled
                matrix[r][c] = 1;
            } else if (shape === 'star') {
                // Star/Cross logic: Manhattan distance
                // Paints if the tile is within 'size' distance from center
                const dist = Math.abs(r - center) + Math.abs(c - center);
                matrix[r][c] = dist < size ? 1 : 0;
            }
        }
    }
    return { matrix, offset: center };
}

// Update this function to use the dynamic generator
function getBrushAffectedTiles(centerR, centerC) {
    const mapData = getCurrentMap();
    const rows = mapData.layout.length;
    const cols = mapData.layout[0].length;
    
    // Generate matrix based on current global brush state
    const { matrix, offset } = getDynamicBrushMatrix(brushShape, brushSize);

    let tiles = [];
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] === 1) {
                const targetR = centerR + (i - offset);
                const targetC = centerC + (j - offset);

                if (targetR >= 0 && targetR < rows && targetC >= 0 && targetC < cols) {
                    tiles.push({ r: targetR, c: targetC });
                }
            }
        }
    }
    return tiles;
}

// New Exported setters for the UI
export function setBrushShape(shape) {
    brushShape = shape; // Update the logic ( 'square' or 'star' )
    
    // --- Graphical Update ---
    const sqBtn = document.getElementById('btn-brush-square');
    const stBtn = document.getElementById('btn-brush-star');
    
    if (sqBtn && stBtn) {
        // Remove active class from both
        sqBtn.classList.remove('active');
        stBtn.classList.remove('active');

        // Add to the selected one
        if (shape === 'square') {
            sqBtn.classList.add('active');
        } else {
            stBtn.classList.add('active');
        }
    }
    
    // Force a re-render so the ghost/brush on the map updates immediately
    renderMap();
}

export function setBrushSize(size) {
    // Clamp between 1 and 20
    brushSize = Math.max(1, Math.min(20, parseInt(size) || 1));
    
    // Optional: Sync the input field value if it was changed by clamping
    const sizeInput = document.getElementById('brushSizeInput');
    if (sizeInput) sizeInput.value = brushSize;

    renderMap();
}

// Debugging helper: returns world and tile indices for given client coords
export function debugScreenToTile(screenX, screenY) {
    const layout = currentLevelData.maps[0].layout;
    if (!layout || layout.length === 0) return null;
    const world = screenToWorld(screenX, screenY);
    const tile = worldToTile(world.x, world.y);
    return { world, tile, rows: layout.length, cols: layout[0].length };
}