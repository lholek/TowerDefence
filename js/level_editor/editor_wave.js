// js/level_editor/editor_wave.js

import { getCurrentMap, newWaveStructure } from './level_data.js'; // To access the wave data and default structure
import { modifyJson as modifyJsonRaw, getAvailablePaths, showCursorWarning } from './json_functions.js';
import { formatNumber, parseThousands } from './number_format.js';

// Every modifyJson(...) call in this file edits waves/enemies, so tag it 'wave' for the
// Undo/Redo history automatically. Pass a 4th arg (CSS selector for the specific
// wave/enemy/effect row being touched) and optionally a 5th arg (fallback container
// selector, for the effects/damage repeaters which live outside the main wave list) so
// Undo/Redo can jump to that exact spot instead of just the whole Waves panel.
const modifyJson = (modifyFn, successMessage, selector, fallbackSelector) =>
    modifyJsonRaw(modifyFn, successMessage, { section: 'wave', selector, fallbackSelector });

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
let effectsContainer = null;

export const initialize = (refs) => {
    setStatus = refs.setStatus;
    contentContainer = document.getElementById('waves-editor-container'); 
    effectsContainer = document.getElementById('enemy-effects-repeater');
    tagsContainer = document.getElementById('enemyTypesTagsContainer');
    newTypeInput = document.getElementById('newEnemyTypeInput');

    // 1. Attach Button Listeners
    const addEffectBtn = document.getElementById('add-effect-btn');
    if (addEffectBtn) {
        addEffectBtn.addEventListener('click', waveEditor.addEffect);
    }
    
    if (contentContainer) {
        waveEditor.renderWaveRepeater(getCurrentMap().levels);
        renderEnemyTypeTags();
        
        // NEW: Render the effects table on load
        waveEditor.renderEffectsRepeater(); 
    }
    
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

        waveEditor.renderEffectsRepeater();
        waveEditor.renderDamageRepeater();
    }

    // Attach event listener for the main Add Wave button
    const addWaveButton = document.getElementById('add-wave-button');
    if (addWaveButton) {
        // Attach the public function to the button
        addWaveButton.addEventListener('click', waveEditor.addWave);
    } 

    // Inside initialize function...
    const addDamageBtn = document.getElementById('add-damage-btn');
    if (addDamageBtn) {
        addDamageBtn.removeEventListener('click', waveEditor.addEnemyDamage); // Prevence duplicit
        addDamageBtn.addEventListener('click', waveEditor.addEnemyDamage);
    }

    // Tohle vynutí vykreslení hned při startu
    waveEditor.renderDamageRepeater();
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
            <button class="btn-remove-tag" onclick="window.app.waveEditor.removeEnemyType('${type}', event)">&times;</button>
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
        const newTypeObject = { 
            id: value, 
            shakeDuration: 0, 
            shakeIntensity: 0 
        };
        data.maps[0].enemyTypes = [...currentTypes, value];
        newTypeInput.value = ""; // Clear input
        renderEnemyTypeTags(); // Refresh tags
        waveEditor.renderWaveRepeater(data.maps[0].levels); // Update dropdowns in waves
        waveEditor.renderEffectsRepeater();
    }, `Added enemy type: ${value}`, '#enemyTypesTagsContainer');
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
                
                <div class="card-controls">
                    <button class="btn btn-copy btn-small" onclick="window.app.waveEditor.copyEnemyGroup(${waveIndex}, ${enemyIndex})">📋</button>
                    <button class="btn btn-delete btn-small btn-delete-enemy" data-wave-index="${waveIndex}" data-enemy-index="${enemyIndex}">X</button>
                </div>
    
                <label class="editor-row mt-1">
                    <span class="label-text">
                        Type
                        <i class="info-icon" data-tooltip="wave-editor.type">i</i>
                    </span>

                    <select data-key="type" class="input-enemy-type">
                        ${getEnemyTypeOptions(enemy.type)}
                    </select>
                </label>

                <label class="editor-row mt-1">
                    <span class="label-text">
                        Skin
                        <i class="info-icon" data-tooltip="wave-editor.skin">i</i>
                    </span>

                    <select data-key="skin" class="input-enemy-type">
                        <option value="" ${!enemy.skin ? 'selected' : ''}>Random</option>
                        <option value="GOLEM" ${enemy.skin === 'GOLEM' ? 'selected' : ''}>Golem</option>
                        <option value="EYE" ${enemy.skin === 'EYE' ? 'selected' : ''}>Fiery Eye</option>
                    </select>
                </label>


                <div class="card-body-inner">
    
                    <label class="editor-row">
                        <span class="label-text">⭐ Count <i class="info-icon" data-tooltip="wave-editor.count">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="count" value="${formatNumber(enemy.count)}">
                    </label>

                    <label class="editor-row">
                        <span class="label-text">❤️ Health <i class="info-icon" data-tooltip="wave-editor.health">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="health" value="${formatNumber(enemy.health)}">
                    </label>
    
                    <label class="editor-row">
                        <span class="label-text">🗲 Speed <i class="info-icon" data-tooltip="wave-editor.speed">i</i></span>
                        <input type="text" inputmode="decimal" class="input-thousands" data-key="speed" value="${formatNumber(enemy.speed)}">
                    </label>
    
                    <label class="editor-row">
                        <span class="label-text">⤐ Path <i class="info-icon" data-tooltip="wave-editor.path">i</i></span>
                        <div class="path-input-container input-group">
                            <input type="text"
                                   data-key="path"
                                   class="path-suggest-input"
                                   value="${enemy.path}"
                                   autocomplete="off">
                            <div class="custom-path-dropdown" style="display:none;"></div>
                        </div>
                    </label>
    
                    <label class="editor-row">
                        <span class="label-text">🕒 Interval <i class="info-icon" data-tooltip="wave-editor.interval">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="interval" value="${formatNumber(enemy.interval)}">
                    </label>

                    <label class="editor-row">
                        <span class="label-text">⏳ First Delay <i class="info-icon" data-tooltip="wave-editor.first-delay">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="firstDelay" value="${formatNumber(enemy.firstDelay)}">
                    </label>
    
                    <label class="editor-row">
                        <span class="label-text">🪙 Coin Reward <i class="info-icon" data-tooltip="wave-editor.coin-reward">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="coinReward" value="${formatNumber(enemy.coinReward)}">
                    </label>
    
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
                        <div class="level-label item-title">Wave ${wave.level}</div>
                        <label class="comment-label" for="wave-comment-${waveIndex}">Comment 
                            <input type="text" data-key="_comment" id="wave-comment-${waveIndex}" value="${wave._comment || ''}" placeholder="Notes about wave...">
                        </label>
                        <h4>Enemies (Total Coins: 🪙 ${formatNumber(totalCoins)})</h4>
                        <div class="header-actions">
                            <button class="btn btn-copy" onclick="window.app.waveEditor.copyWave(${waveIndex})">📋</button>
                            <button class="btn btn-delete btn-delete-wave" data-wave-index="${waveIndex}">X</button>
                        </div>
                    </div>
                    
                    <div class="card-body waves-body">
                        <div class="enemies-container">
                            ${enemiesHtml}
                        </div>
                        </div>
                    <button onclick="window.app.waveEditor.addEnemyToWave(${waveIndex})" class="btn btn-add btn-green">+ Add Enemy Group</button>
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
                await deleteWave(waveIndex, e);
            });
        });

        // 2. Delete Enemy Group Listeners
        contentContainer.querySelectorAll('.btn-delete-enemy').forEach(button => {
            button.addEventListener('click', async (e) => { // ADD async
                // Get indices from the button's data attributes
                const waveIndex = parseInt(e.target.getAttribute('data-wave-index'), 10);
                const enemyIndex = parseInt(e.target.getAttribute('data-enemy-index'), 10);
                await deleteEnemyFromWave(waveIndex, enemyIndex, e);
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
                // Parse number inputs as float, thousands-formatted fields as int, otherwise use string value
                const value = e.target.classList.contains('input-thousands')
                    ? parseThousands(e.target.value)
                    : (e.target.type === 'number' || e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value);
                
                let targetSelector = null;
                if (enemyCard) {
                    const wi = enemyCard.getAttribute('data-wave-index');
                    const ei = enemyCard.getAttribute('data-enemy-index');
                    targetSelector = `.enemy-card[data-wave-index="${wi}"][data-enemy-index="${ei}"] [data-key="${key}"]`;
                } else if (waveCard) {
                    const wi = waveCard.getAttribute('data-wave-index');
                    targetSelector = `.wave-card[data-wave-index="${wi}"] [data-key="${key}"]`;
                }

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
                }, `Wave data updated: ${key} set to ${value}.`, targetSelector);
            });
        });
    };

    // --- Modification Functions ---

    /**
     * Adds a new wave (level) object to the end of the list.
     */
    const addWave = () => {
        const newIndex = getCurrentMap().levels.length;
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

        }, `New Wave ${getCurrentMap().levels.length + 1} added.`, `.wave-card[data-wave-index="${newIndex}"]`);
    };

    /**
     * Deletes an entire wave and re-indexes the remaining waves.
     * @param {number} waveIndex - The array index of the wave to delete.
     */
    const deleteWave = async (waveIndex, event) => {
        // At least one wave must always remain.
        if (getCurrentMap().levels.length <= 1) {
            showCursorWarning('There must always be at least one wave.', event);
            return;
        }

        // Get the wave level BEFORE deletion (for the history message)
        const waveLevel = getCurrentMap().levels[waveIndex].level;

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

        }, `Wave ${waveLevel} deleted and subsequent waves re-indexed.`, `.wave-card[data-wave-index="${waveIndex}"]`);
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
        
        const newEnemyIndex = (wave.enemies || []).length;
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

        }, `New enemy group added to Wave ${waveLevel}.`, `.enemy-card[data-wave-index="${waveIndex}"][data-enemy-index="${newEnemyIndex}"]`);
    };

    /**
     * Deletes an enemy spawn group from a specific wave.
     * @param {number} waveIndex - The array index of the wave to modify.
     * @param {number} enemyIndex - The array index of the enemy group to delete.
     */
    const deleteEnemyFromWave = async (waveIndex, enemyIndex, event) => {
        // Each wave must always keep at least one enemy group.
        const currentWave = getCurrentMap().levels[waveIndex];
        if ((currentWave.enemies || []).length <= 1) {
            showCursorWarning('Each wave must always have at least one enemy group.', event);
            return;
        }

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

        }, `Enemy group deleted from Wave ${waveLevel}.`, `.enemy-card[data-wave-index="${waveIndex}"][data-enemy-index="${enemyIndex}"]`); // Now uses waveLevel
    };

    /**
     * Removes a single enemy type with a safety check.
     */
    const removeEnemyType = async (typeToRemove, event) => {
        const currentTypes = getEnemyTypes();

        // Ensure at least one type remains
        if (currentTypes.length <= 1) {
            showCursorWarning('There must always be at least one enemy type.', event);
            return;
        }

        modifyJson((data) => {
            data.maps[0].enemyTypes = currentTypes.filter(t => t !== typeToRemove);
            renderEnemyTypeTags(); // This function is accessible because it's in the outer scope
            waveEditor.renderWaveRepeater(data.maps[0].levels);
            waveEditor.renderEffectsRepeater();
        }, `Removed enemy type: ${typeToRemove}`, '#enemyTypesTagsContainer');
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
            waveEditor.renderEffectsRepeater();
        }, `Reordered enemy types list.`, '#enemyTypesTagsContainer');

        handleDragEnd();
    }
    /* Grap enemy types */

    /**
     * Copies an entire wave (level) and all its enemy groups
     */
    const copyWave = (waveIndex) => {
        const newIndex = getCurrentMap().levels.length;
        modifyJson((data) => {
            const levels = data.maps[0].levels;
            const waveToCopy = levels[waveIndex];

            const newWave = JSON.parse(JSON.stringify(waveToCopy));

            // Auto-increment level number correctly
            const maxLevel = levels.length > 0 ? Math.max(...levels.map(w => w.level)) : 0;
            newWave.level = maxLevel + 1;

            levels.push(newWave);
            renderWaveRepeater(levels);
        }, `Wave copied as Level ${getCurrentMap().levels.length + 1}.`, `.wave-card[data-wave-index="${newIndex}"]`);
    };

    /**
     * Copies a single enemy group within a specific wave
     */
    const copyEnemyGroup = (waveIndex, enemyIndex) => {
        const newEnemyIndex = (getCurrentMap().levels[waveIndex]?.enemies || []).length;
        modifyJson((data) => {
            const levels = data.maps[0].levels;
            const wave = levels[waveIndex];
            const groupToCopy = wave.enemies[enemyIndex];

            const newGroup = JSON.parse(JSON.stringify(groupToCopy));
            wave.enemies.push(newGroup);

            renderWaveRepeater(levels);
        }, `Enemy group duplicated.`, `.enemy-card[data-wave-index="${waveIndex}"][data-enemy-index="${newEnemyIndex}"]`);
    };

    const availablePaths = getAvailablePaths();
    const pathDatalist = `
        <datalist id="path-list">
            ${availablePaths.map(p => `<option value="${p}">`).join('')}
        </datalist>
    `;

    /**
     * Gets the effects array, initializing it if missing.
     */
    const getEffects = () => {
        const map = getCurrentMap();
        if (!map.enemyEffects) {
            map.enemyEffects = []; // Initialize if missing
        }
        return map.enemyEffects;
    };

    /**
     * Renders the Effect Repeater (Type | Duration | Intensity)
     */
    const renderEffectsRepeater = () => {
        const effectsContainer = document.getElementById('enemy-effects-repeater');
        if (!effectsContainer) return;
        
        const effects = getEffects();
        const enemyTypes = getEnemyTypes();
        
        // Helper to build dropdown options
        const buildOptions = (selected) => {
            return enemyTypes.map(t => {
                const val = typeof t === 'string' ? t : t.id;
                return `<option value="${val}" ${val === selected ? 'selected' : ''}>${val}</option>`;
            }).join('');
        };
    
        // FIX: Clear the container first and handle the empty state explicitly
        if (effects.length === 0) {
            effectsContainer.innerHTML = '<p style="color:#888;">No effects defined. Click "Add New Effect" to start.</p>';
            return; // Now it updates the UI before returning
        }
    
        // Render the rows if effects exist
        effectsContainer.innerHTML = effects.map((effect, index) => `
            <div class="effect-row" data-index="${index}">
    
                <div class="flex-1">
                    <label>Enemy Type <i class="info-icon" data-tooltip="shake-effects.enemy-type">i</i></label>
                    <select onchange="window.app.waveEditor.updateEffect(${index}, 'type', this.value)" class="input-enemy-effect-type" style="width: 100%;">
                        ${buildOptions(effect.type)}
                    </select>
                </div>
    
                <div class="flex-1">
                    <label>Shake Duration (ms) <i class="info-icon" data-tooltip="shake-effects.shake-duration">i</i></label>
                    <input type="text" inputmode="numeric" class="input-thousands" value="${formatNumber(effect.shakeDuration || 0)}"
                           onchange="window.app.waveEditor.updateEffect(${index}, 'shakeDuration', this.value)">
                </div>
    
                <div class="flex-1">
                    <label>Shake Intensity (px) <i class="info-icon" data-tooltip="shake-effects.shake-intensity">i</i></label>
                    <input type="text" inputmode="decimal" class="input-thousands" value="${formatNumber(effect.shakeIntensity || 0)}"
                           onchange="window.app.waveEditor.updateEffect(${index}, 'shakeIntensity', this.value)">
                </div>
    
                <button class="btn btn-delete" onclick="window.app.waveEditor.deleteEffect(${index})">X</button>
            </div>
        `).join('');
    };

    /**
     * Adds a new blank effect entry
     */
    const addEffect = () => {
        const newIndex = (getCurrentMap().enemyEffects || []).length;
        modifyJson((data) => {
            if (!data.maps[0].enemyEffects) data.maps[0].enemyEffects = [];

            // Default to the first available enemy type
            const defaultType = getEnemyTypes()[0];
            const typeId = typeof defaultType === 'string' ? defaultType : defaultType.id;

            data.maps[0].enemyEffects.push({
                type: typeId,
                shakeDuration: 1000,
                shakeIntensity: 5
            });

            renderEffectsRepeater();
        }, "Added new enemy effect.", `#enemy-effects-repeater .effect-row[data-index="${newIndex}"]`, '#enemy-effects-repeater');
    };

    /**
     * Updates a specific property of an effect
     */
    const updateEffect = (index, key, value) => {
        modifyJson((data) => {
            if (!data.maps[0].enemyEffects) data.maps[0].enemyEffects = [];
            const effect = data.maps[0].enemyEffects[index];

            if (effect) {
                // Convert to number if it's shake data
                const val = (key === 'shakeDuration' || key === 'shakeIntensity') ? parseThousands(value) : value;
                effect[key] = val || 0;
            }
        }, `Updated effect ${key}`, `#enemy-effects-repeater .effect-row[data-index="${index}"]`, '#enemy-effects-repeater');

        // FIX: Re-render so the UI matches the data immediately
        waveEditor.renderEffectsRepeater();
    };
    /**
     * Deletes an effect entry
     */
    const deleteEffect = (index) => {
        modifyJson((data) => {
            data.maps[0].enemyEffects.splice(index, 1);
            renderEffectsRepeater();
        }, "Deleted enemy effect.", `#enemy-effects-repeater .effect-row[data-index="${index}"]`, '#enemy-effects-repeater');
    };

    /* Custom Enemy Damage */
    /**
     * Gets the enemy damage array, initializing it if missing.
     */
    const getEnemyDamage = () => {
        const map = getCurrentMap();
        if (!map.enemyDamage) {
            map.enemyDamage = []; 
        }
        return map.enemyDamage;
    };

    /**
     * Renders the Custom Damage Repeater (Type | Damage)
     */
    // Add these functions inside the waveEditor module
    const renderDamageRepeater = () => {
        const container = document.getElementById('enemy-damage-repeater');
        const map = getCurrentMap();
        const damageList = map.enemyDamage || [];
        const enemyTypes = getEnemyTypes(); // Helper to get existing enemy types

        if (damageList.length === 0) {
            container.innerHTML = '<p style="color:#888; padding: 10px;">No custom damage rules defined.</p>';
            return;
        }

        container.innerHTML = damageList.map((entry, index) => `
            <div class="effect-row flex items-center gap-2 mb-2" data-index="${index}">
                <div class="flex-1">
                    <label class="block text-xs">Enemy Type <i class="info-icon" data-tooltip="custom-enemy-damage.enemy-type">i</i></label>
                    <select class="enemy-custom-damage-row" onchange="window.app.waveEditor.updateEnemyDamage(${index}, 'type', this.value)">
                        ${enemyTypes.map(type => `<option value="${type}" ${type === entry.type ? 'selected' : ''}>${type}</option>`).join('')}
                    </select>
                </div>
                <div class="flex-1">
                    <label class="block text-xs">Damage <i class="info-icon" data-tooltip="custom-enemy-damage.damage">i</i></label>
                    <input type="text" inputmode="numeric" class="w-full p-1 input-thousands" value="${formatNumber(entry.damage || 1)}"
                           onchange="window.app.waveEditor.updateEnemyDamage(${index}, 'damage', this.value)">
                </div>
                <button class="btn btn-delete bg-red-500 p-1 text-white" onclick="window.app.waveEditor.deleteEnemyDamage(${index})">X</button>
            </div>
        `).join('');
        if (damageList.length === 0) {
            container.innerHTML = '<p style="color:#888;">No custom damage rules defined. Click "Add Custom Damage" to start.</p>';
            return; // Now it updates the UI before returning
        }
    };

    const addEnemyDamage = () => {
        const newIndex = (getCurrentMap().enemyDamage || []).length;
        modifyJson((data) => {
            if (!data.maps[0].enemyDamage) data.maps[0].enemyDamage = [];
            data.maps[0].enemyDamage.push({ type: "basic", damage: 1 });
        }, "Added custom enemy damage rule", `#enemy-damage-repeater .effect-row[data-index="${newIndex}"]`, '#enemy-damage-repeater');
        renderDamageRepeater();
    };

    const updateEnemyDamage = (index, key, value) => {
        modifyJson((data) => {
            if (!data.maps[0].enemyDamage) return;
            const val = key === 'damage' ? parseThousands(value) : value;
            data.maps[0].enemyDamage[index][key] = val;

            renderDamageRepeater();
        }, `Updated enemy damage ${key}`, `#enemy-damage-repeater .effect-row[data-index="${index}"]`, '#enemy-damage-repeater');
    };

    const deleteEnemyDamage = (index) => {
        modifyJson((data) => {
            data.maps[0].enemyDamage.splice(index, 1);
        }, "Deleted enemy damage rule", `#enemy-damage-repeater .effect-row[data-index="${index}"]`, '#enemy-damage-repeater');
        renderDamageRepeater();
    };
    /* Custom Enemy Damage */

    return {
        renderWaveRepeater,
        renderEffectsRepeater,
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
        handleDrop,
        addEffect,
        updateEffect,
        deleteEffect,
        renderDamageRepeater,
        addEnemyDamage,
        updateEnemyDamage,
        deleteEnemyDamage
    };
})();