// ====================================================================
// --- Editor Structures & Initialization ---
// ====================================================================

// Default structures for adding new elements
const newWaveStructure = {
    "level": 99, // Placeholder, will be updated dynamically
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
    "type": "instant", // or 'targeted'
    "selectionCount": 0,
    "damage": 0, 
    "damage_every": 0, 
    "cooldown": 30000,
    "effectDuration": 0,
    "color": "rgba(100, 100, 200, 0.6)",
    "ui": {
        "icon": "✨"
    }
};

// Default map for initial load
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
            "layout": [
                ["-","-","-","-","-","-","-","-","-","-","-"],
                ["-","O","O","O","O","O","O","O","O","O","E1"],
                ["S1","-","-","-","-","-","-","-","-","-","-"],
                ["-","O","O","O","O","O","O","O","O","O","-"],
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

// Map editing state
let currentTileType = 'O'; // Default tile to place (Obstacle/Path)
const tileTypes = ['-', 'O', 'S1', 'E1']; // Available types: Empty, Path, Start 1, End 1

// --- Initialization ---

// Function to run when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize editor with formatted JSON
    editor.value = JSON.stringify(defaultLevelJson, null, 2);

    // 2. Set up event listener for the textarea input
    editor.addEventListener('input', updateMapFromEditor);

    // 3. Initial map render
    renderMap(defaultLevelJson.maps[0].layout);
});


// ====================================================================
// --- Utility Functions ---
// ====================================================================

/**
 * Displays a status message (success or error).
 */
function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.remove('d-none', 'status-success', 'status-error');
    statusMessage.classList.add(isError ? 'status-error' : 'status-success');
    
    setTimeout(() => { statusMessage.classList.add('d-none'); }, 3000);
}

/**
 * Parses the JSON from the textarea, executes a modification, and updates the editor.
 */
function modifyJson(modifyFn, successMessage) {
    let jsonText = editor.value;
    let parsedJson;

    try {
        parsedJson = JSON.parse(jsonText);
    } catch (e) {
        setStatus(`JSON Error: Invalid format. ${e.message}`, true);
        return false;
    }

    modifyFn(parsedJson);

    // Re-stringify and update the textarea
    const formattedJson = JSON.stringify(parsedJson, null, 2);
    editor.value = formattedJson;
    setStatus(successMessage);
    
    // Rerender the visual map after modification
    renderMap(parsedJson.maps[0].layout);
    
    return true;
}


// ====================================================================
// --- JSON Modification Functions (Buttons) ---
// ====================================================================

/**
 * Adds a new wave (level) object.
 */
function addWave() {
    modifyJson((json) => {
        const levels = json.maps[0].levels;
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
    modifyJson((json) => {
        const abilities = json.maps[0].abilities;
        const newAbility = JSON.parse(JSON.stringify(newAbilityStructure));
        abilities.push(newAbility);
    }, `Ability "${newAbilityStructure.name}" added!`);
}

/**
 * Validates the JSON, formats it, updates the textarea, and copies it to the clipboard.
 */
function copyFormattedJson() {
    let jsonText = editor.value;
    let parsedJson;

    try {
        parsedJson = JSON.parse(jsonText);
    } catch (e) {
        setStatus(`JSON Error: Invalid format. ${e.message}`, true);
        return;
    }

    const formattedJson = JSON.stringify(parsedJson, null, 2);
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

// ====================================================================
// --- Visual Map Editor Functions ---
// ====================================================================

/**
 * Renders the map grid based on the provided layout array.
 */
function renderMap(layout) {
    if (!layout || layout.length === 0) return;

    mapGrid.innerHTML = '';
    
    const rows = layout.length;
    const cols = layout[0].length;
    
    // Set up the grid template in CSS properties
    mapGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    layout.forEach((rowArr, rowIndex) => {
        rowArr.forEach((tileType, colIndex) => {
            const tile = document.createElement('div');
            tile.classList.add('map-tile', `tile-${tileType.toLowerCase().replace(/[0-9]/g, '')}`);
            tile.dataset.row = rowIndex;
            tile.dataset.col = colIndex;
            tile.textContent = tileType; // Show the tile code
            
            // Add click handler for visual editing
            tile.addEventListener('click', handleTileClick);
            
            mapGrid.appendChild(tile);
        });
    });
    
    // Create a visual key for available tiles
    createTileKey();
}

/**
 * Creates the key/legend for tile types and selection controls.
 */
function createTileKey() {
    const keyContainer = document.getElementById('mapCanvasContainer');
    let keyDiv = document.getElementById('tileKey');
    
    if (!keyDiv) {
        keyDiv = document.createElement('div');
        keyDiv.id = 'tileKey';
        keyDiv.classList.add('tile-key-container');
        keyContainer.appendChild(keyDiv);
    }
    
    keyDiv.innerHTML = '<p>Current Tile: <span id="currentTileDisplay" class="current-tile-display"></span></p><div class="tile-options">';
    
    tileTypes.forEach(type => {
        const btn = document.createElement('button');
        btn.classList.add('tile-selector-btn', `tile-${type.toLowerCase().replace(/[0-9]/g, '')}`);
        btn.textContent = type;
        btn.dataset.tile = type;
        btn.onclick = () => {
            currentTileType = type;
            updateCurrentTileDisplay();
        };
        keyDiv.querySelector('.tile-options').appendChild(btn);
    });
    
    updateCurrentTileDisplay();
}

/**
 * Updates the visual display of the currently selected tile type.
 */
function updateCurrentTileDisplay() {
    const display = document.getElementById('currentTileDisplay');
    if (display) {
        display.textContent = currentTileType;
        // Remove old classes and add new class for coloring
        tileTypes.forEach(type => display.classList.remove(`tile-${type.toLowerCase().replace(/[0-9]/g, '')}`));
        display.classList.add(`tile-${currentTileType.toLowerCase().replace(/[0-9]/g, '')}`);
    }
}

/**
 * Handles clicks on the visual map tiles.
 */
function handleTileClick(event) {
    const tile = event.target;
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);

    modifyJson((json) => {
        // Update the JSON layout array
        json.maps[0].layout[row][col] = currentTileType;
        
    }, `Tile [${row}, ${col}] set to ${currentTileType}`);
    
    // Note: renderMap is called inside modifyJson, which updates the tile's class/content.
}

/**
 * Attempts to parse the JSON in the editor and re-render the map if successful.
 * Triggered whenever the user manually types in the JSON area.
 */
function updateMapFromEditor() {
    let jsonText = editor.value;
    try {
        const parsedJson = JSON.parse(jsonText);
        if (parsedJson.maps && parsedJson.maps[0] && parsedJson.maps[0].layout) {
            renderMap(parsedJson.maps[0].layout);
        }
    } catch (e) {
        // Ignore parsing errors on every keystroke, let copyFormattedJson handle final validation
    }
}