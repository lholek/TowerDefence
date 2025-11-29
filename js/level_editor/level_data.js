/**
 * Global data structures for the Level Editor.
 */

// Default structures for adding new elements
export const newWaveStructure = {
    "level": 99, 
    "enemies": [
        {"type": "basic", "count": 10, "health": 200, "speed": 1.5, "path": "S1E1", "interval": 750, "coinReward": 2}
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
            "startingLives": 100,
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
            "tileSize": 60,
            "layout": [
                ["-","-","X","X","X","X","X","X","X","-","-"],
                ["S1","O","O","O","O","O","O","O","O","O","E1"],
                ["-","-","X","X","X","X","X","X","X","-","-"]
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

// CRITICAL: Global variable to store the clean JavaScript object (the source of truth)
export let currentLevelData = JSON.parse(JSON.stringify(defaultLevelJson));

// Map editing state and available tiles
export function getCurrentMap() {
    return currentLevelData.maps[0];
}
export let currentTileType = 'O'; 
export const tileTypes = ['-', 'O', 'X', 'S1', 'E1', 'S2', 'E2', 'S3', 'E3']; 

// Setter function for the level data, used by json_functions.js
export function setCurrentLevelData(data) {
    currentLevelData = data;
}

// Setter function for the current tile type, used by map_editor.js
export function setCurrentTileType(type) {
    currentTileType = type;
}