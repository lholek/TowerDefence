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
            
            // Switch back to towers
            const towerModeBtn = document.getElementById('towerModeBtn');
            towerModeBtn.click();            
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

    //Render Minimap
    function renderMinimap(mapData) {
      const minimap = document.getElementById('minimap');
      if (!minimap) return;
      minimap.innerHTML = '';
        
      const rows = mapData.layout.length;
      const cols = mapData.layout[0].length;
      const tileSize = 10;
      minimap.style.gridTemplateRows = `repeat(${rows}, ${tileSize}px)`;
      minimap.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;
        
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tok = mapData.layout[r][c];
          const tile = document.createElement('div');
          tile.className = 'minimap-tile';
          if (tok === 'O') tile.classList.add('path');
          else if (/^S/i.test(tok)) tile.classList.add('start');
          else if (/^E/i.test(tok)) tile.classList.add('end');
          else tile.classList.add('block');
          minimap.appendChild(tile);
        }
      }
    }

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
              <p><b>Description:</b> ${desc.descriptionText}</p>
              <p><b>Level count:</b> ${desc['level count'] || '-'}</p>
              <p><b>Difficulty:</b> ${desc.difficulty || '-'}</p>
              <p><b>Tower Types:</b> ${desc['tower types'] || '-'}</p>
              <p><b>Abilities:</b> ${desc['abilites'] || '-'}</p>
            `;
            renderMinimap(map);
          } else {
            infoDiv.textContent = "No description available.";
          }
        } catch (err) {
          console.error("Error loading map description:", err);
          infoDiv.textContent = "Failed to load map info.";
        }
    });

    const showTowersBtn = document.getElementById('showTowersBtn');
    const showAbilitiesBtn = document.getElementById('showAbilitiesBtn');
    const shopWrapper = document.getElementById('shopWrapper');
    const abilityBar = document.getElementById('abilityBar');
      
    showTowersBtn.addEventListener('click', () => {
      shopWrapper.style.display = 'flex';
      abilityBar.style.display = 'none';
      // IMPORTANT: do NOT cancel active ability here — keep placement state
    });
    
    showAbilitiesBtn.addEventListener('click', () => {
      shopWrapper.style.display = 'none';
      abilityBar.style.display = 'flex';
      // If an ability is active, keep UI indicator (we update that elsewhere)
    });
});
