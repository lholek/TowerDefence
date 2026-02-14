// js/level_editor/tower_editor.js

import { currentLevelData } from './level_data.js'; // To access the tower data
import { modifyJson, customConfirm } from './json_functions.js'; // Import both utilities

let contentContainer = null; 

// --- New Tower Default Structure ---
const newTowerStructure = {
    "name": "New Tower",
    "price": 0,
    "damage": 0,
    "fireRate": 0,
    "range": 0,
    "color": "#ffffff",
    "sellPrice": 0,
    "speed": 0
};

// --- Initialization ---
export const initialize = () => {
    contentContainer = document.getElementById('towerEditorContent');
    if (!contentContainer) {
        console.error("Tower Editor Error: Element #towerEditorContent not found.");
    }
};

/**
 * Finds the next sequential three-digit ID based on the current highest.
 * This is used ONLY when ADDING a new tower.
 */
function getNextTowerId() {
    const towerTypes = currentLevelData.maps[0].towerTypes;
    const existingIds = Object.keys(towerTypes);
    
    const maxId = existingIds.reduce((max, id) => {
        const numId = parseInt(id, 10);
        return numId > max ? numId : max;
    }, 0); 

    const nextId = maxId + 1;
    return nextId.toString().padStart(3, '0');
}

/**
 * Reorganizes tower IDs sequentially (001, 002, 003, ...).
 * @param {object} towerTypes - The object holding all tower definitions.
 * @returns {object} The new, re-indexed towerTypes object.
 */
function reIndexTowerIds(towerTypes) {
    const newTowerTypes = {};
    const sortedKeys = Object.keys(towerTypes).sort();
    const sortedTowers = sortedKeys.map(key => towerTypes[key]);
    
    sortedTowers.forEach((tower, index) => {
        const newId = (index + 1).toString().padStart(3, '0');
        newTowerTypes[newId] = tower;
    });

    return newTowerTypes;
}

export const towerEditor = (() => {
    
    // --- Repeater Rendering Function ---
    const renderTowerRepeater = (towerTypes) => {
        if (!contentContainer) {
            console.error("Tower Editor Error: Content container is null."); 
            return; 
        }
        if (!towerTypes || typeof towerTypes !== 'object') {
            contentContainer.innerHTML = "<p>No tower data found in JSON.</p>";
            return;
        }
        
        let html = '';

        for (const towerId in towerTypes) {
            const tower = towerTypes[towerId];
            const TILE_SIZE = 80; // Base size
            const rangeInTiles = (tower.range / TILE_SIZE).toFixed(1);

            // Formula: Damage / (FireRate in seconds)
            const dps = tower.fireRate > 0 ? ((tower.damage / tower.fireRate) * 1000).toFixed(1) : 0;
            
            html += `
                <div class="tower-card box" data-tower-id="${towerId}">
                    <div class="card-header">
                        <div class="item-title">Tower ${Number(towerId)}</div>
                        <label>Name <input type="text" data-key="name" value="${tower.name}"></label>
                        <span class="badge-dps">⚡ DPS: ${dps}</span>
                        <div class="header-actions">
                            <button class="btn btn-copy btn-copy-tower btn-padding-buttons" data-copy-id="${towerId}" title="Copy Tower">📋</button>
                            <button class="btn btn-delete btn-delete-tower btn-padding-buttons" data-delete-id="${towerId}">X</button>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <label>🪙 Price <input type="number" name="price" data-key="price" value="${tower.price}" min="0"></label>
                        <label>⚔️ Damage <input type="number" name="damage" data-key="damage" value="${tower.damage}" min="0"></label>
                        <label>🕐 Fire Rate (ms) <input type="number" name="fire_rate" data-key="fireRate" value="${tower.fireRate}" min="1"></label>
                        <label>🎯 Range  
                            <input type="number" name="range" data-key="range" value="${tower.range}" min="1">
                            <span class="range-tile-info">(${rangeInTiles} tiles)</span>
                        </label>
                        <label>🗲 Speed <input type="number" name="speed" data-key="speed" value="${tower.speed}" min="1"></label>
                        <label>💰 Sell Price <input type="number" name="sell_price" data-key="sellPrice" value="${tower.sellPrice}" min="0"></label>
                        <label class="card-body-tower-color">Color <input type="color" name="color" data-key="color" value="${tower.color}"></label>
                    </div>
                </div>
            `;
        }
        
        contentContainer.innerHTML = html;
        attachChangeListeners();
        attachDeleteListeners();
        attachCopyListeners();
    };

    // --- Event Listeners ---

    const attachDeleteListeners = () => {
        if (!contentContainer) return;
        contentContainer.querySelectorAll('.btn-delete-tower').forEach(button => {
            button.addEventListener('click', async (e) => {
                const towerId = e.currentTarget.getAttribute('data-delete-id');
                await deleteTower(towerId);
            });
        });
    };

    const attachCopyListeners = () => {
        if (!contentContainer) return;
        contentContainer.querySelectorAll('.btn-copy-tower').forEach(button => {
            button.addEventListener('click', (e) => {
                const towerId = e.currentTarget.getAttribute('data-copy-id');
                copyTower(towerId);
            });
        });
    };

    const attachChangeListeners = () => {
        if (!contentContainer) return; 
        contentContainer.querySelectorAll('input:not(.input-tower-id)').forEach(input => {
            input.addEventListener('change', (e) => {
                const card = e.target.closest('.tower-card');
                const towerId = card.getAttribute('data-tower-id');
                const key = e.target.getAttribute('data-key');
                const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                
                modifyJson((data) => {
                    data.maps[0].towerTypes[towerId][key] = value;
                    // Re-render to update the DPS badge and Tile Range info
                    renderTowerRepeater(data.maps[0].towerTypes);
                }, `Tower ${towerId}: ${key} updated.`);
            });
        });
    };

    // --- Logic Functions ---

    const addTower = () => {
        const newId = getNextTowerId(); 
        modifyJson((data) => {
            const newTower = JSON.parse(JSON.stringify(newTowerStructure));
            newTower.name = `New Tower ${newId}`; 
            data.maps[0].towerTypes[newId] = newTower;
            renderTowerRepeater(data.maps[0].towerTypes);
        }, `New tower added with ID: ${newId}`);
    };

    const copyTower = (towerId) => {
        const originalTower = currentLevelData.maps[0].towerTypes[towerId];
        const newId = getNextTowerId();

        modifyJson((data) => {
            const towerCopy = JSON.parse(JSON.stringify(originalTower));
            towerCopy.name = `${originalTower.name} (Copy)`;
            
            data.maps[0].towerTypes[newId] = towerCopy;
            renderTowerRepeater(data.maps[0].towerTypes);
        }, `Tower ${towerId} copied to ${newId}`);
    };

    const deleteTower = async (towerId) => {
        const towerName = currentLevelData.maps[0].towerTypes[towerId].name;
        const confirmed = await customConfirm(
            "Confirm Deletion",
            `Are you sure you want to delete Tower ${towerId}: ${towerName}? This will re-index all subsequent tower IDs.`
        );

        if (!confirmed) return;
        
        await modifyJson((data) => {
            delete data.maps[0].towerTypes[towerId];
            data.maps[0].towerTypes = reIndexTowerIds(data.maps[0].towerTypes);
            renderTowerRepeater(data.maps[0].towerTypes);
        }, `Tower ${towerId} (${towerName}) deleted and IDs re-indexed.`);
    };

    return {
        renderTowerRepeater,
        addTower,
        deleteTower,
        copyTower
    };
})();