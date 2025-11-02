import Game from './Game.js';
import { MusicManager } from './Music.js';

document.addEventListener('DOMContentLoaded', async () => {
    const musicManager = new MusicManager();
    const canvas = document.getElementById('gameCanvas');
    canvas.style.width = '1000px';
    canvas.style.height = '600px';

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
            /*document.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'p') {
                    e.preventDefault();
                    game.togglePause();
                }
            });*/
        
            game.start();
        } catch (err) {
            console.error("Failed to load game data:", err);
            alert("Failed to load the selected map. Check console for details.");
        }
    });

    // Pause handling
    const pauseBtn = document.getElementById('pauseButton');
    //const overlayClose = document.getElementById('overlayClose');

    pauseBtn.addEventListener('click', () => game?.togglePause());
    document.addEventListener('keydown', (e) => {
    if (!game) return; // ignore keypress if game not started
        if (e.key.toLowerCase() === 'p') { // normalize key
            game.togglePause();
        }
    });

    /*overlayClose.addEventListener('click', () => {
        document.getElementById('gameOverlay').style.display = 'none';
        game?.togglePause();
    });*/

    //Map info
    mapSelect.addEventListener('change', async () => {
        const selectedMapFile = mapSelect.value;
        const infoDiv = document.getElementById('mapInfo');
        infoDiv.innerHTML = 'Loading map info...';
        
        try {
          const res = await fetch(selectedMapFile);
          if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
          const data = await res.json();
          const map = data.maps[0];
        
          if (map && map.description && map.description.length > 0) {
            const desc = map.description[0]; // use first description object
            infoDiv.innerHTML = `
              <h3>${map.name}</h3>
              <p><b>Description:</b> ${desc.descriptionText}</p>
              <p><b>Level count:</b> ${desc['level count'] || '-'}</p>
              <p><b>Difficulty:</b> ${desc.difficulty || '-'}</p>
              <p><b>Tower Types:</b> ${desc['tower types'] || '-'}</p>
            `;
          } else {
            infoDiv.textContent = "No description available.";
          }
        } catch (err) {
          console.error("Error loading map description:", err);
          infoDiv.textContent = "Failed to load map info.";
        }
    });

    const shopWrapper = document.getElementById('shopWrapper');

    shopWrapper.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        shopWrapper.scrollLeft += e.deltaY;
      }
    });
});
