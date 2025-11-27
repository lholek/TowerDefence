// js/level_editor/tower_editor.js

import { currentLevelData } from './level_data.js'; // To access the tower data
import { modifyJson } from './json_functions.js';    // To save changes back to the JSON editor

let contentContainer = null; // 1. Initialize as null, will be set in 'initialize'

// --- New Tower Default Structure ---
const newTowerStructure = {
    "name": "New Tower",
    "price": 10,
    "damage": 5,
    "fireRate": 1000,
    "range": 200,
    "color": "#ffaa00",
    "sellPrice": 5,
    "speed": 3
};

// 2. Define the initialize function
export const initialize = () => {
    // Set the reference to the DOM element here, after DOMContentLoaded
    contentContainer = document.getElementById('towerEditorContent');
    if (!contentContainer) {
        console.error("Tower Editor Error: Element #towerEditorContent not found.");
    }
};

/**
 * Finds the next sequential three-digit ID (e.g., "005" if "004" is the highest).
 */
function getNextTowerId() {
    const towerTypes = currentLevelData.maps[0].towerTypes;
    const existingIds = Object.keys(towerTypes);
    
    // Find the highest numeric ID
    const maxId = existingIds.reduce((max, id) => {
        const numId = parseInt(id, 10);
        return numId > max ? numId : max;
    }, 0); // Start at 0

    // Format the next ID as a three-digit string
    const nextId = maxId + 1;
    return nextId.toString().padStart(3, '0');
}


export const towerEditor = (() => {
    
    // --- Repeater Rendering Function ---
    const renderTowerRepeater = (towerTypes) => {
        if (!contentContainer) {
            // This case should be handled by calling initialize() first in main.js
            console.error("Tower Editor Error: Content container is null."); 
            return; 
        }
        
        // Also add a check for the data being passed in
        if (!towerTypes || typeof towerTypes !== 'object') {
            contentContainer.innerHTML = "<p>No tower data found in JSON.</p>";
            return;
        }
        
        let html = '';

        for (const towerId in towerTypes) {
            const tower = towerTypes[towerId];
            
            // Generate the HTML block for a single tower
            html += `
                <div class="tower-card box" data-tower-id="${towerId}">
                    <div class="card-header">
                        <input type="text" class="input-tower-id input-small" value="${towerId}" placeholder="ID" disabled>
                        <h3>${tower.name}</h3>
                        <button onclick="window.app.towerEditor.deleteTower('${towerId}')" class="btn btn-delete">X</button>
                    </div>
                    
                    <div class="card-body">
                        <label>Name: <input type="text" data-key="name" value="${tower.name}"></label>
                        <label>Price: <input type="number" data-key="price" value="${tower.price}" min="0"></label>
                        <label>Damage: <input type="number" data-key="damage" value="${tower.damage}" min="0"></label>
                        <label>Fire Rate (ms): <input type="number" data-key="fireRate" value="${tower.fireRate}" min="1"></label>
                        <label>Range: <input type="number" data-key="range" value="${tower.range}" min="1"></label>
                        <label>Speed: <input type="number" data-key="speed" value="${tower.speed}" min="1"></label>
                        <label>Color: <input type="color" data-key="color" value="${tower.color}"></label>
                        <label>Sell Price: <input type="number" data-key="sellPrice" value="${tower.sellPrice}" min="0"></label>
                    </div>
                </div>
            `;
        }
        
        contentContainer.innerHTML = html;
        attachChangeListeners();
    };

    // 1. Function to handle saving changes (NOW IMPLEMENTED)
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
                }, `Tower ${towerId}: ${key} updated.`);
            });
        });
    };

    // 2. Function to add a new tower (NOW IMPLEMENTED)
    const addTower = () => {
        modifyJson((data) => {
            const newId = getNextTowerId();
            const newTower = JSON.parse(JSON.stringify(newTowerStructure));
            newTower.name = `New Tower (${newId})`; 

            data.maps[0].towerTypes[newId] = newTower;
            
            // Re-render the repeater to show the new tower
            renderTowerRepeater(data.maps[0].towerTypes);

        }, `New tower added with ID: ${getNextTowerId()}`);
    };

    // 3. Function to delete a tower (NOW IMPLEMENTED)
    const deleteTower = (towerId) => {
        if (!confirm(`Are you sure you want to delete Tower ${towerId}: ${currentLevelData.maps[0].towerTypes[towerId].name}?`)) {
            return;
        }
        
        modifyJson((data) => {
            delete data.maps[0].towerTypes[towerId];

            // Re-render the repeater to reflect the deletion
            renderTowerRepeater(data.maps[0].towerTypes);
            
        }, `Tower ${towerId} deleted.`);
    };

    return {
        renderTowerRepeater,
        addTower,
        deleteTower,
    };
})();