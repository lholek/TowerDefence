// This block replaces both of your original DOMContentLoaded blocks.
import { currentLevelData } from './level_data.js';

document.getElementById('testMapBtn').addEventListener('click', () => {
    // 1. Save the current state of the editor to localStorage
    const mapString = JSON.stringify(currentLevelData);
    localStorage.setItem('test_map_data', mapString);

    // 2. Open the game in a new tab/window
    // The 'test=true' query param tells the game to look in localStorage
    window.open('index.html?mapEditorTest=true', '_blank');
});

document.addEventListener('DOMContentLoaded', async () => {

    /**
     * Toggles the visibility of a single editor panel (CHECKBOX behavior: allows multiple panels to be visible).
     * @param {string} targetId The ID of the panel to toggle (e.g., 'mapEditorPanel').
     * @param {HTMLElement} clickedButton The button that was clicked.
     */
    function toggleEditorPanel(targetIds, clickedButton) {
        // Split the string by spaces to handle multiple IDs
        const targets = targetIds.split(' ');
        
        // Toggle the button's active state once
        clickedButton.classList.toggle('active-tab');

        targets.forEach(id => {
            const targetPanel = document.getElementById(id);
            if (targetPanel) {
                // Toggle visibility for each target
                targetPanel.classList.toggle('d-none');

                // Specialized logic for the map editor resize
                if (id === 'mapEditorPanel' && !targetPanel.classList.contains('d-none')) {
                    if (window.app && window.app.mapEditor && window.app.mapEditor.onTabShown) {
                        window.app.mapEditor.onTabShown();
                    }
                }
            }
        });
    }

    /**
     * Loads the current version from versions.json and updates the UI.
     * NOTE: Declared as async to allow await.
     */
    async function loadVersion(){
        try {
            const res = await fetch('versions.json'); 
            const data = await res.json();
            const currentVersion = data.versions[0].version;
            
            // Update all version displays
            document.querySelectorAll('.subtitle-bottom-left').forEach(el => {
                el.textContent = currentVersion;
            });
            
            // Update page title
            document.title = `The CZSrna's Tower Defence – ${currentVersion}`;
            
            // Update events box subtitle
            const eventsBoxSubtitle = document.querySelector('.subtitle');
            if (eventsBoxSubtitle) {
                eventsBoxSubtitle.textContent = currentVersion;
            }
            
        } catch (err) {
            console.error('Failed to load version:', err);
        }
    }

    // --- EXECUTION START ---
    
    // Run the version loader first
    await loadVersion(); 
    
    // 1. Get all the buttons that act as toggles
    const toggleButtons = document.querySelectorAll('.editor-tabs .btn');
    
    // 2. Add a click listener to each button
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            toggleEditorPanel(targetId, button);
        });
    });
    
    // 3. Set the initial state on load.
    // Since all your buttons have 'active-tab' in the HTML, we need to iterate 
    // and make sure all linked panels are visible on load.
    
    toggleButtons.forEach(button => {
        const targetAttr = button.getAttribute('data-target');
        const isActive = button.classList.contains('active-tab');
        if(!targetAttr){
            return;
        }
        const targetIds = targetAttr.split(' ')
        targetIds.forEach(id => {
            const targetPanel = document.getElementById(id);
            if (targetPanel) {
                if (isActive) {
                    targetPanel.classList.remove('d-none');
                    // Run the map resize if it's the map panel
                    if (id === 'mapEditorPanel' && window.app?.mapEditor?.onTabShown) {
                        window.app.mapEditor.onTabShown();
                    }
                } else {
                    targetPanel.classList.add('d-none');
                }
            }
        });
    });
});