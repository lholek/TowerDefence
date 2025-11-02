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

    //Render Minimap
    function renderMinimap(mapData) {
      // find or create container elements safely
      const mapInfo = document.getElementById('mapInfo');
      if (!mapInfo) {
        console.warn('renderMinimap: #mapInfo not found in DOM. Aborting minimap render.');
        return;
      }
    
      // create/map name element if missing
      let nameEl = document.getElementById('mapName');
      if (!nameEl) {
        nameEl = document.createElement('h3');
        nameEl.id = 'mapName';
        mapInfo.prepend(nameEl); // add at top
      }
    
      // create/description element if missing
      let descEl = document.getElementById('mapDescription');
      if (!descEl) {
        descEl = document.createElement('p');
        descEl.id = 'mapDescription';
        nameEl.insertAdjacentElement('afterend', descEl);
      }
    
      // minimap container
      let minimap = document.getElementById('minimap');
      if (!minimap) {
        const container = document.createElement('div');
        container.id = 'minimapContainer';
        const inner = document.createElement('div');
        inner.id = 'minimap';
        container.appendChild(inner);
        mapInfo.appendChild(container);
        minimap = inner;
      }
    
      // clear previous
      minimap.innerHTML = '';
    
      // Update name/description safely
      const mapName = mapData.name || 'Unnamed Map';
      const desc = (mapData.description && mapData.description[0] && mapData.description[0].descriptionText) || '';
      nameEl.textContent = mapName;
      descEl.textContent = desc;
    
      // layout must be an array of strings
      if (!mapData.layout || !Array.isArray(mapData.layout) || mapData.layout.length === 0) {
        console.warn('renderMinimap: invalid layout in mapData', mapData);
        return;
      }
    
      const rows = mapData.layout.length;
      const cols = mapData.layout[0].length;
    
      // set grid template based on rows/cols
      const tileSize = 10; // px - tweak if needed
      minimap.style.gridTemplateRows = `repeat(${rows}, ${tileSize}px)`;
      minimap.style.gridTemplateColumns = `repeat(${cols}, ${tileSize}px)`;
    
      // create tiles
      for (let r = 0; r < rows; r++) {
        const rowStr = mapData.layout[r];
        for (let c = 0; c < cols; c++) {
          const ch = rowStr[c] || 'X';
          const tile = document.createElement('div');
          tile.className = 'minimap-tile';
          if (ch === 'O') tile.classList.add('path');
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

    const shopWrapper = document.getElementById('shopWrapper');

    shopWrapper.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        shopWrapper.scrollLeft += e.deltaY;
      }
    });
});
