document.addEventListener('DOMContentLoaded', () => {
    // 1. Get all the buttons that act as toggles
    const toggleButtons = document.querySelectorAll('.editor-tabs .btn');
    
    // 2. Add a click listener to each button
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            
            // Call the function to toggle the visibility
            toggleEditorPanel(targetId, button);
        });
    });

    /**
     * Toggles the visibility of a single editor panel (checkbox behavior).
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
            // Use the 'active-tab' class to indicate if the panel is currently visible.
            clickedButton.classList.toggle('active-tab');
        }

        // C. Optional: Run any necessary resize/init functions when showing the map
        if (targetId === 'mapEditorPanel' && !targetPanel.classList.contains('d-none')) {
            // Only runs if the map is being SHOWN
            if (window.app.mapEditor && window.app.mapEditor.onTabShown) {
                window.app.mapEditor.onTabShown();
            }
        }
    }
});