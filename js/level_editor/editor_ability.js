// js/level_editor/editor_ability.js

import { getCurrentMap } from './level_data.js'; // To access the abilities data
import { modifyJson, customConfirm } from './json_functions.js'; // Import utilities

let contentContainer = null; 

// --- New Ability Default Structure ---
const newAbilityStructure = {
    "id": "lava_floor", 
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
                        <label>ID <input type="text" class="input-ability-id input-small" value="${ability.id}" placeholder="Unique ID" data-key="id"></label> 
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
                        <label>Color <input type="color" data-key="color" value="${ability.color}"></label>
                        
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
        attachDeleteListeners(contentContainer);
    };
        
    // 1. Function to handle saving changes
    
    // NEW: Function to attach delete listeners
    const attachDeleteListeners = (container) => {
        if (!container) return;
        
        container.querySelectorAll('.btn-delete-ability').forEach(button => {
            button.addEventListener('click', (e) => {
                // Get index from the button's data attribute
                const index = parseInt(e.target.getAttribute('data-ability-index'), 10);
                deleteAbility(index); // Directly call the internal function
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
                
                const fullKey = e.target.getAttribute('data-key');
                const isNested = fullKey.includes('.');
                const key = isNested ? fullKey.split('.') : fullKey;

                // Determine the correct value type
                let value;
                if (e.target.type === 'number') {
                    value = parseFloat(e.target.value);
                } else if (e.target.type === 'color' || e.target.type === 'text' || e.target.tagName === 'SELECT') {
                    value = e.target.value;
                } else {
                    value = e.target.value;
                }
                
                modifyJson((data) => {
                    const abilities = data.maps[0].abilities;

                    if (isNested) {
                        // Handle nested keys like 'ui.icon'
                        abilities[abilityIndex][key[0]][key[1]] = value;
                    } else {
                        // Handle top-level keys
                        abilities[abilityIndex][key] = value;
                    }
                }, `Ability ${abilityIndex} (${fullKey}) updated.`);
            });
        });
    };

    // 2. Function to add a new ability
    const addAbility = () => {
        modifyJson((data) => {
            const abilities = data.maps[0].abilities;
            const newAbility = JSON.parse(JSON.stringify(newAbilityStructure));

            // 3. REMOVED: Automatic ID generation. Uses fixed placeholder ID.
            newAbility.name = `New Ability ${abilities.length + 1}`;
            
            abilities.push(newAbility);
            
            // Re-render
            renderAbilityRepeater(abilities);

        }, `New ability added. Remember to change the ID from '${newAbilityStructure.id}'.`); // Added warning
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
        
        modifyJson((data) => {
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