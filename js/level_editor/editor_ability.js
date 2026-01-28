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
                        <div class="header-actions">
                            <button class="btn btn-copy btn-copy-ability" data-ability-index="${index}" title="Copy Ability">📋</button>
                            <button class="btn btn-delete btn-delete-ability" data-ability-index="${index}">X</button>
                        </div>
                    </div>

                    <div class="card-body">
                        <label>Name <input type="text" data-key="name" value="${ability.name}"></label>

                        <label>Icon 
                            <input type="text" data-key="ui.icon" value="${ability.ui ? ability.ui.icon : '✨'}" placeholder="e.g. 🌋">
                        </label>

                        <div class="ability-color-section">
                            <label class="ability-label">Color & Opacity</label>
                            <div class="color-controls-stack">
                                <div class="color-controls-picker">
                                    <input type="color" class="ability-color-base" 
                                           value="${extractHex(ability.color)}">
                                    <span class="opacity-label">
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
                            <div class="ability-fury-modifiers">
                                <div class="stats-preview-box" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
                                    <div class="stat-row">${formatStat(ability.modifiers?.damage_mul || 1)} <span class="stat-label">Damage</span></div>
                                    <div class="stat-row">
                                        ${formatStat(ability.modifiers?.speed_mul || 1)} <span class="stat-label">Speed</span> | 
                                        ${formatStat(ability.modifiers?.fireRate_mul || 1, true)} <span class="stat-label">Fire Rate</span>
                                    </div>
                                </div>
                                <p>MODIFIERS (1 = 100%)</p>
                                <label>Dmg Mul <input type="number" step="0.1" data-key="modifiers.damage_mul" value="${ability.modifiers?.damage_mul || 1}"></label>
                                <label>Speed Mul <input type="number" step="0.1" data-key="modifiers.speed_mul" value="${ability.modifiers?.speed_mul || 1}"></label>
                                <label>Fire Rate <input type="number" step="0.05" data-key="modifiers.fireRate_mul" value="${ability.modifiers?.fireRate_mul || 1}"></label>
                            </div>
                        ` : `
                            <label>Damage <input type="number" data-key="damage" value="${ability.damage || 0}"></label>
                            <label>Damage Freq <input type="number" data-key="damage_every" value="${ability.damage_every || 0}"></label>
                            <label>Selection Count <input type="number" data-key="selectionCount" value="${ability.selectionCount || 1}"></label>
                        `}
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
        
        // Delete Listeners
        contentContainer.querySelectorAll('.btn-delete-ability').forEach(button => {
            button.addEventListener('click', async (e) => { 
                const index = parseInt(e.currentTarget.getAttribute('data-ability-index'), 10);
                await deleteAbility(index); 
            });
        });

        // Copy Listeners
        contentContainer.querySelectorAll('.btn-copy-ability').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-ability-index'), 10);
                copyAbility(index);
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

    const copyAbility = (index) => {
        modifyJson((data) => {
            const abilities = data.maps[0].abilities; // Defined inside here
            const sourceAbility = abilities[index];

            if (!sourceAbility) return;

            // Deep copy the selected ability
            const newAbility = JSON.parse(JSON.stringify(sourceAbility));

            // Update identifiers to avoid duplicates
            newAbility.name = `${sourceAbility.name} (Copy)`;
            newAbility.configId = `${sourceAbility.id}_${Date.now()}`;

            // Insert right after the original
            abilities.splice(index + 1, 0, newAbility);

            // Re-render
            renderAbilityRepeater(abilities);

            // Log inside the scope where 'sourceAbility' is known
        }, `Copied ability at index ${index}`);
    };

    const formatStat = (val, inverted = false) => {
        const change = Math.round((val - 1) * 100);
        // For Damage/Speed: >1 is positive. For Fire Rate: <1 (inverted) is positive.
        const isPositive = inverted ? change <= 0 : change >= 0;
        const colorClass = isPositive ? 'stat-pos' : 'stat-neg';
        const displayChange = inverted ? -change : change;
        const finalValue = inverted ? -change : change;
        const displaySign = finalValue >= 0 ? '+' : '';
        

        if (change !== 0) {
            return `<span class="${colorClass}" style="color: ${isPositive ? '#4caf50' : '#f44336'}; font-weight: bold;">
                ${displaySign}${displayChange}%
            </span>`;
        }
        return `<span>±0%</span>`;
    };

    return {
        renderAbilityRepeater,
        addAbility,
        deleteAbility,
        copyAbility
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