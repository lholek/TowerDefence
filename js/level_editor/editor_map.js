import { currentLevelData, currentTileType, setCurrentTileType, tileTypes, getCurrentMap } from './level_data.js';
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

// --- New Drawing State Variables ---
let isDrawingLeft = false; // Tracks if left button (0) is held for drawing
let isDrawingRight = false; // Tracks if right button (2) is held for erasing
let hasDrawn = false; // Tracks if any tile was modified during a draw session

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
 * Applies the given tile type to the current mouse position in the map.
 * Updates the currentLevelData directly for performance during drawing.
 */
function applyTileToCurrentPosition(screenX, screenY, tileType) {
    const layout = currentLevelData.maps[0].layout;
    
    // Guard clause
    if (!layout || layout.length === 0 || layout[0].length === 0) return false; 

    const { row, col } = getTileFromScreen(screenX, screenY, layout.length, layout[0].length);
    
    // Check if within bounds
    if (row >= 0 && row < layout.length && col >= 0 && col < layout[0].length) {
        // Optimization: Only update and re-render if the tile actually changes
        if (layout[row][col] !== tileType) {
            // DIRECTLY MODIFY currentLevelData for drag-painting performance
            currentLevelData.maps[0].layout[row][col] = tileType;
            hasDrawn = true;
            renderMap(layout); // Re-render the map immediately for visual feedback
            return true;
        }
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

    // Guard against empty layout
    if (!layout || layout.length === 0 || layout[0].length === 0) return;

    const { row, col } = getTileFromScreen(e.clientX, e.clientY, layout.length, layout[0].length);

    if (row >= 0 && row < layout.length && col >= 0 && col < layout[0].length) {
        if (hoveredTile.r !== row || hoveredTile.c !== col) {
            hoveredTile = { r: row, c: col };
            renderMap(layout);
        }
    } else {
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
            switch (tileType.charAt(0)) {
                case 'O': color = '#8B4513'; break; // Path (Brown)
                case 'S': color = '#38761d'; break; // Start (Dark Green)
                case 'E': color = '#990000'; break; // End (Dark Red)
                case 'X': color = '#3F7D3C'; break; // Tower Site (Mid Green)
                case '-': default: color = 'transparent'; break; // Empty (Dark Grey/Brown)
            }

            ctx.fillStyle = color;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            // Draw border (adjusted for scale)
            ctx.strokeStyle = '#2e261d';
            ctx.lineWidth = 1 / camera.zoom; // Keep border size visually constant
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

            // Draw tile text
            ctx.fillStyle = 'white';
            ctx.fillText(tileType, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
            
            // Draw hover effect
            if (r === hoveredTile.r && c === hoveredTile.c) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
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
    let html = `
        <p>Current Tile: <span id="currentTileDisplay" class="current-tile-display"></span></p>
        <div class="tile-options">
    `;
    
    tileTypes.forEach(type => {
        const baseType = type.replace(/[0-9]/g, '').toLowerCase() || '-';
        html += `
            <button 
                class="tile-selector-btn tile-${baseType}" 
                data-tile="${type}"
                onclick="window.app.mapEditor.setTileType('${type}')">
                ${type}
            </button>
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

    // 1. Check basic structure 
    const layout = data.maps[0].layout;
    if (!layout || layout.length === 0 || layout[0].length === 0) {
        setStatus('Map layout is empty or invalid.', true);
        return;
    }

    // 2. Find all start and end points
    const startPoints = [];
    const endPoints = [];
    const rows = layout.length;
    const cols = layout[0].length;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = layout[r][c];
            if (tile.startsWith('S')) {
                startPoints.push({ type: tile, r, c });
            } else if (tile.startsWith('E')) {
                endPoints.push({ type: tile, r, c });
            }
        }
    }

    if (startPoints.length === 0 || endPoints.length === 0) {
        setStatus('Map Check: No Start (S) or End (E) points found.', true);
        return;
    }

    // 3. Check path feasibility for every unique path (e.g., S1 -> E1)
    const requiredPaths = new Set(startPoints.map(s => s.type.substring(1)));

    let allPathsValid = true;
    const invalidPaths = [];

    requiredPaths.forEach(pathNumber => {
        const start = startPoints.find(p => p.type === `S${pathNumber}`);
        const end = endPoints.find(p => p.type === `E${pathNumber}`);

        if (start && end) {
            if (!findPath(layout, start, end)) {
                allPathsValid = false;
                invalidPaths.push(`${start.type} -> ${end.type} (No Path)`);
            }
        } else if (start || end) {
             allPathsValid = false;
             invalidPaths.push(`Missing pair for ${start ? start.type : end.type}`);
        }
    });

    if (allPathsValid) {
        setStatus('Map Check Successful! All required paths are connected.', false);
    } else {
        setStatus(`Map Check Failed. Invalid/Missing paths: ${invalidPaths.join(', ')}`, true);
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