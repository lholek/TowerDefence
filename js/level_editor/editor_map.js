import { currentLevelData, currentTileType, setCurrentTileType, tileTypes, getCurrentMap, getNextAvailableMarker } from './level_data.js';
import { modifyJson } from './json_functions.js';

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
let hoverTimer;

// --- New Drawing State Variables ---
let isDrawingLeft = false; // Tracks if left button (0) is held for drawing
let isDrawingRight = false; // Tracks if right button (2) is held for erasing
let hasDrawn = false; // Tracks if any tile was modified during a draw session

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
    // Correctly apply reverse camera transform
    const worldX = (screenX - rect.left - camera.x) / camera.zoom;
    const worldY = (screenY - rect.top - camera.y) / camera.zoom;
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
    const rect = mapCanvasContainer.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    
    const layout = currentLevelData.maps[0].layout;

    // Guard against empty layout before accessing layout[0].length
    if (!layout || layout.length === 0 || layout[0].length === 0) {
        return; 
    }

    const rows = layout.length;
    const cols = layout[0].length;
    
    // Total rendered map dimensions after zoom
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
    camera.lastX = e.clientX;
    camera.lastY = e.clientY;
    mapCanvasContainer.classList.add('panning');
}

function drag(e) {
    if (!camera.dragging) return;
    e.preventDefault();
    const dx = e.clientX - camera.lastX;
    const dy = e.clientY - camera.lastY;
    camera.x += dx;
    camera.y += dy;
    camera.lastX = e.clientX;
    camera.lastY = e.clientY;
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
    camera.x = screenX - rect.left - beforeWorld.x * camera.zoom;
    camera.y = screenY - rect.top - beforeWorld.y * camera.zoom;
    
    clampCamera(); 
}

// --- Drawing Logic Helpers ---

/**
 * Applies the given tile type using the CURRENT BRUSH shape.
 */
function applyTileToCurrentPosition(screenX, screenY, tileType) {
    const layout = currentLevelData.maps[0].layout;
    if (!layout || layout.length === 0) return false;

    // If we are placing a Start or End, and we have already drawn something 
    // during this specific click-and-hold session, STOP.
    const isMarker = (tileType.startsWith('S') && tileType !== 'SNW' && tileType !== 'SND') || tileType.startsWith('E');
    if (isMarker && hasDrawn) {
        return false; 
    }

    const { row, col } = getTileFromScreen(screenX, screenY, layout.length, layout[0].length);
    const tilesToPaint = getBrushAffectedTiles(row, col);

    let changed = false;
    let needsSRefresh = false;
    let needsERefresh = false;

    tilesToPaint.forEach(tile => {
        if (tile.r >= 0 && tile.r < layout.length && tile.c >= 0 && tile.c < layout[0].length) {
            const oldTile = String(layout[tile.r][tile.c]);
            let tileToPlace = tileType;

            if (tileType.startsWith('S') && tileType !== 'SNW' && tileType !== 'SND')  {
                tileToPlace = getNextAvailableMarker('S');
            } else if (tileType.startsWith('E')) {
                tileToPlace = getNextAvailableMarker('E');
            }

            // Standard placement logic
            if (oldTile !== tileToPlace) {
                // Prevent overwriting a different S with an S, or E with an E
                // This stops the "machine gun" effect even for big brushes
                const overwritingSameCategory = 
                    (oldTile.startsWith('S') && tileToPlace.startsWith('S')) ||
                    (oldTile.startsWith('E') && tileToPlace.startsWith('E'));
                
                if (overwritingSameCategory) return;

                layout[tile.r][tile.c] = tileToPlace;
                changed = true;

                if (tileToPlace.startsWith('S') || oldTile.startsWith('S')) needsSRefresh = true;
                if (tileToPlace.startsWith('E') || oldTile.startsWith('E')) needsERefresh = true;
            }
        }
    });

    if (changed) {
        hasDrawn = true; // This prevents the next "move" event from placing another marker
        if (needsSRefresh) setCurrentTileType('REFRESH_S');
        if (needsERefresh) setCurrentTileType('REFRESH_E');

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
        applyTileToCurrentPosition(e.clientX, e.clientY, currentTileType);
    } 
    // Right click (button 2)
    else if (e.button === 2) {
        e.preventDefault(); // Prevents context menu
        isDrawingRight = true;
        isDrawingLeft = false; // Ensure only one mode is active
        hasDrawn = false;
        applyTileToCurrentPosition(e.clientX, e.clientY, '-'); // Default tile for erasing
    }
}

function handleMapDrawStop() {
    // 1. Sync changes to the JSON editor if drawing occurred
    if (hasDrawn && (isDrawingLeft || isDrawingRight)) {
        // Call modifyJson with an empty operation to sync the already-changed currentLevelData 
        // back to the JSON editor and trigger any required updates.
        modifyJson(() => {}, `Map updated by drag-drawing.`, true);
    }

    // 2. Clear drawing state
    isDrawingLeft = false;
    isDrawingRight = false;
    hasDrawn = false;
}

function handleMapDrawMove(e) {
    // If panning is active, do not draw
    if (camera.dragging) return; 
    
    // Apply tile if the left button is held down
    if (isDrawingLeft) {
        applyTileToCurrentPosition(e.clientX, e.clientY, currentTileType);
    } 
    // Apply default tile if the right button is held down
    else if (isDrawingRight) {
        applyTileToCurrentPosition(e.clientX, e.clientY, '-');
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
                coordDisplay.textContent = `W: ${col}, H: ${row}`;
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

    // 1. Resize Canvas to fit the full map dimensions (unscaled World size)
    canvas.width = 1200;
    canvas.height = 600;

    // 2. Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 3. Apply Camera Transform (translate and zoom)
    ctx.save();
    // Transform coordinates based on the canvas container viewport and zoom
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom); 
    
    // 4. Draw Tiles (Drawing is done in World Space: TILE_SIZE = 60)
    ctx.font = `${TILE_SIZE / 3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;
            const tileType = layout[r][c];

            // Set color based on tile type
            let color;
            if (typeof tileType === 'string') {
                switch (tileType.charAt(0)) {
                    case 'O': color = '#8B4513'; break; // Path (Brown)
                    case 'S': color = '#38761d'; break; // Start (Dark Green)
                    case 'E': color = '#990000'; break; // End (Dark Red)
                    case 'X': color = '#3F7D3C'; break; // Grass (Mid Green)
                    case 'W': color = '#2c4d96'; break; // Water (Dark Blue)
                    case 'M': color = '#616161'; break; // Mountain (Dark GraY)
                    case '-': default: color = 'transparent'; break; // Empty (Dark Grey/Brown)
                }
            }
            if (tileType === 'SNW') color = '#f0f0f0';
            if (tileType === 'SND') color = '#d2b48c';

            ctx.fillStyle = color;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Draw border (adjusted for scale)
            ctx.strokeStyle = '#2e261d';
            ctx.lineWidth = 1 / camera.zoom; // Keep border size visually constant
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

            // Draw tile text
            ctx.fillStyle = 'white';
            if (tileType === 'SNW' || tileType === 'SND') ctx.fillStyle = 'black';
            if (tileType.includes('[')) {
                // 1. Split the string (e.g., "O[SND]" becomes ["O", "SND]"])
                const parts = tileType.split('[');
                const baseText = parts[0];
                const variantText = '[' + parts[1];
                        
                // 2. Adjust font sizes
                const mainFontSize = TILE_SIZE / 3;
                const subFontSize = TILE_SIZE / 5; // Smaller for the second line
                        
                // 3. Draw Line 1 (The base type)
                ctx.font = `${mainFontSize}px Arial`;
                ctx.fillText(baseText, x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 8);
                        
                // 4. Draw Line 2 (The bracketed variant)
                ctx.font = `${subFontSize}px Arial`;
                ctx.fillText(variantText, x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 12);
                        
                // Reset font for next tile
                ctx.font = `${mainFontSize}px Arial`;
            } else {
                // Standard single-line rendering for simple tiles
                ctx.font = `${TILE_SIZE / 3}px Arial`;
                ctx.fillText(tileType, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
            }
          //  ctx.fillText(tileType, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        }
    }

    if (hoveredTile.r !== -1 && hoveredTile.c !== -1) {
        const ghostTiles = getBrushAffectedTiles(hoveredTile.r, hoveredTile.c);
        
        // Choose color: Red for Erasing (Right Click), White for Painting
        if (isDrawingRight) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Redish for erasing
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Whiteish for painting
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        }

        ctx.lineWidth = 2;

        ghostTiles.forEach(tile => {
            const gx = tile.c * TILE_SIZE;
            const gy = tile.r * TILE_SIZE;
            
            ctx.fillRect(gx, gy, TILE_SIZE, TILE_SIZE);
            ctx.strokeRect(gx, gy, TILE_SIZE, TILE_SIZE);
        });
    }    
    
    // 5. Restore Canvas State (undo transform)
    ctx.restore();

    // Re-render the key/palette every time
    createTileKey();

    // Call the update function to ensure the "map_size" metadata is correct
    updateMapInfo();
}

/**
 * Creates the key/legend for tile types and selection controls.
 */
function createTileKey() {
    const labels = {
        'X': 'Grass',
        'SNW': 'Snow',
        'SND': 'Sand',
        'O': 'Path',
        'O[SNW]': 'Path Snow',
        'O[SND]': 'Path Sand',
        'S': 'Start',
        'E': 'End',
        'W': 'Water',
        'M': 'Mountain',
        '-': 'Air'
    };

    // 1. SET YOUR ORDER HERE
    // Place the codes in the exact order you want them to appear (4 in first row, 3 in second)
    const customOrder = [
        'X', 'O', 'O[SNW]', 'O[SND]', 
        'SNW', 'SND', 
        'S', 'S[SNW]', 'S[SND]', 
        'E', 'W', 'M', '-'
    ];

    // 2. Sort the imported tileTypes based on your customOrder
    const sortedTiles = customOrder.filter(type => {
        // Zobrazíme jen ty, které jsou definované v labels nebo existují v logice
        return labels[type] !== undefined;
    });

    let html = `
        <p>
            <strong>Selected:</strong> <span id="currentTileDisplay" class="current-tile-display"></span> 
            | <span id="tileCoordinates" class="tileCoordinates">X: - | Y: -</span>
        </p>
        
        <div class="tile-grid-main" style="
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 15px; 
            background: #2e261d; 
            padding: 15px; 
            border-radius: 4px;
            margin-top: 10px;
        ">
    `;
    
    // 3. Use sortedTiles instead of tileTypes
    sortedTiles.forEach(type => {
        const char = type.charAt(0);
        const labelText = labels[type] || 'Unknown';
        let baseType = type.replace(/[0-9]/g, '').toLowerCase() || '-';
        if (type === 'O[SNW]') {
            baseType = 'o-snw';
        }   else if (type === 'O[SND]') {
            baseType = 'o-snd';
        }   else if (type === 'S[SNW]') {
            baseType = 's-snw';
        }   else if (type === 'S[SND]') {
            baseType = 's-snd';
        }   else if (type === 'E[SNW]') {
            baseType = 'e-snw';
        }   else if (type === 'E[SND]') {
            baseType= 'e-snd';
        }
        html += `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <span style="font-size: 0.8rem; font-weight: bold; color: #CCCCCC; text-transform: uppercase;">
                    ${labelText}
                </span>
                <button 
                    class="tile-selector-btn tile-${baseType}" 
                    style="width: 80%; min-width: 60px; padding: 6px;"
                    data-tile="${type}"
                    onclick="window.app.mapEditor.setTileType('${type}')">
                    ${type}
                </button>
            </div>
        `;
    });

    html += '</div>';

    if (tileKey) {
        tileKey.innerHTML = html;
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
 * Performs JSON validation and path connectivity check.
 */
export function checkMapValidity() {
    const data = currentLevelData;
    const layout = data.maps[0].layout;

    const starts = new Map(); // Store as { id: {r, c} }
    const ends = new Map();

    // 1. Collect all points
    for (let r = 0; r < layout.length; r++) {
        for (let c = 0; c < layout[r].length; c++) {
            const tile = layout[r][c];
            if (tile.startsWith('S')) starts.set(tile.substring(1), {r, c, type: tile});
            if (tile.startsWith('E')) ends.set(tile.substring(1), {r, c, type: tile});
        }
    }

    if (starts.size === 0 || ends.size === 0) {
        setStatus('Map Check: Needs at least one S and one E.', true);
        return;
    }

    let errors = [];

    // 2. Check if every Start has a matching End
    starts.forEach((pos, id) => {
        if (!ends.has(id)) {
            errors.push(`Missing End (E${id}) for Start S${id}`);
        } else {
            // 3. Check physical pathing
            if (!findPath(layout, pos, ends.get(id))) {
                errors.push(`No path possible from S${id} to E${id}`);
            }
        }
    });

    // 4. Check for "Dangling" ends (End with no Start)
    ends.forEach((pos, id) => {
        if (!starts.has(id)) {
            errors.push(`End E${id} has no matching Start S${id}`);
        }
    });

    if (errors.length === 0) {
        setStatus(`Map Valid! Total paths: ${starts.size}`, false);
    } else {
        setStatus(`Map Errors: ${errors.join(' | ')}`, true);
    }
}

/**
 * Basic Breadth-First Search (BFS) to check for a path between two points.
 */
function findPath(layout, start, end) {
    const rows = layout.length;
    const cols = layout[0].length;
    
    // The path is valid if we can move from S to E via 'O' tiles.
    const endTile = layout[end.r][end.c];
    // Pathable tiles include 'O', the end tile, and the start tile (to begin search)
    const pathableTiles = new Set(['O', endTile, layout[start.r][start.c]]); 

    const queue = [{ r: start.r, c: start.c }];
    const visited = new Set();
    visited.add(`${start.r},${start.c}`);

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // Right, Left, Down, Up

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.r === end.r && current.c === end.c) {
            return true; // Path found
        }

        for (const [dr, dc] of directions) {
            const newR = current.r + dr;
            const newC = current.c + dc;
            const newPosKey = `${newR},${newC}`;

            if (newR >= 0 && newR < rows && newC >= 0 && newC < cols) {
                const nextTile = layout[newR][newC];

                // Ensure the next tile is pathable (O or the End point itself) and not visited
                if (pathableTiles.has(nextTile) && !visited.has(newPosKey)) {
                    visited.add(newPosKey);
                    queue.push({ r: newR, c: newC });
                }
            }
        }
    }

    return false;
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