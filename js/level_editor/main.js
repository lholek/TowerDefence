import * as levelData from './level_data.js';
import * as jsonFunctions from './json_functions.js';
import * as mapEditor from './editor_map.js';
import { initialize as initTowerEditor, towerEditor } from './editor_tower.js';

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
    towerEditor: towerEditor
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
    
    // 2. Set module references (Dependency Injection)
    jsonFunctions.setModuleReferences({ 
        editor, 
        setStatus, 
        renderMap: mapEditor.renderMap 
    });
    
    mapEditor.setModuleReferences({ 
        canvas, 
        ctx, 
        mapCanvasContainer,
        mapLayoutWrapper,
        tileKey,
        setStatus 
    });

    // 3. Initialize editor with formatted JSON
    // The previous error (jsonFunctions.formatCompactLayout is not a function) is fixed 
    // by exporting the function in json_functions.js.
    editor.value = jsonFunctions.formatCompactLayout(levelData.currentLevelData);

    // 4. Set up event listener for the textarea input (manual editing)
    editor.addEventListener('input', jsonFunctions.updateMapFromEditor);

    // 5. Initial map render and interaction setup
    mapEditor.renderMap(levelData.currentLevelData.maps[0].layout);
    mapEditor.setupMapInteractions();
    
    // --- TOWER EDITOR SETUP ---
    initTowerEditor(); // 3. Initialize the tower editor to find its DOM elements
    
    // 4. Render the tower repeater using the data from levelData.js
    towerEditor.renderTowerRepeater(levelData.currentLevelData.maps[0].towerTypes);
});