import * as levelData from './level_data.js';
import * as jsonFunctions from './json_functions.js';
import * as mapEditor from './editor_map.js';
import { initialize as initTowerEditor, towerEditor } from './editor_tower.js';
import { initialize as initWaveEditor, waveEditor } from './editor_wave.js';
import { initialize as initAbilityEditor, abilityEditor } from './editor_ability.js'; 

// Global utility function
function setStatus(message, isError = false) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.classList.remove('d-none', 'status-success', 'status-error');
    statusMessage.classList.add(isError ? 'status-error' : 'status-success');
    
    setTimeout(() => { statusMessage.classList.add('d-none'); }, 3000);
}

// Attach module functions to a global namespace for HTML access
window.app = {
    jsonFunctions: jsonFunctions,
    mapEditor: mapEditor,
    towerEditor: towerEditor,
    waveEditor: waveEditor,
    abilityEditor: abilityEditor
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Get DOM element references
    const editor = document.getElementById('jsonEditor');
    const canvas = document.getElementById('mapCanvas');
    const ctx = canvas.getContext('2d');
    const mapCanvasContainer = document.getElementById('mapCanvasContainer');
    const mapLayoutWrapper = document.getElementById('mapLayoutWrapper');
    const tileKey = document.getElementById('tileKey');

    // 2. Pass core utilities to json_functions
    // CRITICAL: Passing all editor modules so json_functions can refresh the UI
    jsonFunctions.setModuleReferences({ 
        editor, 
        setStatus,
        mapEditor: mapEditor,
        towerEditor: towerEditor,
        waveEditor: waveEditor,
        abilityEditor: abilityEditor 
    });

    // 3. Initialize map editor with references
    mapEditor.setModuleReferences({
        canvas, 
        ctx, 
        mapCanvasContainer,
        mapLayoutWrapper,
        tileKey,
        setStatus 
    });

    // 3. Initialize editor with formatted JSON
    editor.value = jsonFunctions.formatCompactLayout(levelData.currentLevelData);

    // 4. Set up event listener for the textarea input (manual editing)
    // FIX: Corrected function name to updateMapFromEditor
    editor.addEventListener('input', jsonFunctions.updateMapFromEditor);

    // 5. Initial map render and interaction setup
    mapEditor.renderMap(levelData.currentLevelData.maps[0].layout);
    mapEditor.setupMapInteractions();
    
    // --- TOWER EDITOR SETUP ---
    initTowerEditor(); 
    towerEditor.renderTowerRepeater(levelData.currentLevelData.maps[0].towerTypes);

    // 3. WAVE EDITOR SETUP ---
    initWaveEditor({ setStatus });

    // --- ABILITY EDITOR SETUP ---
    initAbilityEditor(); 
    abilityEditor.renderAbilityRepeater(levelData.currentLevelData.maps[0].abilities);
});