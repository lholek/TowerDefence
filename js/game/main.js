import Game from './Game.js';
import { MusicManager } from './Music.js';

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    canvas.style.width = '1230px';
    canvas.style.height = '600px';

    canvas.width = 1230;  // Internal drawing width
    canvas.height = 600;  // Internal drawing height

    // --- Elementy pro startovací obrazovku ---
    const mapSelect = document.getElementById('mapSelect');
    const mapFileInput = document.getElementById('mapFileInput');
    const startBtn = document.getElementById('startButton');
    const mapSelectArea = document.getElementById('mapSelectionArea');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const modeSelectBtn = document.getElementById('modeSelectBtn');
    const modeFileBtn = document.getElementById('modeFileBtn');

    let game;

    function loadMapDataFromFile(file) {
        return new Promise((resolve, reject) => {
            const mapFileInput = document.getElementById('mapFileInput');

            // 1. Check file extension
            if (!file.name.toLowerCase().endsWith('.json')) {
                if (mapFileInput) mapFileInput.value = ""; // Delete/Clear the file
                reject(new Error("File must be a .json file."));
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const mapData = JSON.parse(event.target.result);
                
                    // 2. Validate Root Structure
                    if (!mapData.maps || !Array.isArray(mapData.maps) || mapData.maps.length === 0) {
                        throw new Error("Missing 'maps' array.");
                    }
                
                    // 3. Validate Required Sub-items
                    const m = mapData.maps[0];
                    const requiredFields = [
                        'name', 'startingCoins', 'startingLifes', 'layout', 
                        'towerTypes', 'levels', 'description'
                    ];
                
                    const missing = requiredFields.filter(field => !m.hasOwnProperty(field));
                    if (missing.length > 0) {
                        throw new Error(`Missing fields: ${missing.join(', ')}`);
                    }
                
                    resolve(mapData);
                } catch (e) {
                    if (mapFileInput) mapFileInput.value = ""; // Delete/Clear the file
                    reject(e);
                }
            };

            reader.onerror = () => {
                if (mapFileInput) mapFileInput.value = "";
                    reject(new Error("Read error"));
            };
            reader.readAsText(file);
        });
    }

    async function updateMapPreview() {
        const infoDiv = document.getElementById('mapInfo');
        infoDiv.innerHTML = 'Loading map info...';

        try {
            const isFileMode = modeFileBtn.classList.contains('active-mode');
            let map;

            if (isFileMode) {
                if (!mapFileInput.files.length) {
                    infoDiv.textContent = 'No map file selected.';
                    return;
                }

                const data = await loadMapDataFromFile(mapFileInput.files[0]);
                map = data.maps ? data.maps[0] : data;

            } else {
                if (!mapSelect.value) {
                    infoDiv.textContent = 'No map selected.';
                    return;
                }

                const res = await fetch(mapSelect.value);
                if (!res.ok) throw new Error('Fetch failed');
                const data = await res.json();
                map = data.maps ? data.maps[0] : data;
            }

            if (!map) {
                infoDiv.textContent = 'Invalid map data.';
                return;
            }

            // ✅ description
            if (map.description && map.description.length) {
                const d = map.description[0];
                // Create a 2-column layout wrapper
                infoDiv.innerHTML = `
                    <div class="map-preview-wrapper">
                        <div class="map-stats-col">
                            <table class="map-info-table">
                                <tr><td><b>Description:</b></td><td class="description">${d.descriptionText || '-'}</td></tr>
                                <tr><td><b>Level Count:</b></td><td>${d['level count'] || '-'}</td></tr>
                                <tr><td><b>Difficulty:</b></td><td>${d.difficulty || '-'}</td></tr>
                                <tr><td><b>Map Size:</b></td><td>${d.map_size || '-'}</td></tr>
                                <tr><td><b>Towers:</b></td><td>${Object.keys(map.towerTypes).length || '-'} types</td></tr>
                                <tr><td><b>Extra Life:</b></td><td class="info-table-life ${map.extraLife === false ? 'info-table-life-no' : 'info-table-life-yes'}">${map.extraLife === false ? '✖' : '✔'}</td></tr>
                                <tr>
                                    <td><b>Abilities:</b></td>
                                    <td class="ability-list">
                                        ${map.abilities && map.abilities.length > 0
                                            ? map.abilities.map(ab => `<span>${ab.ui.icon} ${ab.name}</span>`).join('<br>')
                                            : '-'
                                        }
                                    </td>
                                </tr>
                            </table>
                        </div>
                                    
                        <div id="minimapContainer">
                            <div id="minimap"></div>
                        </div>
                    </div>
                `;
                                    
                // Call the minimap render function
                renderMinimap(map); 
            } else {
                infoDiv.textContent = 'No description available.';
            }
            renderMinimap(map);

        } catch (err) {
            // This displays your requested Alpha 0.1.4 error notice
            infoDiv.innerHTML = `
                <div class="import-error-notice">
                    <h3>Malformed data for Map</h3>
                    <p>Reason: ${err.message}</p>
                </div>
            `;
        }
    }
    // --- Logika přepínání režimů mapy (Select / File) ---

    // Nastaví výchozí režim
    mapSelectArea.style.display = 'block';
    fileUploadArea.style.display = 'none';
    modeSelectBtn.classList.add('active-mode');

    modeSelectBtn.addEventListener('click', () => {
        mapSelectArea.style.display = 'block';
        fileUploadArea.style.display = 'none';
        modeSelectBtn.classList.add('active-mode');
        modeFileBtn.classList.remove('active-mode');
    });

    modeFileBtn.addEventListener('click', () => {
        mapSelectArea.style.display = 'none';
        fileUploadArea.style.display = 'block';
        modeFileBtn.classList.add('active-mode');
        modeSelectBtn.classList.remove('active-mode');
    });

    // --- Logika tlačítka Start Game (s podporou souboru) ---
    startBtn.addEventListener('click', async () => {

        // Forcing setting GameSpeed to 1x at start
        if (gameSpeedSelect) {
            gameSpeedSelect.value = "1";
        }

        const isFileModeActive = modeFileBtn.classList.contains('active-mode');
        let mapSource;

        if (isFileModeActive) {
            // --- REŽIM NAČÍTÁNÍ ZE SOUBORU ---
            if (mapFileInput.files.length === 0) {
                return;
            }
            
            try {
                // mapSource bude přímo JSON objekt
                mapSource = await loadMapDataFromFile(mapFileInput.files[0]);
            } catch (error) {
                console.error("Chyba při načítání lokální mapy:", error);
                alert("Nepodařilo se načíst mapu ze souboru. Zkontrolujte konzoli.");
                return;
            }

        } else {
            // --- REŽIM VÝBĚRU PŘEDNASTAVENÉ MAPY ---
            mapSource = mapSelect.value;
            if (!mapSource) {
                alert("Prosím, vyberte mapu.");
                return;
            }
        }

        // Skrýt start overlay
        document.getElementById('startOverlay').style.display = 'none';
        document.getElementById('title').style.display = 'none';
        document.getElementById('subtitle').style.display = 'none';
        
        // Vytvořit instanci hry
        game = new Game(canvas);

        game.setSpeed(1);
        
        // Handle pause after leave window (již existující funkce)
        window.addEventListener('blur', pauseOnBlur);

        try {
            // loadGameData nyní musí akceptovat URL nebo JSON objekt
            await game.loadGameData(mapSource); 
            window.game = game; // Expozice pro debug
            
            // Switch back to towers
            document.getElementById('towerModeBtn')?.click();            
            game.start();
            game.logEvent("New game <b class='cl-primary'>"+game.levelData.name+"</b> started");
        } catch (err) {
            console.error("Failed to load game data:", err);
            alert("Nepodařilo se načíst vybranou mapu. Zkontrolujte konzoli.");
        }
    });

    // --- Existující funkce pro pauzu ---
    function pauseOnBlur() {
        if (game && game.gameStarted && !game.paused) {
            game.togglePause();
        }
    }

    // --- Logika pro klávesové zkratky (P = Pause) ---
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'p') {
            if (game && game.gameStarted) {
                game.togglePause();
            }
        }
    });

    // --- Logika pro přepínání Obchod / Abilities ---
    const showTowersBtn = document.getElementById('showTowersBtn');
    const showAbilitiesBtn = document.getElementById('showAbilitiesBtn');
    const shopWrapper = document.getElementById('shopWrapper');
    const abilityBar = document.getElementById('abilityBar');
      
    if (showTowersBtn) {
        showTowersBtn.addEventListener('click', () => {
            shopWrapper.style.display = 'flex';
            abilityBar.style.display = 'none';
            // IMPORTANT: do NOT cancel active ability here — keep placement state
        });
    }
    
    if (showAbilitiesBtn) {
        showAbilitiesBtn.addEventListener('click', () => {
            shopWrapper.style.display = 'none';
            abilityBar.style.display = 'flex';
            // If an ability is active, keep UI indicator (we update that elsewhere)
        });
    }

    // --- Scroll shop kolečkem myši (horizontal scroll) ---
    if (shopWrapper) {
        shopWrapper.addEventListener('wheel', (e) => {
            // Check if the game is paused or any other condition you might need
            if (game?.paused) return; 

            // Prevent the default vertical scroll behavior
            e.preventDefault(); 

            // Update the horizontal scroll position (scrollLeft)
            // The amount of scroll is determined by e.deltaY (the vertical scroll change)
            shopWrapper.scrollLeft += e.deltaY * 2.45;
        }, { passive: false });
    }

    // --- Scroll shop kolečkem myši (horizontal scroll) ---
    if (abilityBar) {
        abilityBar.addEventListener('wheel', (e) => {
            // Check if the game is paused or any other condition you might need
            if (game?.paused) return; 

            // Prevent the default vertical scroll behavior
            e.preventDefault(); 

            // Update the horizontal scroll position (scrollLeft)
            // The amount of scroll is determined by e.deltaY (the vertical scroll change)
            abilityBar.scrollLeft += e.deltaY * 2.45;
        }, { passive: false });
    }


    // --- Link na Level Editor ---
    const editorButton = document.querySelector(".editorButton");
    if (editorButton) {
        editorButton.addEventListener('click', () => {
            window.location.href = 'level_editor.html'; 
        });
    }

    //Render minimap
 function renderMinimap(mapData) {
  const mapInfo = document.getElementById('mapInfo');
  if (!mapInfo) return;

  // 1. Ensure the container is strictly 400x400 and ignores parent layout rules
  let container = document.getElementById('minimapContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'minimapContainer';
    container.style.cssText = `
        width: 300px !important;
        height: 300px !important;
        min-width: 350px;
        min-height: 350px;
        overflow: hidden;
        background: transparent;
        border-radius: 8px;
        margin: 10px auto;
        display: block;
        flex-shrink: 0; 
    `;
    mapInfo.appendChild(container);
  }

  let minimap = document.getElementById('minimap');
  if (!minimap) {
    minimap = document.createElement('div');
    minimap.id = 'minimap';
    container.appendChild(minimap);
  }

  minimap.innerHTML = '';
  if (!mapData.layout || !Array.isArray(mapData.layout)) return;

  const rows = mapData.layout.length;
  const cols = mapData.layout[0].length;

  // 2. Set grid to fill 100% of the 400px container
  minimap.style.display = 'grid';
  minimap.style.width = '100%';
  minimap.style.height = '100%';
  
  // Using 1fr ensures that 45 columns or 25 rows fit exactly into the 400px
  minimap.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  minimap.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  for (let r = 0; r < rows; r++) {
    const rowTiles = mapData.layout[r];
    for (let c = 0; c < cols; c++) {
      const tileIdentifier = rowTiles[c] || 'X';
      const tile = document.createElement('div');
      tile.className = 'minimap-tile';
      
      // Match the identifier logic from your main.js
      const isPathTile = /^(O|S\d+|E\d+)$/.test(tileIdentifier);

      if (isPathTile) {
        tile.classList.add('path');
      } else if (tileIdentifier === '-') {
        tile.classList.add('sky');
      } else if (tileIdentifier === 'W') {
        tile.classList.add('water');
      } else if (tileIdentifier === 'M') {
        tile.classList.add('mountain');
      } else {
        tile.classList.add('block');
      }
      minimap.appendChild(tile);
    }
  }
}

    mapSelect.addEventListener('change', updateMapPreview);
    mapFileInput.addEventListener('change', updateMapPreview);

    modeSelectBtn.addEventListener('click', () => {
        mapSelectArea.style.display = 'block';
        fileUploadArea.style.display = 'none';
        modeSelectBtn.classList.add('active-mode');
        modeFileBtn.classList.remove('active-mode');

        updateMapPreview(); // ✅ refresh from SELECT
    });

    /* Setting Game speed */
    if (gameSpeedSelect) {
        gameSpeedSelect.addEventListener('change', (e) => {
            const speed = parseFloat(e.target.value);
            // Změníme rychlost jen pokud instance 'game' už existuje
            if (game) {
                game.setSpeed(speed);
            }
        });
    }
    /* Setting Game speed */
    
    // This triggers the preview for the default selected option on page load
    updateMapPreview()
});