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
    const loadingOverlay = document.getElementById('loadingOverlay');
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

    // Handle pause after leave window (již existující funkce)
    window.addEventListener('blur', pauseOnBlur);

    // --- Logika tlačítka Start Game (s podporou souboru) ---
    startBtn.addEventListener('click', async () => {
        // 1. Get the map data (preset or file)
        const isFileModeActive = modeFileBtn.classList.contains('active-mode');
        let mapSource = isFileModeActive ? await loadMapDataFromFile(mapFileInput.files[0]) : mapSelect.value;
        if (!mapSource) return;

        // 2. Show loading
        loadingOverlay.style.display = 'flex';
        document.getElementById('startOverlay').style.display = 'none';

        setTimeout(async () => {
            try {
                // 3. Kill the old game (this replaces the canvas)
                if (game) {
                    game.destroy(); 
                }

                // 4. FIND THE FRESH CANVAS (The one created by destroy)
                const freshCanvas = document.getElementById('gameCanvas');

                // 5. Start the NEW game on the NEW canvas
                game = new Game(freshCanvas);
                window.game = game; // Essential for UI.js to work

                await game.loadGameData(mapSource);
                game.start();
                document.getElementById('mainContainer').style.display = 'block'; // The game area
                document.getElementById('selectionIndicator').style.display = 'block';

                const towerBtn = document.getElementById('towerModeBtn');
                const abilityBtn = document.getElementById('abilityModeBtn');

                towerBtn?.click();

                towerBtn?.classList.add('active');
                abilityBtn?.classList.remove('active');
                
                loadingOverlay.style.display = 'none';
            } catch (error) {
                console.error("Game start failed:", error);
                loadingOverlay.style.display = 'none';
            }
        }, 50);
    });

    // --- Existující funkce pro pauzu ---
    function pauseOnBlur() {
        if (game && game.gameStarted && !game.paused) {
            game.togglePause();
        }
    }

    // --- Logika pro klávesové zkratky (P = Pause) ---
    document.addEventListener('keydown', (e) => {
        if ((e.key.toLowerCase() === 'p') || (e.key === 'Escape')) {
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

      // Check the boolean condition first
      if (isPathTile) {
        tile.classList.add('path');
      } else {
        // Use switch for specific string identifiers
        switch (tileIdentifier) {
          case '-':
            tile.classList.add('sky');
            break;
          case 'W':
            tile.classList.add('water');
            break;
          case 'M':
            tile.classList.add('mountain');
            break;
          case 'SND':
          case 'SND[BONE-1]':
          case 'SND[BONE-2]':
          case 'SND[BONE-3]':
          case 'SND[BONE-4]':
            tile.classList.add('sand');
            break;
          case 'SNW':
            tile.classList.add('snow');
            break;
          case 'SNW[SPIKE-1]':
          case 'SNW[SPIKE-2]':
          case 'SNW[SPIKE-3]':
          case 'SNW[SPIKE-4]':
            tile.classList.add('snw-spike');
            break;
          case 'HLG':
            tile.classList.add('holy');
            break;
          case 'BRG':
            tile.classList.add('burned');
            break;
          case 'X[Tree]':
            tile.classList.add('tree');
            break;
          case 'SNW[Tree]':
            tile.classList.add('snow-tree');
            break;
          case 'X[Log-1]':
          case 'X[Log-2]':
            tile.classList.add('log');
            break;
          case 'X[Well]':
            tile.classList.add('well');
            break;
          case 'X[Bush]':
            tile.classList.add('bush');
            break;
          case 'W[Rock-1]':
          case 'W[Rock-2]':
          case 'W[Rock-3]':
          case 'W[Rock-4]':
            tile.classList.add('water');
            break;
          case 'O[SND]':
          case 'O[SNW]':
            tile.classList.add('path');
            break;
          case 'ICE':
            tile.classList.add('ice');
            break;
          case 'LAVA':
            tile.classList.add('lava');
            break;
          default:
            tile.classList.add('block');
            break;
        }
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

    const urlParams = new URLSearchParams(window.location.search);
    /* ------------------------------------------ */
    /* ------------ SHARE LINK / TEST MAP LOGIC ------------ */
    /* ------------------------------------------ */
    // New function for Hashes
    async function loadMapFromHash(hash) {
        try {
            // 1. Restore Base64 padding and characters
            const base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
            const binaryString = atob(base64);
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        
            // 2. Decompress Gzip
            const decompressionStream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
            const decompressedResponse = new Response(decompressionStream);
            const jsonString = await decompressedResponse.text();
            
            return JSON.parse(jsonString);
        } catch (err) {
            console.error("Failed to unpack custom map:", err);
            return null;
        }
    }

    // --- Check for Shared Custom Map in URL ---
    // --- Check for Shared Custom Map in URL ---
    const customMapHash = urlParams.get('customMap');
    const errorPopupController = new PopupController(null, 'errorPopup');

    if (customMapHash) {
        const importedData = await loadMapFromHash(customMapHash);

        if (importedData) {
            // 1. UI Cleanup: Hide overlays and titles
            document.getElementById('startOverlay').style.display = 'none';
            if(document.getElementById('title')) document.getElementById('title').style.display = 'none';
            if(document.getElementById('subtitle')) document.getElementById('subtitle').style.display = 'none';

            // 2. Kill old game if it exists (replaces the canvas)
            if (game) {
                game.destroy(); 
            }

            // 3. Get the FRESH canvas created by destroy()
            const freshCanvas = document.getElementById('gameCanvas');

            // 4. Initialize Game properly
            game = new Game(freshCanvas);
            window.game = game; // Essential for UI.js and global pause listeners
            game.setSpeed(1);

            await game.loadGameData(importedData);
            game.start();

            // 5. Show the game container and force UI state
            document.getElementById('mainContainer').style.display = 'block';
            document.getElementById('selectionIndicator').style.display =  'block';

            // This ensures the shop/abilities buttons are responsive
            document.getElementById('showTowersBtn')?.click(); 
        } else {
            window.history.replaceState({}, document.title, window.location.pathname);
            errorPopupController.open();
        }
    }
    /* ------------------------------------------ */
    /* ------------ SHARE LINK / TEST MAP LOGIC ------------ */
    /* ------------------------------------------ */
});