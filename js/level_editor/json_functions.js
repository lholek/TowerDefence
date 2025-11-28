import { currentLevelData, setCurrentLevelData, newWaveStructure, newAbilityStructure } from './level_data.js';

// Get references to elements (will be imported by main.js)
let editor;
let setStatus;
let renderMap;

// popup
// Global callback storage for the custom confirm utility
let resolvePromise; 

// References for the new popup elements (ensure these are in your HTML)
const confirmPopup = document.getElementById('customConfirmPopup');
const popupTitle = document.getElementById('popupTitle');
const popupMessage = document.getElementById('popupMessage');
const confirmButton = document.getElementById('confirmActionButton');
const cancelButton = document.getElementById('cancelActionButton');

// --- Custom Confirmation Utility ---
if (confirmPopup) {
    // Add event listeners once
    confirmButton.addEventListener('click', () => {
        confirmPopup.classList.add('d-none');
        if (resolvePromise) resolvePromise(true);
    });

    cancelButton.addEventListener('click', () => {
        confirmPopup.classList.add('d-none');
        if (resolvePromise) resolvePromise(false);
    });
}

// Enter DELETING confirm
document.addEventListener('keydown', (event) => {
    // Check if the Enter key ('Enter' is the standard value for modern browsers) was pressed
    if (event.key === 'Enter') {
        
        // Check if the confirmation popup is visible (i.e., does NOT have 'd-none')
        if (confirmPopup && !confirmPopup.classList.contains('d-none')) {
            
            // Prevent default browser behavior (e.g., if there's an input on the page)
            event.preventDefault(); 
            
            // Trigger the existing logic attached to the 'Yes, remove' button
            confirmButton.click();
        }
    }
});

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
        resolvePromise = resolve; // Store the resolve function globally
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        confirmPopup.classList.remove('d-none');
    });
}
// popup

// Placeholder for external module references
export function setModuleReferences(refs) {
    editor = refs.editor;
    setStatus = refs.setStatus;
    renderMap = refs.renderMap;
}

/**
 * Creates a custom JSON string with compact formatting for the 'layout' array.
 * FIX: The implementation now correctly removes the placeholders and handles newlines/quotes.
 */
export function formatCompactLayout(jsonObject) {
    let compactLayoutContent = null;
    // Indentation for the content inside the "layout" key (12 spaces for object + 2 spaces for "layout" key + 2 spaces for array start = 16 spaces total if using 4 space standard, but using 2 space standard it's 12 spaces in total)
    // JSON.stringify uses 2 spaces, so the outer object indent is 2, the 'maps' array is 4, the inner object is 6, the 'layout' key is 8, the inner array is 10.
    // Let's use 12 spaces for indentation of the inner content rows.
    const innerContentIndent = ' '.repeat(14); // 7 levels of 2-space indentation + 2 extra for row brackets = 14

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
    // The marker will appear as: "\"__COMPACT_LAYOUT_MARKER__\"" (wrapped in quotes by JSON.stringify)
    if (compactLayoutContent) {
        // Find the marker, which is guaranteed to be wrapped in quotes by JSON.stringify
        jsonString = jsonString.replace(
            /"__COMPACT_LAYOUT_MARKER__"/, 
            () => {
                // Replace the marker with the content, adding necessary newlines and indentation.
                // The key "layout" is indented by 8 spaces, the value starts at 10 spaces.
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
    editor.value = formattedJson;
    setStatus(successMessage);
    
    // 4. Rerender the visual map after modification
    renderMap(currentLevelData.maps[0].layout);
    
    return true;
}

/**
 * Attempts to parse the JSON in the editor and update the central data store if successful.
 * Triggered when the user manually types in the JSON area.
 */
export function updateMapFromEditor() {
    let jsonText = editor.value;
    try {
        const parsedJson = JSON.parse(jsonText);
        
        // CRITICAL: Update the clean source of truth
        setCurrentLevelData(parsedJson); 

        if (parsedJson.maps && parsedJson.maps[0] && parsedJson.maps[0].layout) {
            renderMap(parsedJson.maps[0].layout);
        }
    } catch (e) {
        // Ignore parsing errors while user is typing
    }
}


// --- Editor Action Functions ---

/**
 * Validates the JSON, formats it, updates the textarea, and copies it to the clipboard.
 */
export function copyFormattedJson() {
    const formattedJson = formatCompactLayout(currentLevelData);
    editor.value = formattedJson;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(formattedJson).then(() => {
            setStatus('JSON formatted and copied to clipboard successfully!');
        }).catch(() => {
            editor.select();
            document.execCommand('copy');
            setStatus('Copy failed. JSON formatted and selected. Copy manually!', true);
        });
    } else {
         editor.select();
         document.execCommand('copy');
         setStatus('JSON formatted and selected. Copy manually!', true);
    }
}

/**
 * Adds a new wave (level) object.
 * FIX: nextLevel calculated in the outer scope to be used in the success message.
 */
export function addWave() {
    // Calculate the next level number based on current data
    const levels = currentLevelData.maps[0].levels;
    const nextLevel = levels.length > 0 ? levels[levels.length - 1].level + 1 : 1;

    modifyJson((data) => {
        
        const newWave = JSON.parse(JSON.stringify(newWaveStructure)); 
        newWave.level = nextLevel;
        
        data.maps[0].levels.push(newWave);
    }, `Wave added! (Now level ${nextLevel})`); // nextLevel is now defined here
}

/**
 * Adds a new ability object.
 */
export function addAbility() {
    modifyJson((data) => {
        const abilities = data.maps[0].abilities;
        const newAbility = JSON.parse(JSON.stringify(newAbilityStructure));
        abilities.push(newAbility);
    }, `Ability "${newAbilityStructure.name}" added!`);
}