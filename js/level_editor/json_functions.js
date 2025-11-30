import { currentLevelData, updateCurrentLevelData, newWaveStructure, newAbilityStructure } from './level_data.js';

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
export function modifyJson(modifyFn, successMessage) {
    
    // 1. Run the modification function on the clean object
    modifyFn(currentLevelData);
    
    // 2. Update the map_size description field based on the new layout size
    const layout = currentLevelData.maps[0].layout;
    const width = layout.length > 0 ? layout[0].length : 0;
    const height = layout.length;
    currentLevelData.maps[0].description[0].map_size = `${width}x${height}`;

    // 3. Re-stringify using the custom compact formatter and update the textarea
    const formattedJson = formatCompactLayout(currentLevelData);
    modules.editor.value = formattedJson;
    modules.setStatus(successMessage);
    
    // 4. Rerender all components after modification (especially important if map changed)
    if (modules.mapEditor && typeof modules.mapEditor.renderMap === 'function') {
        modules.mapEditor.renderMap(currentLevelData.maps[0].layout);
    }
    if (modules.towerEditor && typeof modules.towerEditor.renderTowerRepeater === 'function') {
        modules.towerEditor.renderTowerRepeater(currentLevelData.maps[0].towerTypes || {});
    }
    if (modules.waveEditor && typeof modules.waveEditor.renderWaveRepeater === 'function') {
        modules.waveEditor.renderWaveRepeater(currentLevelData.maps[0].levels || []);
    }
    if (modules.abilityEditor && typeof modules.abilityEditor.renderAbilityRepeater === 'function') {
        modules.abilityEditor.renderAbilityRepeater(currentLevelData.maps[0].abilities || []);
    }
    
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
        
        const mapData = currentLevelData.maps[0]; 

        // 3. Trigger All UI Re-renders
        
        // A. Map Editor 
        if (modules.mapEditor && typeof modules.mapEditor.renderMap === 'function') {
            modules.mapEditor.renderMap(mapData.layout || []);
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
        }
        
        // D. Ability Editor
        if (modules.abilityEditor && typeof modules.abilityEditor.renderAbilityRepeater === 'function') {
            modules.abilityEditor.renderAbilityRepeater(mapData.abilities || []);
        }

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
    }, `Wave added! (Now level ${nextLevel})`); 
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
        
    }, `Ability "New Ability" added!`);
}

export function updateUIFromLoadedData() {
    // Safety check to ensure all necessary modules are loaded
    if (!currentLevelData || !modules.mapEditor || !modules.towerEditor || !modules.waveEditor || !modules.abilityEditor) {
        console.error("UI Update Failed: Missing data or editor module references.");
        return;
    }
    
    const mapData = currentLevelData.maps[0];
    
    // 1. Map Editor Update (Renders the new grid layout)
    if (modules.mapEditor.renderMap) {
        modules.mapEditor.renderMap(mapData.layout);
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
    }

    // 4. Ability Editor Update (Renders the new ability list)
    if (modules.abilityEditor.renderAbilityRepeater) {
        modules.abilityEditor.renderAbilityRepeater(mapData.abilities);
    }

    // 5. JSON Editor Update (to reflect the new, clean data structure)
    if (modules.editor && modules.editor.value !== undefined) {
        modules.editor.value = formatCompactLayout(currentLevelData);
    }
    
    modules.setStatus("Editor UI successfully synced with loaded map data.");
}

// --- Placeholder for the File Loading Logic (Example of how to use the function) ---
export function handleFileLoad(newJsonContent) {
    try {
        const parsedData = JSON.parse(newJsonContent);
        
        // 1. Update the source of truth
        const updateSuccess = updateCurrentLevelData(parsedData); 
        
        if (updateSuccess) {
            // 2. Refresh the UI
            updateUIFromLoadedData();
            modules.setStatus("New map JSON loaded and UI updated.");
        } else {
             modules.setStatus("Loaded JSON format is invalid.", true);
        }
        
    } catch (error) {
        modules.setStatus(`Error loading JSON file: ${error.message}`, true);
        console.error("JSON Load Error:", error);
    }
}