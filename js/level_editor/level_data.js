/**
 * Global data structures for the Level Editor.
 */

// Default structures for adding new elements
export const newWaveStructure = {
    "level": 99, 
    "enemies": [
        {"type": "basic", "count": 10, "health": 200, "speed": 1.5, "path": "S1E1", "interval": 1000, "firstDelay": 0, "coinReward": 2}
    ]
};

export const newAbilityStructure = {
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

// Default map for initial load (11x3 layout)
const defaultLevelJson = {
    "maps": [
        {
            "name": "EDIT TITLE",
            "startingCoins": 100,
            "startingLifes": 100,
            "extraLife": true, 
            "extraLifePrices": [10, 25, 50, 75, 100, 150, 200],
            "description": [
                {
                    "descriptionText": "Edit description",
                    "level count": 1,
                    "difficulty": "⭐",
                    "map_size": "11x3",
                    "tower types": 1,
                    "abilites": "-"
                }
            ],
            "tileSize": 80,
            "layout": [
                ["-","-","X","X","X","X","X","X","X","-","-"],
                ["S1","O","O","O","O","O","O","O","O","O","E1"],
                ["-","-","X","X","X","X","X","X","X","-","-"]
            ],
            "abilities": [
                {
                    "_comment": "cooldown - 30000",
                    "id": "lava_floor",
                    "configId": "lava_floor",
                    "name": "Lava Floor",
                    "description": "Damage - 250dmg / 0.25s",
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
                        {"type": "basic", "count": 5, "health": 100, "speed": 1, "path": "S1E1", "interval": 1000, "coinReward": 1, "firstDelay": 0}
                    ]
                }
            ]
        }
    ]
};

// CRITICAL: Global variable to store the clean JavaScript object (the source of truth)
export let currentLevelData = JSON.parse(JSON.stringify(defaultLevelJson));

// Map editing state and available tiles
export function getCurrentMap() {
    return currentLevelData.maps[0];
}
export let currentTileType = 'O'; 
export const terrainTypes = ['-', 'O', 'X', 'W', 'M', 'S', 'E', 'SNW', 'SND', 'ICE', 'LAVA'];
export const objectTypes  = ['SND[BONE-1]', 'SND[BONE-2]', 'SND[BONE-3]', 'SND[BONE-4]', 'SND[CACTUS-1]', 'SND[CACTUS-2]', 'SND[CACTUS-3]', 'SND[CACTUS-4]'];
export const tileTypes    = [...terrainTypes, ...objectTypes];

/**
 * FIX: Renamed from setCurrentLevelData to updateCurrentLevelData
 * to match the import in json_functions.js.
 * This function also performs critical validation.
 * @param {Object} data - The full parsed JSON object.
 * @returns {boolean} True if update was successful.
 */
export function updateCurrentLevelData(data) {
    if (data && data.maps && data.maps.length > 0) {
        currentLevelData = data;
        return true;
    }
    return false;
}

export function getNextAvailableMarker(prefix) {
    const layout = currentLevelData.maps[0].layout;
    const foundNumbers = new Set();

    layout.forEach(row => {
        row.forEach(tile => {
            if (typeof tile === 'string' && tile.startsWith(prefix)) {
                const match = tile.match(/\d+/);
                if (match) foundNumbers.add(parseInt(match[0], 10));
            }
        });
    });

    let nextNum = 1;
    while (foundNumbers.has(nextNum)) {
        nextNum++;
    }
    return `${prefix}${nextNum}`;
}

export function setCurrentTileType(type) {
    // Determine what category we are currently holding
    const isHoldingS = typeof currentTileType === 'string' && currentTileType.startsWith('S') && (currentTileType !== 'SNW' && currentTileType !== 'SND' && !currentTileType.startsWith('SND['))
    const isHoldingE = typeof currentTileType === 'string' && currentTileType.startsWith('E');

    if (type === 'S' || (type === 'REFRESH_S' && isHoldingS)) {
        currentTileType = getNextAvailableMarker('S');
    } 
    else if (type === 'E' || (type === 'REFRESH_E' && isHoldingE)) {
        currentTileType = getNextAvailableMarker('E');
    } 
    else if (!type.startsWith('REFRESH_')) {
        // Only update if it's a real tile selection (O, X, -, etc), not a refresh signal
        currentTileType = type;
    }
}