// js/level_editor/editor_wave.js

import { getCurrentMap, newWaveStructure } from './level_data.js'; // To access the wave data and default structure
import { modifyJson, customConfirm, getAvailablePaths } from './json_functions.js'; // Import utilities

let contentContainer = null; 
let setStatus = () => {}; // Dependency Injection for status messages

// The hard-coded ENEMY_TYPES constant is REMOVED

/**
 * 💡 RE-ADDED: Reads the enemy types from the JSON data.
 * Falls back to a default list if not present (for compatibility).
 * @returns {Array<string>} The list of enemy type IDs.
 */
export function getEnemyTypes() {
    const currentMap = getCurrentMap();
    if (currentMap.enemyTypes && Array.isArray(currentMap.enemyTypes) && currentMap.enemyTypes.length > 0) {
        return currentMap.enemyTypes;
    }
    // Fallback if data is missing or empty in the JSON
    return [
        "basic", "tank", "fast", "boss"
    ];
}

// --- Dependency Injection and Initialization ---
/**
 * Sets external dependencies and finds the main DOM container.
 * @param {object} refs - Object containing setStatus utility.
 */
let tagsContainer = null;
let newTypeInput = null;
export const initialize = (refs) => {
    setStatus = refs.setStatus;
    contentContainer = document.getElementById('waves-editor-container'); 
    
    // New references
    tagsContainer = document.getElementById('enemyTypesTagsContainer');
    newTypeInput = document.getElementById('newEnemyTypeInput');

    // Attach "Add" button listener
    const addTypeBtn = document.getElementById('add-enemy-type-button');
    if (addTypeBtn) {
        addTypeBtn.addEventListener('click', addNewEnemyType);
    }

    // Support "Enter" key in input
    if (newTypeInput) {
        newTypeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNewEnemyType();
        });
    }

    if (contentContainer) {
        waveEditor.renderWaveRepeater(getCurrentMap().levels);
        renderEnemyTypeTags(); // Render tags on load
    }

    // Attach event listener for the main Add Wave button
    const addWaveButton = document.getElementById('add-wave-button');
    if (addWaveButton) {
        // Attach the public function to the button
        addWaveButton.addEventListener('click', waveEditor.addWave);
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
    // 💡 CRITICAL CHANGE: Use the list from the dynamic getter function!
    const enemyTypes = getEnemyTypes();
    return enemyTypes.map(type => 
        `<option value="${type}" ${type === selectedType ? 'selected' : ''}>${type}</option>`
    ).join('');
}

/**
 * Renders the small cards (tags) for each enemy type.
 */
function renderEnemyTypeTags() {
    if (!tagsContainer) return;
    const enemyTypes = getEnemyTypes();
    
    tagsContainer.innerHTML = enemyTypes.map((type, index) => `
        <div class="enemy-tag" 
             draggable="true" 
             data-index="${index}"
             ondragstart="window.app.waveEditor.handleDragStart(event)"
             ondragover="window.app.waveEditor.handleDragOver(event)"
             ondragenter="window.app.waveEditor.handleDragEnter(event)"
             ondragleave="window.app.waveEditor.handleDragLeave(event)"
             ondragend="window.app.waveEditor.handleDragEnd(event)"
             ondrop="window.app.waveEditor.handleDrop(event)">
            <span class="drag-handle"></span> 
            <span class="tag-text">${type}</span>
            <button class="btn-remove-tag" onclick="window.app.waveEditor.removeEnemyType('${type}')">&times;</button>
        </div>
    `).join('');
}
/**
 * Adds a single new enemy type to the list.
 */
function addNewEnemyType() {
    const value = newTypeInput.value.trim().toLowerCase();
    if (!value) return;

    const currentTypes = getEnemyTypes();
    if (currentTypes.includes(value)) {
        setStatus("Type already exists!", true);
        return;
    }

    modifyJson((data) => {
        data.maps[0].enemyTypes = [...currentTypes, value];
        newTypeInput.value = ""; // Clear input
        renderEnemyTypeTags(); // Refresh tags
        waveEditor.renderWaveRepeater(data.maps[0].levels); // Update dropdowns in waves
    }, `Added enemy type: ${value}`);
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
            <button class="btn btn-delete btn-small btn-delete-enemy" data-wave-index="${waveIndex}" data-enemy-index="${enemyIndex}">X</button>
            <div class="card-header-inner">
                    <label>Type: 
                        <select data-key="type" class="input-enemy-type">
                            ${getEnemyTypeOptions(enemy.type)}
                        </select>
                    </label>
                </div>
                <div class="card-body-inner">
                    <label>⭐ Count <input type="number" data-key="count" value="${enemy.count}" min="1"></label>
                    <label>❤️ Health <input type="number" data-key="health" value="${enemy.health}" min="1"></label>
                    <label>🗲 Speed <input type="number" data-key="speed" value="${enemy.speed}" step="0.01" min="0.01"></label>
                    <label>Path 
                        <div class="path-input-container">
                            <input type="text" 
                                   data-key="path" 
                                   class="path-suggest-input" 
                                   value="${enemy.path}" 
                                   autocomplete="off">
                            <div class="custom-path-dropdown" style="display:none;"></div>
                        </div>
                    </label>
                    <label>Interval <input type="text" data-key="interval" value="${enemy.interval}"></label>
                    <label>FirstDelay <input type="text" data-key="firstDelay" value="${enemy.firstDelay}"></label>
                    <label>🪙 Coin Reward <input type="number" data-key="coinReward" value="${enemy.coinReward}" min="0"></label>
                </div>
            </div>
        `;
    };

    /**
     * Attaches custom autocomplete logic to path inputs.
     * Call this every time the wave list is re-rendered.
     */
    const setupPathAutocomplete = () => {
        const inputs = document.querySelectorAll('.path-suggest-input');
        const availablePaths = getAvailablePaths();
        
        inputs.forEach(input => {
            const dropdown = input.nextElementSibling;
            let activeIndex = -1;
        
            const renderSuggestions = (filtered) => {
                if (filtered.length > 0) {
                    dropdown.innerHTML = filtered.map((p, i) => 
                        `<div class="path-option ${i === activeIndex ? 'active' : ''}" data-index="${i}">${p}</div>`
                    ).join('');
                    dropdown.style.display = 'block';
                    
                    // 💡 Auto-scroll to the active item
                    if (activeIndex >= 0) {
                        const activeElem = dropdown.children[activeIndex];
                        if (activeElem) {
                            activeElem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                    }
                } else {
                    dropdown.style.display = 'none';
                }
            };
        
            const showSuggestions = () => {
                const val = input.value.toLowerCase();
                const filtered = availablePaths.filter(p => p.toLowerCase().includes(val));
                renderSuggestions(filtered);
            };
        
            // Keyboard Handling
            input.onkeydown = (e) => {
                const val = input.value.toLowerCase();
                const filtered = availablePaths.filter(p => p.toLowerCase().includes(val));
            
                if (dropdown.style.display === 'none' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                    showSuggestions();
                    return;
                }
            
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeIndex = (activeIndex + 1) % filtered.length;
                    renderSuggestions(filtered);
                } 
                else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
                    renderSuggestions(filtered);
                } 
                else if (e.key === 'Enter') {
                    if (activeIndex > -1 && filtered[activeIndex]) {
                        e.preventDefault();
                        input.value = filtered[activeIndex];
                        dropdown.style.display = 'none';
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                else if (e.key === 'Escape') {
                    dropdown.style.display = 'none';
                    input.blur();
                }
            };
        
            input.onfocus = () => { activeIndex = -1; showSuggestions(); };
            input.oninput = () => { activeIndex = -1; showSuggestions(); };
        
            dropdown.onclick = (e) => {
                if (e.target.classList.contains('path-option')) {
                    input.value = e.target.innerText;
                    dropdown.style.display = 'none';
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };
        
            // Cleanup: hide on click-away
            const clickAway = (e) => {
                if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('mousedown', clickAway);
                }
            };
            input.onfocus = () => { 
                activeIndex = -1; 
                showSuggestions(); 
                document.addEventListener('mousedown', clickAway);
            };
        });
    };

    /**
     * Renders the HTML for all waves and populates the content container.
     */
    const renderWaveRepeater = (levels) => {
        if (!contentContainer) return;
        
        // Generate the datalist HTML dynamically
        const paths = getAvailablePaths();
        const pathDatalist = `
            <datalist id="path-list">
                ${paths.map(p => `<option value="${p}">`).join('')}
            </datalist>
        `;

        let html = pathDatalist; // Start with the datalist

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
                        <div class="level-label">Wave ${wave.level}</div>
                        <label class="comment-label" for="wave-comment-${waveIndex}">Comment 
                            <input type="text" data-key="_comment" id="wave-comment-${waveIndex}" value="${wave._comment || ''}" placeholder="${totalCoins} coins">
                        </label>
                        <h4>Enemies (Total Coins: 🪙 ${totalCoins})</h4>
                        <button class="btn btn-delete btn-delete-wave" data-wave-index="${waveIndex}">X</button>
                    </div>
                    
                    <div class="card-body waves-body">
                        <div class="enemies-container">
                            ${enemiesHtml}
                        </div>
                        </div>
                    <button onclick="window.app.waveEditor.addEnemyToWave(${waveIndex})" class="btn btn-add">Add Enemy Group</button>
                </div>
            `;
        });
        
        contentContainer.innerHTML = html;
        attachChangeListeners();
        attachDeleteListeners();
        setupPathAutocomplete();
    };

    // --- Interaction Functions ---

    // NEW: Function to attach delete listeners
    const attachDeleteListeners = () => {
        if (!contentContainer) return;
        
        // 1. Delete Wave Listeners
        contentContainer.querySelectorAll('.btn-delete-wave').forEach(button => {
            button.addEventListener('click', async (e) => { // ADD async
                // Get index from the button's data attribute
                const waveIndex = parseInt(e.target.getAttribute('data-wave-index'), 10);
                await deleteWave(waveIndex); // ADD await
            });
        });

        // 2. Delete Enemy Group Listeners
        contentContainer.querySelectorAll('.btn-delete-enemy').forEach(button => {
            button.addEventListener('click', async (e) => { // ADD async
                // Get indices from the button's data attributes
                const waveIndex = parseInt(e.target.getAttribute('data-wave-index'), 10);
                const enemyIndex = parseInt(e.target.getAttribute('data-enemy-index'), 10);
                await deleteEnemyFromWave(waveIndex, enemyIndex); // ADD await
            });
        });
    };
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
                // IMPORTANT: Use the first enemy type from the live list as the default
                const defaultEnemyType = getEnemyTypes()[0] || "basic";
                 newWave.enemies = [
                     { "type": defaultEnemyType, "count": 5, "health": 100, "speed": 1.0, "coinReward": 5 }
                 ];
            }
            
            levels.push(newWave);
            
            // Re-render the entire repeater to show the new wave
            renderWaveRepeater(levels); 

        }, `New Wave ${getCurrentMap().levels.length + 1} added.`);
    };

    /**
     * Deletes an entire wave and re-indexes the remaining waves.
     * @param {number} waveIndex - The array index of the wave to delete.
     */
    const deleteWave = async (waveIndex) => { 
        // Get the wave level BEFORE the deletion prompt
        const waveLevel = getCurrentMap().levels[waveIndex].level; 
        
        const confirmed = await customConfirm(
            "Confirm Deletion",
            `Are you sure you want to delete Wave ${waveLevel}? This will re-index subsequent waves.`
        );

        if (!confirmed) {
            return;
        }
        
        await modifyJson((data) => {
            const levels = data.maps[0].levels;
            
            // 1. Delete the wave by array index
            levels.splice(waveIndex, 1);

            // 2. Re-index levels from 1 up
            levels.forEach((wave, index) => {
                wave.level = index + 1;
            });

            // 3. Re-render the repeater to reflect the deletion and new IDs
            renderWaveRepeater(levels);
            
        }, `Wave ${waveLevel} deleted and subsequent waves re-indexed.`);
    };

    /**
     * Adds a new default enemy spawn group to an existing wave.
     * @param {number} waveIndex - The array index of the wave to modify.
     */
    const addEnemyToWave = async (waveIndex) => { // 💡 ADD async
        // FIX: Get the wave level from the current data *before* modifyJson
        const waveLevel = getCurrentMap().levels[waveIndex].level;
        const wave = getCurrentMap().levels[waveIndex];

        // Create a new enemy structure based on a basic default or the first enemy type
        const newEnemy = {
            "type": getEnemyTypes()[0] || "basic", 
            "count": 1, 
            "health": 1, 
            "speed": 1, 
            "path": "S1E1", 
            "interval": 1000, 
            "firstDelay": 0, 
            "coinReward": 1
        };
        
        await modifyJson((data) => { // 💡 ADD await
            const levels = data.maps[0].levels;
            const wave = levels[waveIndex]; // Get the modified wave reference

            // Ensure the enemies array exists
            if (!wave.enemies) {
                wave.enemies = [];
            }

            wave.enemies.push(newEnemy);

            // Re-render the entire repeater to show the new enemy group
            renderWaveRepeater(levels);

        }, `New enemy group added to Wave ${waveLevel}.`); 
    };

    /**
     * Deletes an enemy spawn group from a specific wave.
     * @param {number} waveIndex - The array index of the wave to modify.
     * @param {number} enemyIndex - The array index of the enemy group to delete.
     */
    const deleteEnemyFromWave = async (waveIndex, enemyIndex) => { // ADD async
        // FIX: Get the wave level from the current data *before* modifyJson
        const waveLevel = getCurrentMap().levels[waveIndex].level;
        
        await modifyJson((data) => { // ADD await
            const levels = data.maps[0].levels;
            const wave = levels[waveIndex];
            
            if (wave.enemies && wave.enemies.length > enemyIndex) {
                wave.enemies.splice(enemyIndex, 1);
            }
            
            // Re-render the entire repeater to reflect the change and update the coin count
            renderWaveRepeater(levels);
            
        }, `Enemy group deleted from Wave ${waveLevel}.`); // Now uses waveLevel
    };

    /**
     * Removes a single enemy type with a safety check.
     */
    const removeEnemyType = async (typeToRemove) => { // Change 'function' to 'const'
        const currentTypes = getEnemyTypes();

        // Ensure at least one type remains
        if (currentTypes.length <= 1) {
            setStatus("Cannot remove the last enemy type. At least one is required!", true);
            return;
        }

        const confirmed = await customConfirm(
            "Remove Type", 
            `Are you sure you want to remove "${typeToRemove}"?`
        );
        
        if (!confirmed) return;

        modifyJson((data) => {
            data.maps[0].enemyTypes = currentTypes.filter(t => t !== typeToRemove);
            renderEnemyTypeTags(); // This function is accessible because it's in the outer scope
            waveEditor.renderWaveRepeater(data.maps[0].levels);
        }, `Removed enemy type: ${typeToRemove}`);
    };

    /* Grap enemy types */
    let draggedItemIndex = null;

    function handleDragStart(e) {
        const target = e.target.closest('.enemy-tag');
        draggedItemIndex = parseInt(target.getAttribute('data-index'));

        // Visual feedback: item being moved becomes faint
        target.classList.add('dragging');

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItemIndex); 
    }

    function handleDragEnter(e) {
        const target = e.target.closest('.enemy-tag');
        // Don't highlight the item we are currently holding
        if (target && parseInt(target.getAttribute('data-index')) !== draggedItemIndex) {
            target.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        const target = e.target.closest('.enemy-tag');
        if (target) {
            target.classList.remove('drag-over');
        }
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow drop
        return false;
    }

    // CRITICAL: This cleans up all gray/highlight states regardless of where you drop
    function handleDragEnd(e) {
        const tags = document.querySelectorAll('.enemy-tag');
        tags.forEach(t => t.classList.remove('dragging', 'drag-over'));
        draggedItemIndex = null;
    }

    function handleDrop(e) {
        e.preventDefault();
        const target = e.target.closest('.enemy-tag');
        if (!target) return;

        const targetIndex = parseInt(target.getAttribute('data-index'));

        // Requirement: Cancel if dropped on same place
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
            handleDragEnd();
            return;
        }

        modifyJson((data) => {
            // Ensure we are targeting the array correctly
            const types = data.maps[0].enemyTypes || getEnemyTypes();
            const [movedItem] = types.splice(draggedItemIndex, 1);
            types.splice(targetIndex, 0, movedItem);

            data.maps[0].enemyTypes = types; // Save back to data

            renderEnemyTypeTags();
            waveEditor.renderWaveRepeater(data.maps[0].levels);
        }, `Reordered enemy types list.`);

        handleDragEnd();
    }
    /* Grap enemy types */

    /**
     * Copies an entire wave (level) and all its enemy groups
     */
    const copyWave = (waveIndex) => {
        modifyJson((data) => {
            const levels = data.maps[0].levels;
            const waveToCopy = levels[waveIndex];
            
            const newWave = JSON.parse(JSON.stringify(waveToCopy));
            
            // Auto-increment level number
            const maxLevel = levels.reduce((max, w) => Math.max(max, w.level), 0);
            newWave.level = maxLevel + 1;

            levels.push(newWave);
            renderWaveRepeater(levels);
        }, `Wave copied as Level ${maxLevel + 1}.`);
    };

    /**
     * Copies a single enemy group within a specific wave
     */
    const copyEnemyGroup = (waveIndex, enemyIndex) => {
        modifyJson((data) => {
            const levels = data.maps[0].levels;
            const wave = levels[waveIndex];
            const groupToCopy = wave.enemies[enemyIndex];
            
            const newGroup = JSON.parse(JSON.stringify(groupToCopy));
            wave.enemies.push(newGroup);
            
            renderWaveRepeater(levels);
        }, `Enemy group duplicated.`);
    };

    const availablePaths = getAvailablePaths();
    const pathDatalist = `
        <datalist id="path-list">
            ${availablePaths.map(p => `<option value="${p}">`).join('')}
        </datalist>
    `;

    return {
        renderWaveRepeater,
        addWave,
        deleteWave,
        copyWave,
        copyEnemyGroup,
        addEnemyToWave,
        deleteEnemyFromWave,
        removeEnemyType,
        updateEnemyTypesEditor: renderEnemyTypeTags, // Point this to our new tag renderer
        handleDragStart,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDragEnd,
        handleDrop
    };
})();