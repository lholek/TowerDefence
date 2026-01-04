// js/level_editor/editor_ability.js

import { getCurrentMap } from './level_data.js'; // To access the abilities data
import { modifyJson, customConfirm } from './json_functions.js'; // Import utilities

let contentContainer = null; 

// --- New Ability Default Structure ---
const abilityTemplates = {
    lava_floor: {
        "id": "lava_floor",
        "configId": "lava_floor_new",
        "name": "New Lava Floor",
        "description": "Short description",
        "description_text": "Detailed usage description",
        "type": "targeted",
        "selectionCount": 7,
        "damage": 500,
        "damage_every": 500,
        "cooldown": 7000,
        "effectDuration": 8000,
        "color": "rgba(245, 164, 66, 0.6)",
        "ui": { "icon": "🌋" }
    },
    towers_fury: {
        "id": "towers_fury",
        "configId": "towers_fury_new",
        "name": "New Towers Fury",
        "description_text": "All towers: +320% Damage",
        "type": "global",
        "cooldown": 10000,
        "effectDuration": 25000,
        "color": "#rgba(255, 255, 255, 0.75)",
        "ui": { "icon": "🏹" },
        "modifiers": {
            "damage_mul": 1,
            "speed_mul": 3,
            "fireRate_mul": 0.85
        }
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
            // Replace the internal part of abilities.forEach starting at line ~82:
            const isFury = ability.id === 'towers_fury';

            html += `
                <div class="ability-card box" data-ability-index="${index}">
                    <div class="card-header">
                        <label>Class ID <input type="text" class="input-medium" value="${ability.id}" disabled title="Edit in Final JSON"></label> 
                        <label>Config ID <input type="text" class="input-medium" value="${ability.configId || ''}" disabled></label>
                        <label>Type <input type="text" class="input-medium" value="${ability.type}" disabled></label>
                        <button class="btn btn-delete btn-delete-ability" data-ability-index="${index}">X</button>
                    </div>

                    <div class="card-body">
                        <label>Name <input type="text" data-key="name" value="${ability.name}"></label>

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
                                <input type="range" class="ability-opacity-slider" min="0" max="1" step="0.01" value="${extractAlpha(ability.color)}">
                                <input type="hidden" data-key="color" value="${ability.color}">
                            </div>
                        </div>

                        <label>Cooldown (ms) <input type="number" data-key="cooldown" value="${ability.cooldown}" min="1000"></label>
                        <label>Duration (ms) <input type="number" data-key="effectDuration" value="${ability.effectDuration}" min="0"></label>

                        ${isFury ? `
                            <div style="grid-column: span 2; background: rgba(0,0,0,0.1); padding: 10px; border-radius: 4px;">
                                <p style="margin:0 0 5px 0; font-weight:bold; font-size:12px;">MODIFIERS</p>
                                <label>Dmg Mul <input type="number" step="0.1" data-key="modifiers.damage_mul" value="${ability.modifiers?.damage_mul || 1}"></label>
                                <label>Speed Mul <input type="number" step="0.1" data-key="modifiers.speed_mul" value="${ability.modifiers?.speed_mul || 1}"></label>
                                <label>Fire Rate <input type="number" step="0.05" data-key="modifiers.fireRate_mul" value="${ability.modifiers?.fireRate_mul || 1}"></label>
                            </div>
                        ` : `
                            <label>Damage <input type="number" data-key="damage" value="${ability.damage || 0}"></label>
                            <label>Damage Freq <input type="number" data-key="damage_every" value="${ability.damage_every || 0}"></label>
                            <label>Selection Count <input type="number" data-key="selectionCount" value="${ability.selectionCount || 1}"></label>
                        `}
                        
                        ${!isFury ? `
                            <label style="grid-column: span 2;">Short Description 
                                <textarea data-key="description" rows="2" style="width: 100%;">${ability.description || ''}</textarea>
                            </label>
                        ` : ''}
                        
                        <label style="grid-column: span 2;">Usage Text 
                            <textarea data-key="description_text" rows="2" style="width: 100%;">${ability.description_text || ''}</textarea>
                        </label>
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
                await deleteAbility(index); 
            });
        });
    };
        
    // 1. Function to handle saving changes
    const attachChangeListeners = () => {
        if (!contentContainer) return; 

        contentContainer.querySelectorAll('input, select, textarea').forEach(input => {
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

                const parts = fullKey.split('.');
                let value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;

                modifyJson((data) => {
                    const ability = data.maps[0].abilities[abilityIndex];
                    if (parts.length === 2) {
                        // Ensure the sub-object (like modifiers or ui) exists before setting
                        if (!ability[parts[0]]) ability[parts[0]] = {}; 
                        ability[parts[0]][parts[1]] = value;
                    } else {
                        ability[fullKey] = value;
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
        // Looks for a <select id="ability-type-selector"> in your HTML
        const selector = document.getElementById('ability-type-selector');
        const selectedType = selector ? selector.value : 'lava_floor';

        modifyJson((data) => {
            const abilities = data.maps[0].abilities;
            const newAbility = JSON.parse(JSON.stringify(abilityTemplates[selectedType]));

            newAbility.name = `New ${selectedType} ${abilities.length + 1}`;
            newAbility.configId = `${selectedType}_${Date.now()}`;

            abilities.push(newAbility);
            renderAbilityRepeater(abilities);
        }, `Added new ${selectedType} ability.`);
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