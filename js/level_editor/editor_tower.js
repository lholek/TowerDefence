// js/level_editor/tower_editor.js

import { currentLevelData } from './level_data.js'; // To access the tower data
import { modifyJson as modifyJsonRaw } from './json_functions.js';
import { formatNumber, parseThousands } from './number_format.js';
import { initJsonSteppers, RELEASE_EVENT, isStepperHoldActive } from './JsonStepper.js';

// Every modifyJson(...) call in this file edits a tower, so tag it 'tower' for the
// Undo/Redo history automatically. Pass a 4th arg (CSS selector for the specific
// card/field being touched) so Undo/Redo can jump to that exact spot instead of
// just the whole Towers panel.
const modifyJson = (modifyFn, successMessage, selector) =>
    modifyJsonRaw(modifyFn, successMessage, { section: 'tower', selector });

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

    // A JsonStepper hold skips the innerHTML rebuild below (see attachChangeListeners)
    // for as long as it's running, so catch back up with one rebuild once it lets go.
    document.addEventListener(RELEASE_EVENT, () => {
        towerEditor.renderTowerRepeater(currentLevelData.maps[0].towerTypes);
    });
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
            // Bullet.js moves bullets by `speed * (deltaTime / (1000/144))` px per frame, i.e.
            // `speed` is px per 1/144s reference frame — so over a full second that's speed*144
            // pixels, which converts to tiles/s by dividing by the tile size.
            const speedInTilesPerSec = ((tower.speed * 144) / TILE_SIZE).toFixed(1);

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
                        <label class="editor-row">
                            <span class="label-text">🪙 Price <i class="info-icon" data-tooltip="tower-editor.price">i</i></span>
                            <input type="text" inputmode="numeric" class="input-thousands" name="price" data-key="price" data-json-stepper="tower_price" value="${formatNumber(tower.price)}">
                        </label>

                        <label class="editor-row">
                            <span class="label-text">⚔️ Damage <i class="info-icon" data-tooltip="tower-editor.damage">i</i></span>
                            <input type="text" inputmode="numeric" class="input-thousands" name="damage" data-key="damage" data-json-stepper="tower_damage" value="${formatNumber(tower.damage)}">
                        </label>

                        <label class="editor-row">
                            <span class="label-text">🕐 Fire Rate <i class="info-icon" data-tooltip="tower-editor.fire-rate">i</i></span>
                            <input type="text" inputmode="numeric" class="input-thousands" name="fire_rate" data-key="fireRate" data-json-stepper="tower_fire_rate" value="${formatNumber(tower.fireRate)}">
                        </label>

                        <label class="editor-row">
                            <span class="label-text">🎯 Range <i class="info-icon" data-tooltip="tower-editor.range">i</i></span>
                            <div class="input-group">
                                <input type="text" inputmode="numeric" class="input-thousands" name="range" data-key="range" data-json-stepper="tower_range" value="${formatNumber(tower.range)}">
                                <span class="range-tile-info">(${rangeInTiles} tiles)</span>
                            </div>
                        </label>

                        <label class="editor-row">
                            <span class="label-text">🗲 Speed <i class="info-icon" data-tooltip="tower-editor.speed">i</i></span>
                            <div class="input-group">
                                <input type="text" inputmode="decimal" class="input-thousands" name="speed" data-key="speed" data-json-stepper="tower_speed" value="${formatNumber(tower.speed)}">
                                <span class="range-tile-info speed-tile-info">(${speedInTilesPerSec} tiles/s)</span>
                            </div>
                        </label>

                        <label class="editor-row">
                            <span class="label-text">💰 Sell Price <i class="info-icon" data-tooltip="tower-editor.sell-price">i</i></span>
                            <input type="text" inputmode="numeric" class="input-thousands" name="sell_price" data-key="sellPrice" data-json-stepper="tower_sell_price" value="${formatNumber(tower.sellPrice)}">
                        </label>

                        <label class="editor-row card-body-tower-color">
                            <span class="label-text">🎨 Color <i class="info-icon" data-tooltip="tower-editor.color">i</i></span>
                            <input type="color" name="color" data-key="color" value="${tower.color}">
                        </label>
                    </div>
                </div>
            `;
        }
        
        contentContainer.innerHTML = html;
        attachChangeListeners();
        attachDeleteListeners();
        attachCopyListeners();
        // Rebuilding innerHTML above throws away any previous stepper wrap
        // (this whole card list re-renders on every field change, to refresh
        // the DPS badge etc.), so re-wrap the fresh .json-stepper inputs here.
        initJsonSteppers(contentContainer);
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
                const value = e.target.classList.contains('input-thousands')
                    ? parseThousands(e.target.value)
                    : (e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value);

                modifyJson((data) => {
                    data.maps[0].towerTypes[towerId][key] = value;
                    // Re-render to update the DPS badge and Tile Range / Tile Speed info -
                    // except mid-hold (see initialize()'s RELEASE_EVENT listener), where
                    // rebuilding this input's row out from under a running JsonStepper
                    // hold would orphan its repeat timer after just one step.
                    if (!isStepperHoldActive()) {
                        renderTowerRepeater(data.maps[0].towerTypes);
                    }
                }, `Tower ${towerId}: ${key} updated.`, `.tower-card[data-tower-id="${towerId}"] [data-key="${key}"]`);
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
        }, `New tower added with ID: ${newId}`, `.tower-card[data-tower-id="${newId}"]`);
    };

    const copyTower = (towerId) => {
        const originalTower = currentLevelData.maps[0].towerTypes[towerId];
        const newId = getNextTowerId();

        modifyJson((data) => {
            const towerCopy = JSON.parse(JSON.stringify(originalTower));
            towerCopy.name = `${originalTower.name} (Copy)`;
            
            data.maps[0].towerTypes[newId] = towerCopy;
            renderTowerRepeater(data.maps[0].towerTypes);
        }, `Tower ${towerId} copied to ${newId}`, `.tower-card[data-tower-id="${newId}"]`);
    };

    const deleteTower = async (towerId) => {
        const towerName = currentLevelData.maps[0].towerTypes[towerId].name;

        await modifyJson((data) => {
            delete data.maps[0].towerTypes[towerId];
            data.maps[0].towerTypes = reIndexTowerIds(data.maps[0].towerTypes);
            renderTowerRepeater(data.maps[0].towerTypes);
        }, `Tower ${towerId} (${towerName}) deleted and IDs re-indexed.`, `.tower-card[data-tower-id="${towerId}"]`);
    };

    return {
        renderTowerRepeater,
        addTower,
        deleteTower,
        copyTower
    };
})();