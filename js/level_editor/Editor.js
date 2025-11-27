// ====================================================================
// --- Editor Structures & Initialization ---
// ====================================================================

// Default structures for adding new elements
const newWaveStructure = {
    "level": 99, 
    "enemies": [
        {"type": "basic", "count": 10, "health": 200, "speed": 1.5, "path": "S1E1", "interval": 750, "coinReward": 2}
    ]
};

const newAbilityStructure = {
    "_comment": "New Ability structure",
    "id": "new_ability_id",
    "name": "New Ability",
    "description": "Short description of effect",
    "description_text": "Detailed usage description",
    "type": "instant", 
    "selectionCount": 0,
    "damage": 0, 
    "damage_every": 0, 
    "cooldown": 30000,
    "effectDuration": 0,
    "color": "rgba(100, 100, 200, 0.6)",
    "ui": { "icon": "✨" }
};

// Default map for initial load (Using the user's requested 11x3 layout)
const defaultLevelJson = {
    "maps": [
        {
            "name": "EDIT TITLE",
            "startingCoins": 100,
            "startingLives": 100,
            "description": [
                {
                    "descriptionText": "Edit description",
                    "level count": 1,
                    "difficulty": "⭐",
                    "map_size": "custom",
                    "tower types": 1,
                    "abilites": "-"
                }
            ],
            "tileSize": 60,
            // User's requested default layout
            "layout": [
                ["-","-","-","-","-","-","-","-","-","-","-"],
                ["S1","O","O","O","O","O","O","O","O","O","E1"],
                ["-","-","-","-","-","-","-","-","-","-","-"]
            ],
            "abilities": [
                {
                    "_comment": "cooldown - 30000",
                    "id": "lava_floor",
                    "name": "Lava Floor",
                    "description": "Demage - 250dmg / 0.25s",
                    "description_text": "3 tile before and after selected tile",
                    "type": "targeted", 
                    "selectionCount": 7, 
                    "__comment": "250dmg / 0.25s ",
                    "damage": 250, 
                    "damage_every": 250, 
                    "___comment": "cooldown - includes effectDuration !!!",
                    "cooldown": 10000,
                    "effectDuration": 5000,
                    "color": "rgba(245, 164, 66, 0.6)",
                    "ui": { "icon": "🌋" }
                }
            ],
            "towerTypes": {
                "001": {
                    "name": "Basic Tower",
                    "price": 1,
                    "damage": 50,
                    "fireRate": 400,
                    "range": 2500,
                    "color": "#468bb0",
                    "sellPrice": 1,
                    "speed": 2
                }
            },     
            "levels": [
                {
                    "level": 1,
                    "enemies": [
                        {"type": "basic", "count": 5, "health": 100, "speed": 1, "path": "S1E1", "interval": 1000, "coinReward": 1}
                    ]
                }
            ]
        }
    ]
};

// Global element references
const editor = document.getElementById('jsonEditor');
const statusMessage = document.getElementById('statusMessage');
const mapGrid = document.getElementById('mapGrid');
const mapCanvasContainer = document.getElementById('mapCanvasContainer');
const mapLayoutWrapper = document.getElementById('mapLayoutWrapper'); 

// Map editing state and available tiles
let currentTileType = 'O'; 
let tileTypes = ['-', 'O', 'S1', 'E1', 'S2', 'E2', 'S3', 'E3']; 

// Panning/Scrolling state
let isDragging = false;
let startX, scrollLeft;

// CRITICAL FIX: Global variable to store the clean JavaScript object (the source of truth)
let currentLevelData = JSON.parse(JSON.stringify(defaultLevelJson));


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize editor with formatted JSON
    editor.value = formatCompactLayout(currentLevelData);

    // 2. Set up event listeners for the textarea input
    editor.addEventListener('input', updateMapFromEditor);

    // 3. Initial map render (using the clean object)
    renderMap(currentLevelData.maps[0].layout);

    // 4. Set up Panning (Middle Mouse Button Drag)
    setupMapPanning();
});

// ====================================================================
// --- JSON Formatting & Modification ---
// ====================================================================

/**
 * Creates a custom JSON string with compact formatting for the 'layout' array.
 */
function formatCompactLayout(jsonObject) {
    let jsonString = JSON.stringify(jsonObject, (key, value) => {
        if (key === 'layout' && Array.isArray(value)) {
            let compactLayout = value.map(row => {
                // Creates: ["-","-",...]
                return '[' + row.map(tile => `"${tile}"`).join(',') + ']';
            }).join(',\n' + ' '.repeat(10)); 
            
            // Returns a string placeholder
            return `__COMPACT_LAYOUT__${compactLayout}__COMPACT_LAYOUT__`;
        }
        return value;
    }, 2); 

    // Replaces the placeholder with the custom formatted string
    jsonString = jsonString.replace(/"__COMPACT_LAYOUT__([^]*?)__COMPACT_LAYOUT__"/g, (match, compactContent) => {
        // Adds opening bracket, indentation, content, and closing bracket
        return `[\n` + ' '.repeat(10) + compactContent.trim() + '\n' + ' '.repeat(8) + ']';
    });

    return jsonString;
}

/**
 * Parses the JSON (if needed), executes a modification, and updates the editor.
 */
function modifyJson(modifyFn, successMessage) {
    // Works directly with the clean 'currentLevelData' object
    
    // 1. Run the modification function on the clean object
    modifyFn(currentLevelData);

    // 2. Re-stringify using the custom compact formatter and update the textarea
    const formattedJson = formatCompactLayout(currentLevelData);
    editor.value = formattedJson;
    setStatus(successMessage);
    
    // 3. Rerender the visual map after modification
    renderMap(currentLevelData.maps[0].layout);
    
    return true;
}

/**
 * Validates the JSON, formats it, updates the textarea, and copies it to the clipboard.
 */
function copyFormattedJson() {
    // Use the current clean data to ensure we copy the latest changes
    const formattedJson = formatCompactLayout(currentLevelData);
    editor.value = formattedJson;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(formattedJson).then(() => {
            setStatus('JSON formatted and copied to clipboard successfully!');
        }).catch(() => {
            editor.select();
            document.execCommand('copy');
            setStatus('Copy failed. JSON formatted and selected. Copy manually!', true);
        });
    } else {
         editor.select();
         document.execCommand('copy');
         setStatus('JSON formatted and selected. Copy manually!', true);
    }
}

/**
 * Attempts to parse the JSON in the editor and update the currentLevelData if successful.
 */
function updateMapFromEditor() {
    let jsonText = editor.value;
    try {
        const parsedJson = JSON.parse(jsonText);
        
        // CRITICAL FIX: Update the clean source of truth
        currentLevelData = parsedJson; 

        if (parsedJson.maps && parsedJson.maps[0] && parsedJson.maps[0].layout) {
            renderMap(parsedJson.maps[0].layout);
        }
    } catch (e) {
        // Ignore parsing errors while user is typing
    }
}


// ====================================================================
// --- Editor Action Functions ---
// ====================================================================

/**
 * Adds a new wave (level) object.
 */
function addWave() {
    modifyJson((data) => {
        const levels = data.maps[0].levels;
        const nextLevel = levels.length > 0 ? levels[levels.length - 1].level + 1 : 1;
        
        const newWave = JSON.parse(JSON.stringify(newWaveStructure)); 
        newWave.level = nextLevel;
        
        levels.push(newWave);
    }, `Wave added! (Now level ${nextLevel})`);
}

/**
 * Adds a new ability object.
 */
function addAbility() {
    modifyJson((data) => {
        const abilities = data.maps[0].abilities;
        const newAbility = JSON.parse(JSON.stringify(newAbilityStructure));
        abilities.push(newAbility);
    }, `Ability "${newAbilityStructure.name}" added!`);
}

// Global function exposed to HTML button (Toggle Map Visibility)
function toggleMapVisibility() {
    mapLayoutWrapper.classList.toggle('d-none');
    setStatus(mapLayoutWrapper.classList.contains('d-none') ? 'Visual Map Editor hidden.' : 'Visual Map Editor shown.');
}

// Global function exposed to HTML button (Map Validation)
function checkMapValidity() {
    // NOTE: Uses currentLevelData directly
    const data = currentLevelData;

    // 1. Check basic structure
    const layout = data.maps[0].layout;
    if (!layout) {
        setStatus('Map layout not found in JSON.', true);
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
        setStatus('Map Check Successful! All paths are connected.', false);
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
    
    const endTile = layout[end.r][end.c];
    const pathableTiles = ['O', endTile]; 

    const queue = [{ r: start.r, c: start.c }];
    const visited = new Set();
    visited.add(`${start.r},${start.c}`);

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; 

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.r === end.r && current.c === end.c) {
            return true; 
        }

        for (const [dr, dc] of directions) {
            const newR = current.r + dr;
            const newC = current.c + dc;
            const newPosKey = `${newR},${newC}`;

            if (newR >= 0 && newR < rows && newC >= 0 && newC < cols) {
                const nextTile = layout[newR][newC];

                if (pathableTiles.includes(nextTile) && !visited.has(newPosKey)) {
                    visited.add(newPosKey);
                    queue.push({ r: newR, c: newC });
                }
            }
        }
    }

    return false;
}

// ====================================================================
// --- Visual Map Editor Functions ---
// ====================================================================

/**
 * Renders the map grid based on the provided layout array.
 */
function renderMap(layout) {
    if (!layout || layout.length === 0) return;

    mapGrid.innerHTML = '';
    
    if (!layout || !Array.isArray(layout) || layout.length === 0) {
        setStatus("Error: Map layout data is missing or empty.", true);
        // Optionally clear the canvas if an error occurs
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); 
        return; 
    }
    const rows = layout.length;

    // Check 2: Does the first row exist and is it not empty? 
    // This prevents the "Cannot read properties of undefined (reading 'length')" error
    if (!layout[0] || !Array.isArray(layout[0]) || layout[0].length === 0) {
        setStatus("Error: Map layout's first row is missing or empty.", true);
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); 
        return; 
    }
    const cols = layout[0].length;
    
    mapGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    layout.forEach((rowArr, rowIndex) => {
        rowArr.forEach((tileType, colIndex) => {
            const tile = document.createElement('div');
            const baseType = tileType.replace(/[0-9]/g, '').toLowerCase() || '-';
            
            tile.classList.add('map-tile', `tile-${baseType}`);
            tile.dataset.row = rowIndex;
            tile.dataset.col = colIndex;
            tile.textContent = tileType; 
            
            tile.addEventListener('click', handleTileClick);
            
            mapGrid.appendChild(tile);
        });
    });
    
    createTileKey();
}

/**
 * Creates the key/legend for tile types and selection controls.
 */
function createTileKey() {
    let keyDiv = document.getElementById('tileKey');
    
    if (!keyDiv) {
        keyDiv = document.createElement('div');
        keyDiv.id = 'tileKey';
        keyDiv.classList.add('tile-key-container');
        mapLayoutWrapper.appendChild(keyDiv);
    }
    
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
                onclick="setTileType('${type}')">
                ${type}
            </button>
        `;
    });
    html += '</div>';

    keyDiv.innerHTML = html;
    updateCurrentTileDisplay();
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

// Global function exposed to HTML buttons
function setTileType(type) {
    currentTileType = type;
    updateCurrentTileDisplay();
}


function handleTileClick(event) {
    const tile = event.target;
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);

    modifyJson((data) => {
        data.maps[0].layout[row][col] = currentTileType;
    }, `Tile [${row}, ${col}] set to ${currentTileType}`);
}


// ====================================================================
// --- Map Panning ---
// ====================================================================

function setupMapPanning() {
    mapCanvasContainer.addEventListener('mousedown', (e) => {
        if (e.button === 1) { // Middle Mouse Button
            isDragging = true;
            mapCanvasContainer.classList.add('panning');
            startX = e.pageX - mapCanvasContainer.offsetLeft;
            scrollLeft = mapCanvasContainer.scrollLeft;
            e.preventDefault(); 
        }
    });

    mapCanvasContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        mapCanvasContainer.classList.remove('panning');
    });

    mapCanvasContainer.addEventListener('mouseup', () => {
        isDragging = false;
        mapCanvasContainer.classList.remove('panning');
    });

    mapCanvasContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - mapCanvasContainer.offsetLeft;
        const walk = (x - startX) * 1.5; 
        mapCanvasContainer.scrollLeft = scrollLeft - walk;
    });
}


/**
 * Utility function to display status messages.
 */
function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.remove('d-none', 'status-success', 'status-error');
    statusMessage.classList.add(isError ? 'status-error' : 'status-success');
    
    setTimeout(() => { statusMessage.classList.add('d-none'); }, 3000);
}