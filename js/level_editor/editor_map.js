import { currentLevelData, currentTileType, setCurrentTileType, tileTypes, terrainTypes, objectTypes, getCurrentMap, getNextAvailableMarker } from './level_data.js';
import { modifyJson } from './json_functions.js';
import GameMap from '../game/Map.js';

// Get references to elements (will be imported by main.js)
let canvas, ctx, mapCanvasContainer, mapLayoutWrapper, tileKey;
let setStatus;

// Canvas rendering constants
const TILE_SIZE = 60; // Base size for drawing tiles (this.tileSize equivalent)
const SPECIAL_TILE_VISUAL_OFFSET = 6; // match Map.js offset for portal/tree visuals

// Camera State 
const camera = {
    x: 0, y: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0,
    minZoom: 0.1, maxZoom: 1
};

// Global variable to store the position of the currently hovered tile
let hoveredTile = { r: -1, c: -1 };

// Active tile filter state — both on by default
const activeTileFilters = { terrains: true, objects: true };

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

// --- New Drawing State Variables ---
let isDrawingLeft = false; // Tracks if left button (0) is held for drawing
let isDrawingRight = false; // Tracks if right button (2) is held for erasing
let hasDrawn = false; // Tracks if any tile was modified during a draw session
let activeDrawTileType = null; // Locks the tile type for the current drag session

// --- Dynamic Brush State ---
let brushShape = 'square'; // 'square', 'diamond', or 'circle'
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
    const isMarker = (resolvedTileType.startsWith('S') && resolvedTileType !== 'SNW' && resolvedTileType !== 'SND' && !resolvedTileType.startsWith('SND[')) || resolvedTileType.startsWith('E');
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
                const isMarkerS = (t) => t.startsWith('S') && t !== 'SNW' && t !== 'SND' && !t.startsWith('SND[');
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
            if (activeDrawTileType.startsWith('S') && activeDrawTileType !== 'SNW' && activeDrawTileType !== 'SND' && !activeDrawTileType.startsWith('SND[')) {
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
        // Reset the GameMap instance so that ALL prerender layers (road, grass,
        // water, mountains, trees, portals, holy/burned ground, shores) are
        // rebuilt exactly once — generating stable random variants for the
        // final tile configuration rather than re-rolling on every mouse move.
        resetEditorMap();
        // Call modifyJson with an empty operation to sync the already-changed currentLevelData
        // back to the JSON editor and trigger any required updates.
        modifyJson(() => {}, `Map updated by drag-drawing.`, true);
        // Force a fresh render so the rebuilt instance is displayed immediately.
        renderMap();
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
    
    let tileApplied = false;
    
    // Apply tile if the left button is held down
    if (isDrawingLeft) {
        tileApplied = applyTileToCurrentPosition(e.clientX, e.clientY, activeDrawTileType ?? currentTileType);
    } 
    // Apply default tile if the right button is held down
    else if (isDrawingRight) {
        tileApplied = applyTileToCurrentPosition(e.clientX, e.clientY, activeDrawTileType ?? '-');
    }
    
    // If drawing but no tile was applied (same tile), still render for ghost preview
    // This shows the brush outline without regenerating the entire map
    if ((isDrawingLeft || isDrawingRight) && !tileApplied && hoveredTile.r >= 0) {
        const layout = currentLevelData.maps[0].layout;
        renderMap(layout);
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

    if (row >= 0 && row < layout.length && col >= 0 && col < layout[0].length) {

        if (hoveredTile.r !== row || hoveredTile.c !== col) {
            hoveredTile = { r: row, c: col };
            renderMap(layout); // calls createTileKey → replaces DOM, so re-query after

            // Re-query AFTER renderMap so we get the fresh element
            const coordDisplay = document.getElementById('tileCoordinates');
            if (coordDisplay) coordDisplay.textContent = `X: ${col}, Y: ${row}`;
        }

    } else {
        if (hoveredTile.r !== -1) {
            hoveredTile = { r: -1, c: -1 };
            renderMap(layout);

            const coordDisplay = document.getElementById('tileCoordinates');
            if (coordDisplay) coordDisplay.textContent = 'X: - | Y: -';
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
        editorMapInstance = new GameMap(canvas, layout, TILE_SIZE, { editor: true });

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
        // NOTE: We do NOT re-call _prerenderRoad / _prerenderGrass / _prerenderWater here
        // during live drawing, because those methods randomly pick shore variants, grass
        // variants, tree/portal/mountain/holy-ground/burned-ground positions on every call,
        // causing them to "flicker" with a new random variant on every mouse-move.
        // The prerendered layers are rebuilt only when resetEditorMap() is called
        // (i.e. after the user finishes a draw stroke), which triggers a full instance
        // rebuild on the next renderMap() call — regenerating everything exactly once.
        editorMapInstance.grid = editorMapInstance.normalizeLayout(layout);
    }

    // Editor-specific: reduce random variant sets to a single deterministic
    // element so the editor shows only one version per block (no flicker).
    try {
        if (editorMapInstance.mountainSet && Array.isArray(editorMapInstance.mountainSet) && editorMapInstance.mountainSet.length > 1) {
            editorMapInstance.mountainSet = [editorMapInstance.mountainSet[0]];
        }
        if (editorMapInstance.grassVariants && Array.isArray(editorMapInstance.grassVariants) && editorMapInstance.grassVariants.length > 1) {
            editorMapInstance.grassVariants = [editorMapInstance.grassVariants[0]];
        }
        // Ensure cachedTree is a single image (preRendered functions already return one)
        // but guard in case a set exists on high-quality builds
        if (editorMapInstance.treeSet && Array.isArray(editorMapInstance.treeSet) && editorMapInstance.treeSet.length > 1) {
            editorMapInstance.treeSet = [editorMapInstance.treeSet[0]];
        }
    } catch (err) {
        // swallow — editor should continue even if pruning fails
    }

    // Editor: generate static preview assets for LOW and HIGH and store them
    try {
        const ts = TILE_SIZE;

        // Helpers to capture a drawing into a small canvas
        const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

        // 1) Trees
        try {
            if (typeof editorMapInstance._preRenderTreeLow === 'function') {
                editorMapInstance.tree_low = editorMapInstance._preRenderTreeLow(ts);
            }
        } catch (e) {}
        try {
            if (typeof editorMapInstance._preRenderTreeHigh === 'function') {
                editorMapInstance.tree_high = editorMapInstance._preRenderTreeHigh(ts);
            }
        } catch (e) {}

        // 2) Portals (render into larger canvas because portals have large effects)
        try {
            const pW = ts * 3;
            const pH = ts * 3;
            if (typeof editorMapInstance._drawMagicPortalLow === 'function') {
                const pc = makeCanvas(pW, pH);
                const pctx = pc.getContext('2d');
                editorMapInstance._drawMagicPortalLow(pctx, pW/2, pH/2, 0);
                editorMapInstance.portal_low = pc;
            }
        } catch (e) {}
        try {
            const pW = ts * 3;
            const pH = ts * 3;
            if (typeof editorMapInstance._drawMagicPortalHigh === 'function') {
                const pc = makeCanvas(pW, pH);
                const pctx = pc.getContext('2d');
                editorMapInstance._drawMagicPortalHigh(pctx, pW/2, pH/2, 0);
                editorMapInstance.portal_high = pc;
            }
        } catch (e) {}

        // 3) Mountains (use existing preRender helpers returning canvases)
        try { editorMapInstance.mountain_low = editorMapInstance._preRenderMountainLow(ts); } catch (e) {}
        try { editorMapInstance.mountain_high = editorMapInstance._preRenderMountainHigh(ts); } catch (e) {}

        // 4) Grass variants: generate both variants temporarily and capture first
        const savedGrass = editorMapInstance.grassVariants ? editorMapInstance.grassVariants.slice() : null;
        try {
            if (typeof editorMapInstance._generateGrassTiles === 'function') {
                editorMapInstance._generateGrassTiles();
                if (editorMapInstance.grassVariants && editorMapInstance.grassVariants[0]) {
                    const g = makeCanvas(ts, ts);
                    g.getContext('2d').drawImage(editorMapInstance.grassVariants[0], 0, 0);
                    editorMapInstance.grass_high = g;
                }
            }
        } catch (e) {}
        try {
            if (typeof editorMapInstance._generateGrassTilesLow === 'function') {
                editorMapInstance._generateGrassTilesLow();
                if (editorMapInstance.grassVariants && editorMapInstance.grassVariants[0]) {
                    const g = makeCanvas(ts, ts);
                    g.getContext('2d').drawImage(editorMapInstance.grassVariants[0], 0, 0);
                    editorMapInstance.grass_low = g;
                }
            }
        } catch (e) {}
        // restore grassVariants if present
        if (savedGrass) editorMapInstance.grassVariants = savedGrass;

        // 5) Water: use waterLayer if available — capture a single tile
        try {
            const savedWater = editorMapInstance.waterLayer;
            if (typeof editorMapInstance._prerenderWaterHigh === 'function') {
                editorMapInstance._prerenderWaterHigh();
                const w = makeCanvas(ts, ts);
                w.getContext('2d').drawImage(editorMapInstance.waterLayer, 0, 0, ts, ts, 0, 0, ts, ts);
                editorMapInstance.water_high = w;
            }
            if (typeof editorMapInstance._prerenderWater === 'function') {
                editorMapInstance._prerenderWater();
                const w = makeCanvas(ts, ts);
                w.getContext('2d').drawImage(editorMapInstance.waterLayer, 0, 0, ts, ts, 0, 0, ts, ts);
                editorMapInstance.water_low = w;
            }
            if (savedWater) editorMapInstance.waterLayer = savedWater;
        } catch (e) {}

        // 6) Ensure editor uses single deterministic variants and override portal draw
        try {
            // Force terrainIndices to zeros so variant index 0 is used everywhere
            if (Array.isArray(editorMapInstance.terrainIndices)) {
                for (let rr = 0; rr < editorMapInstance.rows; rr++) {
                    for (let cc = 0; cc < editorMapInstance.cols; cc++) {
                        editorMapInstance.terrainIndices[rr][cc] = 0;
                    }
                }
            }

            // Lock grassVariants to first captured low/high if present, otherwise first existing
            try {
                const gv = editorMapInstance.grass_low || editorMapInstance.grass_high || (editorMapInstance.grassVariants && editorMapInstance.grassVariants[0]);
                if (gv) editorMapInstance.grassVariants = [gv];
            } catch (e) {}

            // Lock mountainSet if present or create one deterministic mountain variant if missing
            if (editorMapInstance.editorMode) {
                if (!editorMapInstance.mountainSet && typeof editorMapInstance._preRenderMountainParts === 'function') {
                    editorMapInstance.mountainSet = [editorMapInstance._preRenderMountainParts(ts, 1.0)];
                } else if (editorMapInstance.mountainSet && Array.isArray(editorMapInstance.mountainSet) && editorMapInstance.mountainSet.length > 1) {
                    editorMapInstance.mountainSet = [editorMapInstance.mountainSet[0]];
                }
            }

            // Use cached tree image from high/low capture
            if (editorMapInstance.editorTreeHigh) editorMapInstance.cachedTree = editorMapInstance.editorTreeHigh;
            else if (editorMapInstance.editorTreeLow) editorMapInstance.cachedTree = editorMapInstance.editorTreeLow;

            // Replace portal draw functions to render our static canvases (centered)
            if (editorMapInstance.portal_low || editorMapInstance.portal_high) {
                editorMapInstance._drawMagicPortalLow = function(ctx, x, y /*, time */) {
                    const img = this.portal_low || this.portal_high;
                    if (!img) return;
                    const dx = Math.round(x - img.width / 2);
                    const dy = Math.round(y - img.height / 2);
                    try { ctx.drawImage(img, dx, dy); } catch (e) {}
                };

                editorMapInstance._drawMagicPortalHigh = function(ctx, x, y /*, time */) {
                    const img = this.portal_high || this.portal_low;
                    if (!img) return;
                    const dx = Math.round(x - img.width / 2);
                    const dy = Math.round(y - img.height / 2);
                    try { ctx.drawImage(img, dx, dy); } catch (e) {}
                };

                editorMapInstance._drawMagicPortal = function(ctx, x, y /*, time */) {
                    // Choose based on settings
                    const prefer = (this.graphicsSettings && this.graphicsSettings.portals === 'high') ? 'high' : 'low';
                    const img = (prefer === 'high' ? this.portal_high : this.portal_low) || this.portal_low || this.portal_high;
                    if (!img) return;
                    const dx = Math.round(x - img.width / 2);
                    const dy = Math.round(y - img.height / 2);
                    try { ctx.drawImage(img, dx, dy); } catch (e) {}
                };
            }
        } catch (e) {}

    } catch (err) {
        // continue even if asset capture fails
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
    // Ensure Map does NOT draw trees/portals itself in editor mode (double-draw)
    try {
        if (editorMapInstance.editorMode) {
            // Keep static assets (tree_high/tree_low, portal_high/low) stored, but
            // prevent Map from drawing them itself by clearing cachedTree and
            // replacing portal draw functions with no-ops.
            editorMapInstance.cachedTree = null;
            editorMapInstance._drawMagicPortalLow = () => {};
            editorMapInstance._drawMagicPortalHigh = () => {};
            editorMapInstance._drawMagicPortal = () => {};
        }
    } catch (e) {}

    editorMapInstance.render(ctx);

    // Editor overlay: draw green labels above Portals (S#) and Trees (E#)
    try {
        ctx.save();
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.zoom, camera.zoom);

        const labelColor = '#f0c674'; // žlutý text požadovaný uživatelem
        const strokeColor = 'rgba(0,0,0,0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = labelColor;
        ctx.lineWidth = Math.max(1, 2 / Math.max(0.5, camera.zoom));
        // Larger font, centered in tile
        ctx.font = `bold ${Math.round(TILE_SIZE * 0.34)}px Arial`;

        // Glow shadow for text
        ctx.shadowColor = 'rgba(240,198,116,0.3)';
        ctx.shadowBlur = 15;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tok = String(layout[r][c] ?? '');
                if (/^S\d+/.test(tok) || /^E\d+/.test(tok)) {
                    const boundsX = c * TILE_SIZE;
                    const boundsY = r * TILE_SIZE;
                    const centerX = Math.round(boundsX + TILE_SIZE / 2);
                    const centerY = Math.round(boundsY + TILE_SIZE / 2);

                    // Draw static image for portal/tree depending on quality fallback order
                    if (/^S\d+/.test(tok)) {
                        const prefer = (editorMapInstance.graphicsSettings && editorMapInstance.graphicsSettings.portals === 'high') ? 'high' : 'low';
                        const img = (prefer === 'high' ? editorMapInstance.editorPortalHigh : editorMapInstance.editorPortalLow) || editorMapInstance.editorPortalLow || editorMapInstance.editorPortalHigh || editorMapInstance.portal_high || editorMapInstance.portal_low;
                        if (img) {
                            const dx = Math.round(centerX - img.width / 2);
                            const dy = Math.round(centerY - img.height / 2 - SPECIAL_TILE_VISUAL_OFFSET);
                            ctx.drawImage(img, dx, dy);
                        }
                    }

                    if (/^E\d+/.test(tok)) {
                        const prefer = (editorMapInstance.graphicsSettings && editorMapInstance.graphicsSettings.trees === 'high') ? 'high' : 'low';
                        const img = (prefer === 'high' ? editorMapInstance.editorTreeHigh : editorMapInstance.editorTreeLow) || editorMapInstance.editorTreeLow || editorMapInstance.editorTreeHigh || editorMapInstance.tree_high || editorMapInstance.tree_low || editorMapInstance.cachedTree;
                        if (img) {
                            const scale = 1.0;
                            const w = img.width * scale;
                            const h = img.height * scale;
                            const dx = Math.round(centerX - w / 2);
                            const dy = Math.round(boundsY + TILE_SIZE - h - SPECIAL_TILE_VISUAL_OFFSET);
                            ctx.drawImage(img, dx, dy, w, h);
                        }
                    }

                    // Draw glowing yellow text centered in tile
                    const x = centerX;
                    const y = centerY;
                    ctx.strokeStyle = strokeColor;
                    ctx.strokeText(tok, x, y);
                    ctx.fillText(tok, x, y);
                }
            }
        }

        ctx.restore();
    } catch (err) {
        // ignore overlay errors to avoid breaking render
    }

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

    // Preserve scroll position across re-renders
    const activeSlider = container.querySelector('.tile-grid-main');
    const savedScrollLeft = activeSlider ? activeSlider.scrollLeft : 0;

    const labels = {
        'X': 'Grass', 'SNW': 'Snow', 'SND': 'Sand', 'ICE': 'Ice', 'LAVA': 'Lava',
        'O': 'Path', 'O[SNW]': 'Path Snow', 'O[SND]': 'Path Sand', 'S': 'Start',
        'E': 'End', 'W': 'Water', 'M': 'Mountains', '-': 'Air',
        'SND[BONE-1]': 'Bone 1', 'SND[BONE-2]': 'Bone 2',
        'SND[BONE-3]': 'Bone 3', 'SND[BONE-4]': 'Bone 4'
    };

    const terrainOrder = ['S', 'E', 'X', 'SNW', 'SND', 'ICE', 'LAVA', 'O', 'O[SNW]', 'O[SND]', 'W', 'M', '-'];
    const objectOrder  = ['SND[BONE-1]', 'SND[BONE-2]', 'SND[BONE-3]', 'SND[BONE-4]'];

    const visibleTerrains = activeTileFilters.terrains ? terrainOrder.filter(t => labels[t]) : [];
    const visibleObjects  = activeTileFilters.objects  ? objectOrder.filter(t => labels[t])  : [];

    // Helper: tile type → CSS base class
    const toBaseType = (type) => {
        if (type === 'O[SNW]') return 'o-snw';
        if (type === 'O[SND]') return 'o-snd';
        if (/^SND\[BONE-/.test(type)) return 'snd-bone';
        return type.replace(/[\[\]]/g, '-').replace(/[0-9]/g, '').toLowerCase()
                   .replace(/--+/g, '-').replace(/-$/, '') || '-';
    };

    // Helper: generate one tile button
    const tileBtn = (type) => {
        const label = labels[type] || type;
        const base  = toBaseType(type);
        return `<div class="tile-item">
            <button class="tile-selector-btn tile-${base}" data-tile="${type}"
                    onclick="window.app.mapEditor.setTileType('${type}')">${label}</button>
        </div>`;
    };

    // Filter button active class helper
    const fa = (key) => activeTileFilters[key] ? ' tile-filter-active' : '';

    let html = `
        <div class="tile-editor-header">
            <strong>Selected:</strong>
            <span id="currentTileDisplay" class="current-tile-display"></span>
            <span id="tileCoordinates" class="tileCoordinates">X: - | Y: -</span>
                    <div class="tile-key-filters">
        Filters:
            <button class="tile-filter-btn${fa('terrains')}"
                    onclick="window.app.mapEditor.toggleTileFilter('terrains')">Terrains</button>
            <button class="tile-filter-btn${fa('objects')}"
                    onclick="window.app.mapEditor.toggleTileFilter('objects')">Map objects</button>
        </div>
        </div>
        <div class="tile-slider-wrapper">
            <div class="tile-grid-main" id="tileSlider">
    `;

    visibleTerrains.forEach(t => { html += tileBtn(t); });

    if (visibleTerrains.length > 0 && visibleObjects.length > 0) {
        html += `<div class="tile-separator"></div>`;
    }

    visibleObjects.forEach(t => { html += tileBtn(t); });

    html += `</div></div>`;
    container.innerHTML = html;

    const countEl = document.getElementById('tileObjectCount');
    if (countEl) countEl.textContent = visibleTerrains.length + visibleObjects.length;

    const newSlider = document.getElementById('tileSlider');
    if (newSlider) {
        newSlider.scrollLeft = savedScrollLeft;
        newSlider.addEventListener('wheel', (evt) => {
            evt.preventDefault();
            newSlider.scrollLeft += evt.deltaY;
        }, { passive: false });
    }

    updateCurrentTileDisplay();
}

/**
 * Toggles a tile filter category and re-renders the tile key.
 * At least one filter must stay active.
 */
export function toggleTileFilter(filter) {
    const other = filter === 'terrains' ? 'objects' : 'terrains';
    // Prevent turning off both filters simultaneously
    if (activeTileFilters[filter] && !activeTileFilters[other]) return;
    activeTileFilters[filter] = !activeTileFilters[filter];
    createTileKey();
}

/**
 * Updates the visual display of the currently selected tile type.
 */
function getTileTypeLabel(type) {
    const labels = {
        'X': 'Grass',
        'SNW': 'Snow',
        'SND': 'Sand',
        'ICE': 'Ice',
        'LAVA': 'Lava',
        'O': 'Path',
        'O[SNW]': 'Path Snow',
        'O[SND]': 'Path Sand',
        'S': 'Start',
        'E': 'End',
        'W': 'Water',
        'M': 'Mountains',
        '-': 'Air',
        'SND[BONE-1]': 'Bone 1',
        'SND[BONE-2]': 'Bone 2',
        'SND[BONE-3]': 'Bone 3',
        'SND[BONE-4]': 'Bone 4'
    };

    if (labels[type]) {
        return labels[type];
    }

    if (/^S\d+$/.test(type)) {
        return `Start ${type.substring(1)}`;
    }

    if (/^E\d+$/.test(type)) {
        return `End ${type.substring(1)}`;
    }

    if (/^S\d+/.test(type)) {
        return 'Start';
    }

    if (/^E/.test(type)) {
        return 'End';
    }

    const normalized = type.replace(/[0-9]/g, '');
    return labels[normalized] || type;
}

function updateCurrentTileDisplay() {
    const display = document.getElementById('currentTileDisplay');
    if (!display) return;

    display.textContent = getTileTypeLabel(currentTileType);

    // Remove all existing tile-* classes (safer than trying to enumerate them)
    [...display.classList].filter(c => c.startsWith('tile-')).forEach(c => display.classList.remove(c));

    // Derive CSS-safe baseType using the same logic as createTileKey
    let baseType = currentTileType
        .replace(/[\[\]]/g, '-')
        .replace(/[0-9]/g, '')
        .toLowerCase()
        .replace(/--+/g, '-')
        .replace(/-$/, '') || '-';

    if (currentTileType === 'O[SNW]')   baseType = 'o-snw';
    if (currentTileType === 'O[SND]')   baseType = 'o-snd';
    if (/^SND\[BONE-/.test(currentTileType)) baseType = 'snd-bone';

    display.classList.add(`tile-${baseType}`);
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
            
            // Matches 'S' followed by digits only (S1, S2...), excludes SNW/SND/SND[BONE-...]
            if (/^S\d+/.test(tile)) {
                starts.set(tile.substring(1), { r, c, type: tile });
            }
            // Matches 'E' followed by digits only (E1, E2...)
            if (/^E\d+/.test(tile)) {
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
            const dr = Math.abs(r - center);
            const dc = Math.abs(c - center);

            if (shape === 'square') {
                matrix[r][c] = 1;
            } else if (shape === 'diamond') {
                const dist = dr + dc;
                matrix[r][c] = dist < size ? 1 : 0;
            } else if (shape === 'circle') {
                if (size < 3) {
                    matrix[r][c] = (r === center && c === center) ? 1 : 0;
                } else {
                    const dist = Math.sqrt(dr * dr + dc * dc);
                    matrix[r][c] = dist < size ? 1 : 0;
                }
            } else {
                matrix[r][c] = 0;
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
    brushShape = shape; // Update the logic (square, diamond, circle)
    
    const brushButtons = [
        'btn-brush-square',
        'btn-brush-diamond',
        'btn-brush-circle'
    ].map(id => document.getElementById(id)).filter(Boolean);

    brushButtons.forEach(btn => btn.classList.remove('active'));

    const activeButton = document.getElementById(`btn-brush-${shape}`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Force a re-render so the ghost/brush on the map updates immediately
    renderMap();
}

export function setBrushSize(size) {
    brushSize = Math.max(1, Math.min(20, parseInt(size) || 1));
    
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