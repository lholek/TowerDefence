import Game from './Game.js';

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = 1000;
    canvas.height = 600;

    // Read map selection
    const mapSelect = document.getElementById('mapSelect');
    const startBtn = document.getElementById('startButton');

    let game;

    startBtn.addEventListener('click', async () => {
        // Get JSON file directly from dropdown
        const selectedMapFile = mapSelect.value;
        
        // Hide start overlay
        document.getElementById('startOverlay').style.display = 'none';
        
        // Create game instance
        game = new Game(canvas);
        
        try {
            // Load selected map
            await game.loadGameData(selectedMapFile);
            window.game = game; // expose for debug
        
            // Attach pause listener AFTER game is created
            document.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'p') {
                    e.preventDefault();
                    game.togglePause();
                }
            });
        
            game.start();
        } catch (err) {
            console.error("Failed to load game data:", err);
            alert("Failed to load the selected map. Check console for details.");
        }
    });

    // Pause handling
    const pauseBtn = document.getElementById('pauseButton');
    const overlayClose = document.getElementById('overlayClose');

    pauseBtn.addEventListener('click', () => game?.togglePause());
    document.addEventListener('keydown', (e) => {
    if (!game) return; // ignore keypress if game not started
        if (e.key.toLowerCase() === 'p') { // normalize key
            game.togglePause();
        }
    });

    overlayClose.addEventListener('click', () => {
        document.getElementById('gameOverlay').style.display = 'none';
        game?.togglePause();
    });
});
