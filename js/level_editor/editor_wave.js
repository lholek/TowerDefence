// js/level_editor/editor_wave.js

import { getCurrentMap, newWaveStructure } from './level_data.js'; // To access the wave data and default structure
import { modifyJson, customConfirm } from './json_functions.js'; // Import utilities

let contentContainer = null; 
let setStatus = () => {}; // Dependency Injection for status messages

// Available enemy types based on the user's JSON example
const ENEMY_TYPES = [
    "basic", "tank", "fast", "boss", "super-tank", "fast-boss", "armor-boss", "final-boss"
];

// --- Dependency Injection and Initialization ---
/**
 * Sets external dependencies and finds the main DOM container.
 * @param {object} refs - Object containing setStatus utility.
 */
export const initialize = (refs) => {
    setStatus = refs.setStatus;
    // CRITICAL: Ensure your level_editor.html has an element with this ID
    contentContainer = document.getElementById('waves-editor-container'); 
    
    if (!contentContainer) {
        console.error("Wave Editor Error: Element #waves-editor-container not found.");
    }
    
    // Attach event listener for the main Add Wave button
    const addWaveButton = document.getElementById('add-wave-button');
    if (addWaveButton) {
        // Attach the public function to the button
        addWaveButton.addEventListener('click', waveEditor.addWave); 
    }
    
    // Render initial content after initialization
    if (contentContainer) {
        waveEditor.renderWaveRepeater(getCurrentMap().levels);
    }
};

// --- Utility Functions ---

/**
 * Re-indexes all waves sequentially (level 1, 2, 3, ...).
 * This updates the 'level' property of each wave object.
 * @param {Array<object>} levels - The array of wave objects.
 */
function reIndexWaves(levels) {
    levels.forEach((wave, index) => {
        // Update the 'level' property based on its array index + 1
        wave.level = index + 1; 
    });
}

/**
 * Creates the HTML option tags for the enemy type dropdown.
 * @param {string} selectedType - The type currently selected for this enemy group.
 * @returns {string} HTML string of option tags.
 */
function getEnemyTypeOptions(selectedType) {
    return ENEMY_TYPES.map(type => 
        `<option value="${type}" ${type === selectedType ? 'selected' : ''}>${type}</option>`
    ).join('');
}

// --- Main Wave Editor Public Interface ---

export const waveEditor = (() => {
    
    // --- Rendering Functions ---

    /**
     * Renders the HTML structure for a single enemy spawn group within a wave.
     */
    const renderEnemyCard = (enemy, waveIndex, enemyIndex) => {
        return `
            <div class="enemy-card box-inner" data-wave-index="${waveIndex}" data-enemy-index="${enemyIndex}">
                <div class="card-header-inner">
                    <label>Type: 
                        <select data-key="type" class="input-enemy-type">
                            ${getEnemyTypeOptions(enemy.type)}
                        </select>
                    </label>
                    <button onclick="window.app.waveEditor.deleteEnemyFromWave(${waveIndex}, ${enemyIndex})" class="btn btn-delete btn-small">X</button>
                </div>
                <div class="card-body-inner">
                    <label>Count <input type="number" data-key="count" value="${enemy.count}" min="1"></label>
                    <label>Health <input type="number" data-key="health" value="${enemy.health}" min="1"></label>
                    <label>Speed <input type="number" data-key="speed" value="${enemy.speed}" step="0.01" min="0.01"></label>
                    <label>Coin Reward <input type="number" data-key="coinReward" value="${enemy.coinReward}" min="0"></label>
                </div>
            </div>
        `;
    };

    /**
     * Renders the HTML for all waves and populates the content container.
     */
    const renderWaveRepeater = (levels) => {
        if (!contentContainer) return;
        if (!levels || !Array.isArray(levels)) {
            contentContainer.innerHTML = "<p>No wave data found in JSON.</p>";
            return;
        }

        let html = '';

        levels.forEach((wave, waveIndex) => {
            
            // Calculate total coins for display
            let totalCoins = 0;
            if (wave.enemies && Array.isArray(wave.enemies)) {
                 totalCoins = wave.enemies.reduce((sum, e) => sum + (e.count * e.coinReward), 0);
            }
            
            // Build enemies HTML
            let enemiesHtml = '';
            if (wave.enemies && Array.isArray(wave.enemies)) {
                wave.enemies.forEach((enemy, enemyIndex) => {
                    enemiesHtml += renderEnemyCard(enemy, waveIndex, enemyIndex);
                });
            }

            html += `
                <div class="wave-card box" data-wave-index="${waveIndex}">
                    <div class="card-header">
                        <label class="level-label">Wave ${wave.level}</label>
                        <label class="comment-label">Comment 
                            <input type="text" data-key="_comment" value="${wave._comment || ''}" placeholder="E.g., ${totalCoins} coins">
                        </label>
                        <button onclick="window.app.waveEditor.deleteWave(${waveIndex})" class="btn btn-delete">X</button>
                    </div>
                    
                    <div class="card-body waves-body">
                        <h4>Enemies (Total Coins: ${totalCoins})</h4>
                        <div class="enemies-container">
                            ${enemiesHtml}
                        </div>
                        <button onclick="window.app.waveEditor.addEnemyToWave(${waveIndex})" class="btn btn-add">Add Enemy Group</button>
                    </div>
                </div>
            `;
        });
        
        contentContainer.innerHTML = html;
        attachChangeListeners();
    };

    // --- Interaction Functions ---

    /**
     * Attaches change listeners to all input fields and selects within the wave editor.
     */
    const attachChangeListeners = () => {
        if (!contentContainer) return; 

        contentContainer.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', (e) => {
                const enemyCard = e.target.closest('.enemy-card');
                const waveCard = e.target.closest('.wave-card');
                const key = e.target.getAttribute('data-key');
                // Parse number inputs as float, otherwise use string value
                const value = e.target.type === 'number' || e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
                
                modifyJson((data) => {
                    const levels = data.maps[0].levels;

                    if (enemyCard) {
                        // Handle enemy property change
                        const waveIndex = parseInt(enemyCard.getAttribute('data-wave-index'));
                        const enemyIndex = parseInt(enemyCard.getAttribute('data-enemy-index'));

                        if(levels[waveIndex]?.enemies?.[enemyIndex]) {
                            levels[waveIndex].enemies[enemyIndex][key] = value;
                            // Re-render the repeater to update the Total Coins label
                            renderWaveRepeater(levels);
                        }
                    } else if (waveCard) {
                        // Handle wave property change (e.g., _comment)
                        const waveIndex = parseInt(waveCard.getAttribute('data-wave-index'));
                        levels[waveIndex][key] = value;
                    }
                }, `Wave data updated: ${key} set to ${value}.`);
            });
        });
    };

    // --- Modification Functions ---

    /**
     * Adds a new wave (level) object to the end of the list.
     */
    const addWave = () => {
        modifyJson((data) => {
            const levels = data.maps[0].levels;
            const nextLevel = levels.length > 0 ? levels[levels.length - 1].level + 1 : 1;
            
            // Create a deep copy of the default wave structure
            const newWave = JSON.parse(JSON.stringify(newWaveStructure)); 
            newWave.level = nextLevel; 
            
            // Ensure the new wave has at least one basic enemy group
            if (!newWave.enemies || newWave.enemies.length === 0) {
                 newWave.enemies = [
                     { "type": "basic", "count": 5, "health": 100, "speed": 1.0, "coinReward": 5 }
                 ];
            }
            
            levels.push(newWave);
            
            // Re-render the entire repeater to show the new wave
            renderWaveRepeater(levels); 

        }, `New Wave ${getCurrentMap().levels.length + 1} added.`);
    };

    /**
     * Deletes a wave by index and re-indexes the remaining waves.
     * @param {number} waveIndex - The array index of the wave to delete.
     */
    const deleteWave = async (waveIndex) => {
        const waveLevel = getCurrentMap().levels[waveIndex].level;
        
        const confirmed = await customConfirm(
            "Confirm Wave Deletion",
            `Are you sure you want to delete Wave ${waveLevel}? This will re-index all subsequent waves.`
        );

        if (!confirmed) {
            return;
        }
        
        modifyJson((data) => {
            const levels = data.maps[0].levels;
            
            // 1. Delete the wave
            levels.splice(waveIndex, 1);

            // 2. Re-index all remaining waves to update their 'level' property
            reIndexWaves(levels);

            // 3. Re-render
            renderWaveRepeater(levels);
            
        }, `Wave ${waveLevel} deleted and subsequent waves re-indexed.`);
    };

    /**
     * Adds a new enemy spawn group to a specific wave.
     * @param {number} waveIndex - The array index of the wave to modify.
     */
    const addEnemyToWave = (waveIndex) => {
        // FIX: Get the wave level from the current data *before* modifyJson 
        // This variable (waveLevel) is now in the outer scope and accessible to the status message.
        const waveLevel = getCurrentMap().levels[waveIndex].level;

        modifyJson((data) => {
            const levels = data.maps[0].levels;
            const wave = levels[waveIndex];

            // Default enemy structure
            const newEnemy = { "type": "basic", "count": 1, "health": 1000, "speed": 1.0, "coinReward": 10 };

            if (!wave.enemies) {
                wave.enemies = [];
            }

            wave.enemies.push(newEnemy);

            // Re-render the entire repeater to show the new enemy group
            renderWaveRepeater(levels);

        }, `New enemy group added to Wave ${waveLevel}.`); // Now uses waveLevel
    };

    /**
     * Deletes an enemy spawn group from a specific wave.
     * @param {number} waveIndex - The array index of the wave to modify.
     * @param {number} enemyIndex - The array index of the enemy group to delete.
     */
    const deleteEnemyFromWave = (waveIndex, enemyIndex) => {
        // FIX: Get the wave level from the current data *before* modifyJson
        // This variable (waveLevel) is now in the outer scope and accessible to the status message.
        const waveLevel = getCurrentMap().levels[waveIndex].level;
        
        modifyJson((data) => {
            const levels = data.maps[0].levels;
            const wave = levels[waveIndex];
            
            if (wave.enemies && wave.enemies.length > enemyIndex) {
                wave.enemies.splice(enemyIndex, 1);
            }
            
            // Re-render the entire repeater to reflect the change and update the coin count
            renderWaveRepeater(levels);
            
        }, `Enemy group deleted from Wave ${waveLevel}.`); // Now uses waveLevel
    };

    return {
        renderWaveRepeater,
        addWave,
        deleteWave,
        addEnemyToWave,
        deleteEnemyFromWave
    };
})();