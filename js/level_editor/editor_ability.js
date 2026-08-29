// js/level_editor/editor_ability.js

import { getCurrentMap } from './level_data.js'; // To access the abilities data
import { modifyJson as modifyJsonRaw } from './json_functions.js';
import { formatNumber, parseThousands } from './number_format.js';
import { initJsonSteppers, RELEASE_EVENT } from './JsonStepper.js';

// Every modifyJson(...) call in this file edits an ability, so tag it 'ability' for the
// Undo/Redo history automatically. Pass a 4th arg (CSS selector for the specific
// card/field being touched) so Undo/Redo can jump to that exact spot instead of
// just the whole Abilities panel.
const modifyJson = (modifyFn, successMessage, selector) =>
    modifyJsonRaw(modifyFn, successMessage, { section: 'ability', selector });

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

    // A JsonStepper hold skips json_functions.js's rebuild of this panel for
    // as long as it's running (see modifyJson's isStepperHoldActive() guard),
    // so catch back up with one rebuild once it lets go.
    document.addEventListener(RELEASE_EVENT, () => {
        abilityEditor.renderAbilityRepeater(getCurrentMap().abilities);
    });
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
    const isFury = ability.id === 'towers_fury';

    html += `
        <div class="ability-card box" data-ability-index="${index}">
            <div class="card-header">
                <div class="level-label item-title">Ability ${index + 1}</div>
                <label>Class ID <input type="text" class="input-medium" value="${ability.id}" disabled></label> 
                <label>Config ID <input type="text" class="input-medium" value="${ability.configId || ''}" disabled></label>
                <label>Type <input type="text" class="input-medium" value="${ability.type}" disabled></label>
                <div class="header-actions">
                    <button class="btn btn-copy btn-copy-ability" data-ability-index="${index}" title="Copy Ability">📋</button>
                    <button class="btn btn-delete btn-delete-ability" data-ability-index="${index}">X</button>
                </div>
            </div>

            <div class="card-body">
                <label class="editor-row">
                    <span class="label-text">Name <i class="info-icon" data-tooltip="ability.name">i</i></span>
                    <input type="text" data-key="name" value="${ability.name}">
                </label>

                <label class="editor-row">
                    <span class="label-text">Icon <i class="info-icon" data-tooltip="ability.icon">i</i></span>
                    <input type="text" data-key="ui.icon" maxlength="1" value="${ability.ui ? ability.ui.icon : '✨'}" placeholder="e.g. 🌋">
                </label>

                <div class="ability-color-section editor-row">
                    <span class="label-text">Color&Opacity <i class="info-icon" data-tooltip="ability.colors_opacity">i</i></span>
                    <div class="color-controls-stack">
                        <div class="color-controls-picker">
                            <input type="color" class="ability-color-base" value="${extractHex(ability.color)}">
                            <span class="opacity-label">${extractAlpha(ability.color).toFixed(2)}</span>
                        </div>
                        <input type="range" class="ability-opacity-slider" min="0" max="1" step="0.01" value="${extractAlpha(ability.color)}">
                        <input type="hidden" data-key="color" value="${ability.color}">
                    </div>
                </div>

                <label class="editor-row">
                    <span class="label-text">Cooldown (ms) <i class="info-icon" data-tooltip="ability.cooldown">i</i></span>
                    <input type="text" inputmode="numeric" class="input-thousands" data-key="cooldown" data-json-stepper="ability_cooldown" value="${formatNumber(ability.cooldown)}">
                </label>

                <label class="editor-row">
                    <span class="label-text">Duration (ms) <i class="info-icon" data-tooltip="ability.duration">i</i></span>
                    <input type="text" inputmode="numeric" class="input-thousands" data-key="effectDuration" data-json-stepper="ability_duration" value="${formatNumber(ability.effectDuration)}">
                </label>

                ${isFury ? `
                    <div class="ability-fury-modifiers">
                        <div class="stats-preview-box" style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
                            <div class="stat-row">${formatStat(ability.modifiers?.damage_mul ?? 1)} <span class="stat-label">Damage</span></div>
                            <div class="stat-row">
                                ${formatStat(ability.modifiers?.speed_mul ?? 1)} <span class="stat-label">Speed</span> |
                                ${formatStat(ability.modifiers?.fireRate_mul ?? 1, true)} <span class="stat-label">Fire Rate</span>
                            </div>
                        </div>
                        <p style="font-weight: bold; font-size: 0.8em; margin: 5px 0;">MODIFIERS (1.0 = 0% Bonus)</p>

                        <label class="editor-row">
                            <span class="label-text">Damage Multiplier <i class="info-icon" data-tooltip="ability.towers-fury-damage-multiplier">i</i></span>
                            <input type="text" inputmode="decimal" class="input-thousands" data-key="modifiers.damage_mul" data-json-stepper="fury_damage_mul" value="${formatNumber(ability.modifiers?.damage_mul ?? 1)}">
                        </label>

                        <label class="editor-row">
                            <span class="label-text">Speed Multiplier <i class="info-icon" data-tooltip="ability.towers-fury-speed-multiplier">i</i></span>
                            <input type="text" inputmode="decimal" class="input-thousands" data-key="modifiers.speed_mul" data-json-stepper="fury_speed_mul" value="${formatNumber(ability.modifiers?.speed_mul ?? 1)}">
                        </label>

                        <label class="editor-row">
                            <span class="label-text">Fire Rate <i class="info-icon" data-tooltip="ability.towers-fury-fire-rate">i</i></span>
                            <input type="text" inputmode="decimal" class="input-thousands" data-key="modifiers.fireRate_mul" data-json-stepper="fury_fire_rate_mul" value="${formatNumber(ability.modifiers?.fireRate_mul ?? 1)}">
                        </label>
                    </div>
                ` : `
                    <label class="editor-row">
                        <span class="label-text">Damage <i class="info-icon" data-tooltip="ability.lava-floor-damage">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="damage" data-json-stepper="lava_floor_damage" value="${formatNumber(ability.damage || 0)}">
                    </label>

                    <label class="editor-row">
                        <span class="label-text">Frequency (ms) <i class="info-icon" data-tooltip="ability.lava-floor-damage-frequency">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="damage_every" data-json-stepper="lava_floor_damage_frequency" value="${formatNumber(ability.damage_every || 0)}">
                    </label>

                    <label class="editor-row">
                        <span class="label-text">Selection Count <i class="info-icon" data-tooltip="ability.lava-floor-selection-count">i</i></span>
                        <input type="text" inputmode="numeric" class="input-thousands" data-key="selectionCount" data-json-stepper="lava_floor_selection_count" value="${formatNumber(ability.selectionCount || 1)}">
                    </label>
                `}
            </div>
        </div>
    `;
});
        
        contentContainer.innerHTML = html;
        attachChangeListeners();
        attachDeleteListeners();
        // Rebuilding innerHTML above throws away any previous stepper wrap,
        // so re-wrap the fresh .json-stepper inputs here (see editor_tower.js).
        initJsonSteppers(contentContainer);
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
                    }, `Ability ${abilityIndex} color updated to ${rgbaValue}`, `.ability-card[data-ability-index="${abilityIndex}"] .ability-color-section`);
                    return;
                }

                // --- STANDARDNÍ LOGIKA PRO OSTATNÍ POLE ---
                const fullKey = e.target.getAttribute('data-key');
                if (!fullKey) return;

                const parts = fullKey.split('.');
                let value = e.target.classList.contains('input-thousands')
                    ? parseThousands(e.target.value)
                    : (e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value);

                modifyJson((data) => {
                    const ability = data.maps[0].abilities[abilityIndex];
                    if (parts.length === 2) {
                        // Ensure the sub-object (like modifiers or ui) exists before setting
                        if (!ability[parts[0]]) ability[parts[0]] = {}; 
                        ability[parts[0]][parts[1]] = value;
                    } else {
                        ability[fullKey] = value;
                    }
                }, `Ability ${abilityIndex} (${fullKey}) updated.`, `.ability-card[data-ability-index="${abilityIndex}"] [data-key="${fullKey}"]`);
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
        }, `Ability ${abilityIndex} updated.`, `.ability-card[data-ability-index="${abilityIndex}"] [data-key="${isNested ? key.join('.') : key}"]`);
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
        }, `Added new ${selectedType} ability.`, `.ability-card[data-ability-index="${getCurrentMap().abilities.length}"]`);
    };

    // 3. Function to delete an ability
    const deleteAbility = async (abilityIndex) => {
        const abilityName = getCurrentMap().abilities[abilityIndex].name;

        await modifyJson((data) => {
            const abilities = data.maps[0].abilities;
            
            // 1. Delete the ability by array index
            abilities.splice(abilityIndex, 1);

            // 2. Re-render the repeater to reflect the deletion
            renderAbilityRepeater(abilities);

        }, `Ability ${abilityName} deleted.`, `.ability-card[data-ability-index="${abilityIndex}"]`);
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
        }, `Copied ability at index ${index}`, `.ability-card[data-ability-index="${index + 1}"]`);
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