import { currentLevelData, updateCurrentLevelData, newWaveStructure, newAbilityStructure } from './level_data.js';
import { recordHistory } from './editor_history.js';
import { formatNumber } from './number_format.js';
import { isStepperHoldActive } from './JsonStepper.js';

// The 'modules' object is the single source for references to all external components (editors, setStatus, etc.)
let modules = {};

// --- Custom Confirmation Utility ---
// References for the new popup elements (ensure these are in your HTML)
const confirmPopup = document.getElementById('customConfirmPopup');
const popupTitle = document.getElementById('popupTitle');
const popupMessage = document.getElementById('popupMessage');
const confirmButton = document.getElementById('confirmActionButton');
const cancelButton = document.getElementById('cancelActionButton');

let resolvePromise = null; 

if (confirmPopup) {
    // Add event listeners once
    confirmButton.addEventListener('click', () => {
        confirmPopup.classList.add('d-none');
        // Resolve the stored promise with true
        if (resolvePromise) {
            resolvePromise(true);
            resolvePromise = null; // Clear after resolution
        }
    });

    cancelButton.addEventListener('click', () => {
        confirmPopup.classList.add('d-none');
        // Resolve the stored promise with false
        if (resolvePromise) {
            resolvePromise(false);
            resolvePromise = null; // Clear after resolution
        }
    });

    // Enter DELETING confirm
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (confirmPopup && !confirmPopup.classList.contains('d-none')) {
                event.preventDefault(); 
                confirmButton.click();
            }
        }
    });
}

/**
 * Shows a custom confirmation dialog.
 * @param {string} title - The title for the popup.
 * @param {string} message - The message body.
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise.
 */
export function customConfirm(title, message) {
    if (!confirmPopup) {
        // Fallback if HTML structure is missing
        console.warn("Custom confirmation HTML not found. Falling back to native confirm.");
        return Promise.resolve(window.confirm(message));
    }
    
    return new Promise(resolve => {
        // FIX 2: Assign the local resolve function to the global resolvePromise variable.
        resolvePromise = resolve; 
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        confirmPopup.classList.remove('d-none');
    });
}

// --- Cursor Warning Utility ---
// A brief floating message anchored near the mouse cursor, used when a blocked action
// (e.g. deleting the last remaining wave) needs to explain itself right where the user
// clicked, instead of a modal confirm or the general status bar.
let cursorWarningEl = null;
let cursorWarningTimeout = null;

export function showCursorWarning(message, event) {
    if (!cursorWarningEl) {
        cursorWarningEl = document.createElement('div');
        cursorWarningEl.className = 'cursor-warning-tooltip';
        document.body.appendChild(cursorWarningEl);
    }

    cursorWarningEl.textContent = message;

    const x = (event && typeof event.clientX === 'number') ? event.clientX : window.innerWidth / 2;
    const y = (event && typeof event.clientY === 'number') ? event.clientY : window.innerHeight / 2;
    cursorWarningEl.style.left = `${x}px`;
    cursorWarningEl.style.top = `${y}px`;

    // Restart the fade-in even if a previous warning is still showing.
    cursorWarningEl.classList.remove('is-visible');
    void cursorWarningEl.offsetWidth;
    cursorWarningEl.classList.add('is-visible');

    clearTimeout(cursorWarningTimeout);
    cursorWarningTimeout = setTimeout(() => {
        cursorWarningEl.classList.remove('is-visible');
    }, 1800);
}

/**
 * Stores references to the UI editor modules and utility functions.
 */
export function setModuleReferences(refs) {
    modules = refs;
}

/**
 * Creates a custom JSON string with compact formatting for the 'layout' array.
 */
export function formatCompactLayout(jsonObject) {
    let compactLayoutContent = null;
    const innerContentIndent = ' '.repeat(14); 

    // 1. Convert the JSON object to a string using a replacer
    let jsonString = JSON.stringify(jsonObject, (key, value) => {
        if (key === 'layout' && Array.isArray(value)) {
            // 2. If the value is the 'layout' array, generate the compact, multiline content
            compactLayoutContent = value.map(row => {
                // Creates ["X","O","-",...]
                return '[' + row.map(tile => `"${tile}"`).join(',') + ']';
            }).join(`,\n${innerContentIndent}`); 
            
            // Return a simple marker that JSON.stringify will quote and escape
            return "__COMPACT_LAYOUT_MARKER__";
        }
        return value;
    }, 2); 

    // 3. Replace the quoted/escaped marker with the actual compact content.
    if (compactLayoutContent) {
        jsonString = jsonString.replace(
            /"__COMPACT_LAYOUT_MARKER__"/, 
            () => {
                return `[\n${innerContentIndent}${compactLayoutContent}\n${' '.repeat(10)}]`;
            }
        );
    }
    
    return jsonString;
}

/**
 * Executes a modification function on the currentLevelData object 
 * and updates the editor with the new, compactly formatted JSON.
 */
export function modifyJson(modifyFn, successMessage, historySection = null) {

    // 0. Snapshot the state as it was BEFORE this change, for Undo. Skipped when
    // historySection is null (e.g. internal syncs that aren't real user edits).
    recordHistory(historySection);

    // 1. Run the modification function on the clean object
    modifyFn(currentLevelData);
    
    // 2. Update the map_size description field based on the new layout size
    const layout = currentLevelData.maps[0].layout;
    const width = layout.length > 0 ? layout[0].length : 0;
    const height = layout.length;
    currentLevelData.maps[0].description[0].map_size = `${width}x${height}`;
    currentLevelData.maps[0].description[0]["level count"] = currentLevelData.maps[0].levels.length;
    currentLevelData.maps[0].description[0]["tower types"] = Object.keys(currentLevelData.maps[0].towerTypes || {}).length;
    currentLevelData.maps[0].description[0]["abilites"] = currentLevelData.maps[0].abilities.map(x=>x.name+x.ui.icon).join(", ");

    // 3. Re-stringify using the custom compact formatter and update the textarea
    const formattedJson = formatCompactLayout(currentLevelData);
    modules.editor.value = formattedJson;
    modules.setStatus(successMessage);
    
    // 4. Rerender all components after modification (especially important if map changed)
    if (modules.mapEditor && typeof modules.mapEditor.renderMap === 'function') {
        modules.mapEditor.renderMap(currentLevelData.maps[0].layout);
    }
    // Refresh the always-visible Map Preview panel too — cheap enough to redo on every
    // commit (tower/wave/ability edits included), and only actual layout edits change what
    // it draws. Deliberately hooked here (not in editor_map.js's renderMap) so it does NOT
    // redraw on every mousemove during a live brush-drag, only once per committed change.
    if (modules.mapPreview && typeof modules.mapPreview.renderMapPreview === 'function') {
        modules.mapPreview.renderMapPreview();
    }
    // These three rebuild their whole innerHTML on every single call - fine normally,
    // but while a JsonStepper hold is running (isStepperHoldActive()) that would tear
    // down the exact input/button the hold is running on, orphaning its repeat timer
    // after just one step. Skip them for the gesture's duration; JsonStepper fires its
    // RELEASE_EVENT on release, which each editor listens for to catch up with one
    // rebuild once it's safe to.
    if (!isStepperHoldActive()) {
        if (modules.towerEditor && typeof modules.towerEditor.renderTowerRepeater === 'function') {
            modules.towerEditor.renderTowerRepeater(currentLevelData.maps[0].towerTypes || {});
        }
        if (modules.waveEditor && typeof modules.waveEditor.renderWaveRepeater === 'function') {
            modules.waveEditor.renderWaveRepeater(currentLevelData.maps[0].levels || []);
        }
        if (modules.abilityEditor && typeof modules.abilityEditor.renderAbilityRepeater === 'function') {
            modules.abilityEditor.renderAbilityRepeater(currentLevelData.maps[0].abilities || []);
        }
    }
    // ✅ Ensure basic info fields (like extra life) refresh after any change
    updateBasicInfoUI();

    // FIX 3: Return a resolved Promise to support async/await from caller functions (like deleteTower/deleteAbility).
    return Promise.resolve(true);
}

/**
 * Parses JSON from the editor, updates the central data, and triggers all necessary UI re-renders.
 */
export function updateMapFromEditor() {
    // 1. Get editor reference and JSON string
    const editor = modules.editor;
    if (!editor) return;
    
    const jsonString = editor.value.trim();
    if (!jsonString) {
        modules.setStatus('Editor is empty. No update performed.', true);
        return;
    }

    try {
        const newData = JSON.parse(jsonString);
        
        // Safety check
        if (!newData.maps || newData.maps.length === 0) {
             modules.setStatus('Error: JSON must contain a "maps" array.', true);
             return;
        }

        // 2. Update Central Data Source
        const updateSuccess = updateCurrentLevelData(newData);
        if (!updateSuccess) {
            modules.setStatus('Error: Failed to update internal data structure.', true);
            return;
        }

        // 2.5 UpdateBasicUiInfo
        updateBasicInfoUI();
        
        const mapData = currentLevelData.maps[0]; 

        // 3. Trigger All UI Re-renders
        
        // A. Map Editor
        // This is a wholesale data replacement (pasted/edited JSON), not an incremental
        // tile paint, so force a full rebuild of the GameMap rendering instance — otherwise
        // renderMap() only updates the in-memory grid and the canvas keeps showing the
        // previously prerendered layers (road/grass/water/decorations) untouched.
        if (modules.mapEditor && typeof modules.mapEditor.resetEditorMap === 'function') {
            modules.mapEditor.resetEditorMap();
        }
        if (modules.mapEditor && typeof modules.mapEditor.renderMap === 'function') {
            modules.mapEditor.renderMap(mapData.layout || []);
        }
        if (modules.mapPreview && typeof modules.mapPreview.renderMapPreview === 'function') {
            modules.mapPreview.renderMapPreview();
        }

        // B. Tower Editor
        if (modules.towerEditor && typeof modules.towerEditor.renderTowerRepeater === 'function') {
            modules.towerEditor.renderTowerRepeater(mapData.towerTypes || {});
        }

        // C. Wave Editor
        if (modules.waveEditor && typeof modules.waveEditor.renderWaveRepeater === 'function') {
            modules.waveEditor.renderWaveRepeater(mapData.levels || []);
            
            if (modules.waveEditor.updateEnemyTypesEditor) {
                modules.waveEditor.updateEnemyTypesEditor();
            }

            if (typeof modules.waveEditor.renderEffectsRepeater === 'function') {
                modules.waveEditor.renderEffectsRepeater();
            }
            
            if (typeof modules.waveEditor.renderDamageRepeater === 'function') {
                modules.waveEditor.renderDamageRepeater();
            }
        }
        
        // D. Ability Editor
        if (modules.abilityEditor && typeof modules.abilityEditor.renderAbilityRepeater === 'function') {
            modules.abilityEditor.renderAbilityRepeater(mapData.abilities || []);
        }

        // E. Map information
        let mapTitle = mapData.name;
        let mapStartingCoins = mapData.startingCoins;
        let mapstartingLifes = mapData.startingLifes;
        let mapDescription = mapData.description[0].descriptionText;
        let mapTileSize = mapData.tileSize;
        let mapDifficulty = mapData.description[0].difficulty;

        document.querySelector("#mapNameInput").value = mapTitle;
        document.querySelector("#startingCoinsInput").value = formatNumber(mapStartingCoins);
        document.querySelector("#startingLifesInput").value = formatNumber(mapstartingLifes);
        document.querySelector("#descriptionTextInput").value = mapDescription;
        document.querySelector("#tileSizeInput").value = mapTileSize;
        document.querySelector("#difficultyInput").value = mapDifficulty;
        // 4. Success Message
        modules.setStatus('Configuration updated successfully!', false);

    } catch (error) {
        // Handle JSON parsing error
        modules.setStatus('Error: Invalid JSON format. Check console for details.', true);
        console.error('JSON Parsing Error:', error);
    }
}


// --- Editor Action Functions ---

/**
 * Validates the JSON, formats it, updates the textarea, and copies it to the clipboard.
 */
export function copyFormattedJson() {
    const formattedJson = formatCompactLayout(currentLevelData);
    modules.editor.value = formattedJson;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(formattedJson).then(() => {
            modules.setStatus('JSON formatted and copied to clipboard successfully!');
        }).catch(() => {
            modules.editor.select();
            document.execCommand('copy');
            modules.setStatus('Copy failed. JSON formatted and selected. Copy manually!', true);
        });
    } else {
          modules.editor.select();
          document.execCommand('copy');
          modules.setStatus('JSON formatted and selected. Copy manually!', true);
    }
}

/**
 * Adds a new wave (level) object.
 */
export function addWave() {
    // Calculate the next level number based on current data
    const levels = currentLevelData.maps[0].levels;
    const nextLevel = levels.length > 0 ? levels[levels.length - 1].level + 1 : 1;

    modifyJson((data) => {
        
        const newWave = JSON.parse(JSON.stringify(newWaveStructure)); 
        newWave.level = nextLevel;
        
        data.maps[0].levels.push(newWave);
    }, `Wave added! (Now level ${nextLevel})`, 'wave');
}

/**
 * Adds a new ability object.
 */
export function addAbility() {
    modifyJson((data) => {
        const abilities = data.maps[0].abilities;
        const newAbility = JSON.parse(JSON.stringify(newAbilityStructure));
        
        // FIX 4: Add unique ID and name generation logic for new abilities
        const newIndex = abilities.length;
        newAbility.id = `new_ability_${newIndex + 1}`;
        newAbility.name = `New Ability ${newIndex + 1}`;
        
        abilities.push(newAbility);

    }, `Ability "New Ability" added!`, 'ability');
}

export function updateUIFromLoadedData() {
    // Safety check to ensure all necessary modules are loaded
    if (!currentLevelData || !modules.mapEditor || !modules.towerEditor || !modules.waveEditor || !modules.abilityEditor) {
        console.error("UI Update Failed: Missing data or editor module references.");
        return;
    }
    
    const mapData = currentLevelData.maps[0];
    
    // 1. Map Editor Update (Renders the new grid layout)
    // Wholesale data replacement (Undo/Redo, loaded map) — force a full rebuild of the
    // GameMap rendering instance so the prerendered layers (road/grass/water/decorations)
    // actually reflect the restored grid instead of only updating the in-memory grid.
    if (modules.mapEditor.resetEditorMap) {
        modules.mapEditor.resetEditorMap();
    }
    if (modules.mapEditor.renderMap) {
        modules.mapEditor.renderMap(mapData.layout);
    }
    if (modules.mapPreview && modules.mapPreview.renderMapPreview) {
        modules.mapPreview.renderMapPreview();
    }

    // 2. Tower Editor Update (Renders the new tower list)
    if (modules.towerEditor.renderTowerRepeater) {
        modules.towerEditor.renderTowerRepeater(mapData.towerTypes);
    }
    
    // 3. Wave Editor Update (Renders the new wave list and enemy dropdowns)
    if (modules.waveEditor.renderWaveRepeater) {
        modules.waveEditor.renderWaveRepeater(mapData.levels);
        
        // This is the specific fix for the enemy types input field
        if (modules.waveEditor.updateEnemyTypesEditor) {
            modules.waveEditor.updateEnemyTypesEditor();
        }

        if (modules.waveEditor.renderEffectsRepeater) {
            modules.waveEditor.renderEffectsRepeater();
        }

        if (modules.waveEditor.renderDamageRepeater) {
            modules.waveEditor.renderDamageRepeater();
        }
    }

    // 4. Ability Editor Update (Renders the new ability list)
    if (modules.abilityEditor.renderAbilityRepeater) {
        modules.abilityEditor.renderAbilityRepeater(mapData.abilities);
    }

    // 5. JSON Editor Update (to reflect the new, clean data structure)
    if (modules.editor && modules.editor.value !== undefined) {
        modules.editor.value = formatCompactLayout(currentLevelData);
    }

    updateBasicInfoUI();

    modules.setStatus("Editor UI successfully synced with loaded map data.");
}

// --- BASIC INFO EDITOR FUNCTIONS ---

/**
 * Updates top-level map properties (name, startingCoins, startingLifes).
 * Called by the HTML inputs (e.g., onchange="...updateBasicInfo(...)")
 */
const BASIC_INFO_INPUT_IDS = {
    name: 'mapNameInput',
    startingCoins: 'startingCoinsInput',
    startingLifes: 'startingLifesInput',
    tileSize: 'tileSizeInput',
};

export function updateBasicInfo(key, value) {
    modifyJson((data) => {
        data.maps[0][key] = value;
    }, `Map property '${key}' updated to ${value}.`, {
        section: 'basic',
        selector: BASIC_INFO_INPUT_IDS[key] ? `#${BASIC_INFO_INPUT_IDS[key]}` : null,
    });
}

/**
 * Updates properties inside the description array (descriptionText, difficulty).
 * Called by the HTML inputs.
 */
const DESCRIPTION_INPUT_IDS = {
    descriptionText: 'descriptionTextInput',
    difficulty: 'difficultyInput',
};

export function updateDescription(key, value) {
    modifyJson((data) => {
        // Ensure description array exists
        if (!data.maps[0].description) data.maps[0].description = [{}];

        data.maps[0].description[0][key] = value;
    }, `Description '${key}' updated.`, {
        section: 'basic',
        selector: DESCRIPTION_INPUT_IDS[key] ? `#${DESCRIPTION_INPUT_IDS[key]}` : null,
    });
}

/**
 * SYNC UI FROM DATA: Populates the Basic Info inputs using the current JSON data.
 * This is called when you load/paste JSON or when data changes.
 */
export function updateBasicInfoUI() {
    // 1. Get the current data
    const map = currentLevelData.maps[0];
    const desc = (map.description && map.description[0]) ? map.description[0] : {};

    // 2. Helper to safely set input values by ID
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val !== undefined && val !== null) ? val : "";
    };

    // 3. Update Editable Inputs (Top-level)
    setVal('mapNameInput', map.name);
    setVal('startingCoinsInput', formatNumber(map.startingCoins));
    setVal('startingLifesInput', formatNumber(map.startingLifes));
    setVal('tileSizeInput', map.tileSize); // Read-only in your HTML, but good to set

    // 4. Update Description Inputs
    setVal('descriptionTextInput', desc.descriptionText);
    setVal('difficultyInput', desc.difficulty);

    // 5. Update Read-Only Metadata (Calculated Counts)
    setVal('mapSizeDisplay', desc.map_size || "-");
    setVal('levelCountDisplay', desc["level count"] || 0);
    setVal('towerTypesDisplay', desc["tower types"] || 0);
    setVal('abilitiesDisplay', desc.abilites || "-");

    // --- IMPROVED EXTRA LIFE LOGIC ---
    const extraLifeCb = document.getElementById('extraLifeCheckbox');

    // 1. Determine Logic: Default to TRUE if undefined
    const isExtraLifeEnabled = (map.extraLife !== undefined) ? map.extraLife : true;

    // 2. Update UI Elements
    if (extraLifeCb) {
        extraLifeCb.checked = isExtraLifeEnabled;
    }

    // 3. Price progression is now edited as reorderable boxes, not a text field.
    renderExtraLifePriceTags();
    // ---------------------------------
}

/**
 * Reads the 'extraLifePrices' array from the current map data.
 * @returns {Array<number>} A shallow copy of the price progression.
 */
function getExtraLifePrices() {
    return (currentLevelData.maps[0].extraLifePrices || []).slice();
}

/**
 * Renders the small draggable boxes for the Extra Life price progression
 * (same interaction pattern as the Enemy Types List tags).
 */
function renderExtraLifePriceTags() {
    const container = document.getElementById('extraLifePricesTagsContainer');
    if (!container) return;

    const map = currentLevelData.maps[0];
    const isEnabled = (map.extraLife !== undefined) ? map.extraLife : true;
    const prices = getExtraLifePrices();

    container.innerHTML = prices.map((price, index) => `
        <div class="enemy-tag price-tag"
             draggable="true"
             data-index="${index}"
             ondragstart="window.app.jsonFunctions.handlePriceDragStart(event)"
             ondragover="window.app.jsonFunctions.handlePriceDragOver(event)"
             ondragenter="window.app.jsonFunctions.handlePriceDragEnter(event)"
             ondragleave="window.app.jsonFunctions.handlePriceDragLeave(event)"
             ondragend="window.app.jsonFunctions.handlePriceDragEnd(event)"
             ondrop="window.app.jsonFunctions.handlePriceDrop(event)">
            <span class="drag-handle"></span>
            <span class="tag-text">🪙${price}</span>
            <button class="btn-remove-tag" onclick="window.app.jsonFunctions.removeExtraLifePrice(${index})">&times;</button>
        </div>
    `).join('');

    const addInput = document.getElementById('newExtraLifePriceInput');
    const addBtn = document.getElementById('add-extra-life-price-button');
    if (addInput) addInput.disabled = !isEnabled;
    if (addBtn) addBtn.disabled = !isEnabled;
    container.classList.toggle('is-disabled', !isEnabled);
}

/**
 * Adds a single new price to the end of the progression.
 */
export function addNewExtraLifePrice() {
    const input = document.getElementById('newExtraLifePriceInput');
    if (!input) return;

    // Negative values are allowed on purpose — that step in the progression pays the
    // player money instead of charging them.
    const value = parseInt(input.value, 10);
    if (isNaN(value)) {
        modules.setStatus('Enter a valid whole number price.', true);
        return;
    }

    modifyJson((data) => {
        if (!Array.isArray(data.maps[0].extraLifePrices)) data.maps[0].extraLifePrices = [];
        data.maps[0].extraLifePrices.push(value);
    }, `Added extra life price: ${value}`, { section: 'basic', selector: '#extraLifePricesTagsContainer' });

    input.value = '';
}

/**
 * Removes a single price from the progression by its index.
 */
export function removeExtraLifePrice(index) {
    const prices = getExtraLifePrices();
    if (index < 0 || index >= prices.length) return;
    const removed = prices[index];

    modifyJson((data) => {
        data.maps[0].extraLifePrices.splice(index, 1);
    }, `Removed extra life price: ${removed}`, { section: 'basic', selector: '#extraLifePricesTagsContainer' });
}

/* Drag-to-reorder for the Extra Life price boxes (mirrors the Enemy Types List logic). */
let draggedPriceIndex = null;

export function handlePriceDragStart(e) {
    const target = e.target.closest('.price-tag');
    draggedPriceIndex = parseInt(target.getAttribute('data-index'));
    target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedPriceIndex);
}

export function handlePriceDragEnter(e) {
    const target = e.target.closest('.price-tag');
    if (target && parseInt(target.getAttribute('data-index')) !== draggedPriceIndex) {
        target.classList.add('drag-over');
    }
}

export function handlePriceDragLeave(e) {
    const target = e.target.closest('.price-tag');
    if (target) target.classList.remove('drag-over');
}

export function handlePriceDragOver(e) {
    e.preventDefault();
    return false;
}

export function handlePriceDragEnd() {
    document.querySelectorAll('.price-tag').forEach(t => t.classList.remove('dragging', 'drag-over'));
    draggedPriceIndex = null;
}

export function handlePriceDrop(e) {
    e.preventDefault();
    const target = e.target.closest('.price-tag');
    if (!target || draggedPriceIndex === null) { handlePriceDragEnd(); return; }

    const targetIndex = parseInt(target.getAttribute('data-index'));
    if (draggedPriceIndex === targetIndex) { handlePriceDragEnd(); return; }

    const fromIndex = draggedPriceIndex; // capture before handlePriceDragEnd() clears it
    modifyJson((data) => {
        const prices = data.maps[0].extraLifePrices || [];
        const [moved] = prices.splice(fromIndex, 1);
        prices.splice(targetIndex, 0, moved);
        data.maps[0].extraLifePrices = prices;
    }, `Reordered extra life prices.`, { section: 'basic', selector: '#extraLifePricesTagsContainer' });

    handlePriceDragEnd();
}

// --- NEW EXPORT UTILITIES ---

/**
 * Handles the actual file download using the Blob and Anchor Tag API.
 * @param {string} data The content to be downloaded (e.g., JSON string).
 * @param {string} filename The name of the file (e.g., 'map.json').
 * @param {string} mimeType The MIME type of the content (e.g., 'application/json').
 */
function downloadFile(data, filename, mimeType) {
    // 1. Create a Blob object from the data string
    const blob = new Blob([data], { type: mimeType });

    // 2. Create a local URL for the Blob
    const url = URL.createObjectURL(blob);

    // 3. Create a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // Set the desired filename

    // 4. Trigger the download and clean up
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Release the temporary Blob URL
}

/**
 * EXPORT DATA: Gets the current map data, formats it compactly, and triggers a download.
 */
export function exportLevelData() {
    try {
        // 1. Get the current, clean data object
        const data = currentLevelData;
        
        // 2. Format the data into a compact, downloadable JSON string
        // We use your existing formatCompactLayout for consistency with copyFormattedJson
        const jsonString = formatCompactLayout(data);

        // 3. Determine the filename based on the map's name
        // Clean the map name (e.g., "My Awesome Map" -> "my_awesome_map")
        const mapName = data.maps[0].name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'exported_map';
        const filename = `${mapName}.json`;
        
        // 4. Trigger the download
        downloadFile(jsonString, filename, 'application/json');

        // 5. Provide user feedback using the module reference
        modules.setStatus(`Map exported successfully as "${filename}".`);
        
    } catch (error) {
        console.error("Export failed:", error);
        // Use the imported setStatus from the modules reference
        modules.setStatus(`Export FAILED. Check the console for errors.`, true); 
    }
}

/**
 * Updates the 'extraLife' boolean.
 */
// In js/level_editor/json_functions.js
export function updateExtraLife(isChecked) {
    // Box enable/disable and any default-price fill-in are handled by
    // renderExtraLifePriceTags(), called via updateBasicInfoUI() below.
    modifyJson((data) => {
        data.maps[0].extraLife = isChecked;

        // If checked but no prices exist yet, write sensible defaults immediately
        if (isChecked && (!data.maps[0].extraLifePrices || data.maps[0].extraLifePrices.length === 0)) {
            data.maps[0].extraLifePrices = [10, 25, 50, 75, 100, 150, 200];
        }
    }, `Extra Life enabled set to ${isChecked}.`, { section: 'basic', selector: '#extraLifeCheckbox' });
}

/**
 * Scans the current map layout and returns all possible S-E path combinations.
 * Returns an array like ["S1E1", "S1E2", "S2E1", ...]
 */
export function getAvailablePaths() {
    if (!currentLevelData || !currentLevelData.maps[0]) return [];
    
    const layout = currentLevelData.maps[0].layout;
    const starts = new Set();
    const ends = new Set();

    layout.forEach(row => {
        row.forEach(tile => {
            if (typeof tile === 'string') {
                if (/^S\d+$/.test(tile)) starts.add(tile);
                if (/^E\d+$/.test(tile)) ends.add(tile);
            }
        });
    });

    const numericSort = (a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10);

    const paths = [];
    const sortedStarts = Array.from(starts).sort(numericSort);
    const sortedEnds = Array.from(ends).sort(numericSort);

    sortedStarts.forEach(s => {
        sortedEnds.forEach(e => {
            paths.push(`${s}${e}`);
        });
    });

    return paths;
}

/* ------------------------------------------ */
/* ------------ SHARE LINK LOGIC ------------ */
/* ------------------------------------------ */
/**
 * Hashes the current map data: Minify -> Gzip -> Base64
 */
export async function generateShareLink() {
    try {
        const jsonString = JSON.stringify(currentLevelData);
        
        // 1. Compress using Gzip (Deflate)
        const blob = new Blob([jsonString]);
        const compressionStream = blob.stream().pipeThrough(new CompressionStream('gzip'));
        const compressedResponse = new Response(compressionStream);
        const compressedBuffer = await compressedResponse.arrayBuffer();

        // 2. Convert Buffer to Base64 (URL Safe)
        const base64String = btoa(String.fromCharCode(...new Uint8Array(compressedBuffer)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // 3. Create URL and copy to clipboard
        const shareUrl = `${window.location.origin}${window.location.pathname.replace('level_editor.html', 'index.html')}?customMap=${base64String}`;
        
        await navigator.clipboard.writeText(shareUrl);
        modules.setStatus("Share link copied to clipboard!");
        
    } catch (err) {
        console.error("Hashing failed:", err);
        modules.setStatus("Failed to generate link.", true);
    }
}
/* ------------------------------------------ */
/* ------------ SHARE LINK LOGIC ------------ */
/* ------------------------------------------ */