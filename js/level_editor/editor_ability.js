// js/level_editor/editor_ability.js

import { getCurrentMap } from './level_data.js'; // To access the abilities data
import { modifyJson, customConfirm } from './json_functions.js'; // Import utilities

let contentContainer = null; 

// --- New Ability Default Structure ---
const newAbilityStructure = {
    "id": "lava_floor",
    "configId": "new_ability_id",
    "name": "New Ability",
    "description": "Short description of the ability.",
    "description_text": "Detailed usage description.",
    "type": "targeted",
    "selectionCount": 1, 
    "damage": 0,
    "damage_every": 0,
    "cooldown": 15000, 
    "effectDuration": 5000, 
    "color": "rgba(100, 100, 255, 0.6)",
    "ui": {
        "icon": "✨"
    }
};

// --- Initialization ---
export const initialize = () => {
    contentContainer = document.getElementById('abilityEditorContent');
    if (!contentContainer) {
        console.error("Ability Editor Error: Element #abilityEditorContent not found.");
    }

    // Attach event listener for the main Add Ability button
    const addAbilityButton = document.getElementById('add-ability-button');
    if (addAbilityButton) {
        // Attach the public function to the button
        addAbilityButton.addEventListener('click', abilityEditor.addAbility); 
    }
};

// --- Utility Functions ---

/**
 * Re-indexes abilities sequentially (0, 1, 2, ...) based on array index.
 * This is used ONLY for rendering the array index in the editor, 
 * but the actual JSON structure is an Array, so the order is maintained.
 * We rely on array index for deletion/manipulation.
 * @param {Array<object>} abilities - The array holding all ability definitions.
 */
function reIndexAbilitiesForDisplay(abilities) {
    // Since the data is an array, the index is the ID. We just ensure the
    // 'id' property is updated if needed, but for this editor, we use the
    // array index (index) as the unique identifier for DOM manipulation.
    // The unique ID is the array index.
}

// --- Main Ability Editor Public Interface ---

export const abilityEditor = (() => {
    
    // --- Repeater Rendering Function ---
    const renderAbilityRepeater = (abilities) => {
        if (!contentContainer) {
            console.error("Ability Editor Error: Content container is null."); 
            return; 
        }
        if (!abilities || !Array.isArray(abilities)) {
            contentContainer.innerHTML = "<p>No ability data found in JSON.</p>";
            return;
        }
        
        let html = '';

        abilities.forEach((ability, index) => {
            html += `
                <div class="ability-card box" data-ability-index="${index}">
                    <div class="card-header">
                        <label>Class ID <input type="text" size="50" class="input-ability-id input-medium" value="${ability.id}" placeholder="Class ID" data-key="id"></label> 
                        <label>Config ID <input type="text" class="input-ability-id input-medium" value="${ability.configId || ''}" placeholder="Unique Config ID" data-key="configId"></label>
                        <label>Name <input type="text" data-key="name" value="${ability.name}"></label>
                        <button class="btn btn-delete btn-delete-ability" data-ability-index="${index}">X</button>
                    </div>
                    
                    <div class="card-body">
                        <label>Type 
                            <select data-key="type">
                                <option value="targeted" ${ability.type === 'targeted' ? 'selected' : ''}>Targeted</option>
                                <option value="global" ${ability.type === 'global' ? 'selected' : ''}>Global</option>
                                <option value="passive" ${ability.type === 'passive' ? 'selected' : ''}>Passive</option>
                            </select>
                        </label>
                        <label>Icon 
                            <input type="text" data-key="ui.icon" value="${ability.ui ? ability.ui.icon : '✨'}" placeholder="e.g. 🌋">
                        </label>
                        <div class="ability-color-section" style="display: inline-block; vertical-align: top; min-width: 120px;">
                            <label style="display: block; margin-bottom: 2px;">Color & Opacity</label>
                            <div class="color-controls-stack" style="display: flex; flex-direction: column; gap: 4px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <input type="color" class="ability-color-base" 
                                           value="${extractHex(ability.color)}" 
                                           style="width: 40px; height: 30px; padding: 2px; border: 1px solid #444; cursor: pointer;">
                                    <span class="opacity-label" style="font-family: monospace; font-size: 12px; font-weight: bold;">
                                        ${extractAlpha(ability.color).toFixed(2)}
                                    </span>
                                </div>
                                <input type="range" class="ability-opacity-slider" 
                                       min="0" max="1" step="0.01" 
                                       value="${extractAlpha(ability.color)}" 
                                       style="width: 100%; height: 12px; cursor: pointer;">

                                <input type="hidden" data-key="color" value="${ability.color}">
                            </div>
                        </div>
                        <label>Damage <input type="number" data-key="damage" value="${ability.damage}" min="0"></label>
                        <label>Damage Freq (ms) <input type="number" data-key="damage_every" value="${ability.damage_every}" min="0"></label>
                        
                        <label>Cooldown (ms) <input type="number" data-key="cooldown" value="${ability.cooldown}" min="1000"></label>
                        <label>Effect Duration (ms) <input type="number" data-key="effectDuration" value="${ability.effectDuration}" min="0"></label>
                        <label>Selection Count <input type="number" data-key="selectionCount" value="${ability.selectionCount}" min="1"></label>

                        <label>Short Description <input type="text" data-key="description" value="${ability.description}"></label>
                        <label>Usage Text <input type="text" data-key="description_text" value="${ability.description_text}"></label>
                    </div>
                </div>
            `;
        });
        
        contentContainer.innerHTML = html;
        attachChangeListeners();
        attachDeleteListeners();
    };
        
    const attachDeleteListeners = () => {
        if (!contentContainer) return;
        
        contentContainer.querySelectorAll('.btn-delete-ability').forEach(button => {
            button.addEventListener('click', async (e) => { 
                // FIX: Use e.currentTarget instead of e.target. 
                // e.currentTarget is guaranteed to be the button the listener is attached to,
                // which ensures the 'data-ability-index' is correctly retrieved.
                const index = parseInt(e.currentTarget.getAttribute('data-ability-index'), 10);
                console.log(index);
                await deleteAbility(index); 
            });
        });
    };
        
    // 1. Function to handle saving changes
    const attachChangeListeners = () => {
        if (!contentContainer) return; 

        contentContainer.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', (e) => {
                const card = e.target.closest('.ability-card');
                const abilityIndex = parseInt(card.getAttribute('data-ability-index'), 10);

                // --- DETEKCE BARVY NEBO OPACITY ---
                if (e.target.classList.contains('ability-color-base') || e.target.classList.contains('ability-opacity-slider')) {
                    const section = e.target.closest('.ability-color-section');
                    const hex = section.querySelector('.ability-color-base').value;
                    const alpha = section.querySelector('.ability-opacity-slider').value;

                    section.querySelector('.opacity-label').textContent = parseFloat(alpha).toFixed(2);
                
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    const rgbaValue = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                
                    modifyJson((data) => {
                        data.maps[0].abilities[abilityIndex].color = rgbaValue;
                    }, `Ability ${abilityIndex} color updated to ${rgbaValue}`);
                    return;
                }

                // --- STANDARDNÍ LOGIKA PRO OSTATNÍ POLE ---
                const fullKey = e.target.getAttribute('data-key');
                if (!fullKey) return;

                const isNested = fullKey.includes('.');
                const key = isNested ? fullKey.split('.') : fullKey;
                let value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;

                modifyJson((data) => {
                    const abilities = data.maps[0].abilities;
                    if (isNested) {
                        abilities[abilityIndex][key[0]][key[1]] = value;
                    } else {
                        abilities[abilityIndex][key] = value;
                    }
                }, `Ability ${abilityIndex} (${fullKey}) updated.`);
            });
        });
    };

    // Extracted save logic to avoid repetition
    function saveValue(abilityIndex, key, value, isNested) {
        modifyJson((data) => {
            const abilities = data.maps[0].abilities;
            if (isNested) {
                abilities[abilityIndex][key[0]][key[1]] = value;
            } else {
                abilities[abilityIndex][key] = value;
            }
        }, `Ability ${abilityIndex} updated.`);
    }

    // 2. Function to add a new ability
    const addAbility = () => {
        modifyJson((data) => {
            const abilities = data.maps[0].abilities;
            const newAbility = JSON.parse(JSON.stringify(newAbilityStructure));
            
            // 1. Update generated properties
            newAbility.name = `New Ability ${abilities.length + 1}`;
            
            // 2. Make the unique configId unique by appending the current count
            newAbility.configId = `new_ability_id_${abilities.length + 1}`;

            abilities.push(newAbility);

            // Re-render
            renderAbilityRepeater(abilities);

        }, `<b>New ability added. Remember to change the **Config ID** for a unique identifier!</b>`); // Updated warning
    };

    // 3. Function to delete an ability
    const deleteAbility = async (abilityIndex) => {
        const abilityName = getCurrentMap().abilities[abilityIndex].name;
        
        const confirmed = await customConfirm(
            "Confirm Deletion",
            `Are you sure you want to delete Ability ${abilityIndex}: ${abilityName}?`
        );
    
        if (!confirmed) {
            return;
        }
        
        await modifyJson((data) => {
            const abilities = data.maps[0].abilities;
            
            // 1. Delete the ability by array index
            abilities.splice(abilityIndex, 1);
        
            // 2. Re-render the repeater to reflect the deletion
            renderAbilityRepeater(abilities);
            
        }, `Ability ${abilityName} deleted.`);
    };

    return {
        renderAbilityRepeater,
        addAbility,
        deleteAbility,
    };
})();

// Helper to extract #RRGGBB from rgba() or hex
function extractHex(colorStr) {
    if (!colorStr || !colorStr.startsWith('rgba')) return colorStr || "#ff5000";
    const rgba = colorStr.match(/\d+/g);
    const toHex = (n) => parseInt(n).toString(16).padStart(2, '0');
    return `#${toHex(rgba[0])}${toHex(rgba[1])}${toHex(rgba[2])}`;
}

function extractAlpha(colorStr) {
    if (!colorStr || !colorStr.startsWith('rgba')) return 1.0;
    const rgba = colorStr.match(/[\d\.]+/g);
    // rgba[3] je čtvrtá hodnota v rgba(r,g,b,a)
    return rgba && rgba[3] ? parseFloat(rgba[3]) : 1.0;
}