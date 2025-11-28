// This block replaces both of your original DOMContentLoaded blocks.
document.addEventListener('DOMContentLoaded', async () => {

    /**
     * Toggles the visibility of a single editor panel (CHECKBOX behavior: allows multiple panels to be visible).
     * @param {string} targetId The ID of the panel to toggle (e.g., 'mapEditorPanel').
     * @param {HTMLElement} clickedButton The button that was clicked.
     */
    function toggleEditorPanel(targetId, clickedButton) {
        
        const targetPanel = document.getElementById(targetId);

        if (targetPanel) {
            // A. Toggle the panel's visibility
            // If it has 'd-none', remove it (show). If it doesn't, add it (hide).
            targetPanel.classList.toggle('d-none');
            
            // B. Toggle the button's active state
            clickedButton.classList.toggle('active-tab');

            // C. Optional: Run any necessary resize/init functions when showing the map
            // This condition checks if the panel is currently SHOWN (i.e., does NOT contain 'd-none')
            if (targetId === 'mapEditorPanel' && !targetPanel.classList.contains('d-none')) {
                if (window.app && window.app.mapEditor && window.app.mapEditor.onTabShown) {
                    window.app.mapEditor.onTabShown();
                }
            }
        }
        
        // **NOTE**: The "Hide ALL" logic (from the radio behavior) has been removed.
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
        const targetId = button.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);

        // If the button is active and the panel exists, ensure the panel is visible 
        // by removing 'd-none' if present.
        if (button.classList.contains('active-tab') && targetPanel) {
             targetPanel.classList.remove('d-none');
             
             // Run the map resize if it's the map panel
             if (targetId === 'mapEditorPanel' && window.app && window.app.mapEditor && window.app.mapEditor.onTabShown) {
                window.app.mapEditor.onTabShown();
            }
        }
        // If a button is NOT active, its panel should start hidden (have 'd-none').
    });
});