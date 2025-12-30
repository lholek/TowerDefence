import Game from './Game.js';
import { MusicManager } from './Music.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Inicializace ---
    const musicManager = new MusicManager();
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

    // --- Pomocná funkce pro načítání souboru ---
    /**
     * Načte obsah souboru pomocí FileReader a parsuje ho jako JSON.
     * @param {File} file Soubor vybraný uživatelem z input type="file".
     * @returns {Promise<Object>} Promise, který se vyřeší s JSON objektem dat mapy.
     */
    function loadMapDataFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    // Převede obsah souboru na JSON objekt
                    const mapData = JSON.parse(event.target.result);
                    resolve(mapData);
                } catch (e) {
                    reject(new Error("Soubor není platný JSON formát."));
                }
            };

            reader.onerror = () => {
                reject(new Error("Chyba při čtení souboru."));
            };

            // Spustí čtení souboru jako text
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
                infoDiv.innerHTML = `
                    <div>
                        <p><b>Description:</b><br>${d.descriptionText || '-'}</p>
                        <p><b>Level count:</b> ${d['level count'] || '-'}</p>
                        <p><b>Difficulty:</b> ${d.difficulty || '-'}</p>
                        <p><b>Map size:</b> ${d.map_size || '-'}</p>
                        <p><b>Tower Types:</b> ${Object.keys(map.towerTypes).length || '-'}</p>
                        <p>
                        <b>Abilities:</b> 
                          ${
                            map.abilities && map.abilities.length > 0
                              ? map.abilities.map(ab => `${ab.name} ${ab.ui.icon}`).join('<br>')
                              : '-'
                          }
                        </p>
                    </div>
                `;
            } else {
                infoDiv.textContent = 'No description available.';
            }

            renderMinimap(map);

        } catch (err) {
            console.error(err);
            infoDiv.textContent = 'Failed to load map preview.';
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
        const isFileModeActive = modeFileBtn.classList.contains('active-mode');
        let mapSource; // Může být URL (string) nebo JSON objekt (object)

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
        
        // Handle pause after leave window (již existující funkce)
        window.addEventListener('blur', pauseOnBlur);

        try {
            // loadGameData nyní musí akceptovat URL nebo JSON objekt
            await game.loadGameData(mapSource); 
            window.game = game; // Expozice pro debug
            
            // Switch back to towers
            document.getElementById('towerModeBtn')?.click();            
            game.start();
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

    // --- Link na Level Editor ---
    const editorButton = document.querySelector(".editorButton");
    if (editorButton) {
        editorButton.addEventListener('click', () => {
            window.location.href = 'level_editor.html'; 
        });
    }

    //Render minimap
    function renderMinimap(mapData) {
      // find or create container elements safely
      const mapInfo = document.getElementById('mapInfo');
      if (!mapInfo) {
        console.warn('renderMinimap: #mapInfo not found in DOM. Aborting minimap render.');
        return;
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
      //nameEl.textContent = mapName;
    
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
        // Assuming mapData.layout[r] is now an ARRAY of tile identifiers
        const rowTiles = mapData.layout[r]; 
            
        // Iterate through the tile identifiers in the array
        for (let c = 0; c < cols; c++) {
          // Get the full tile identifier (e.g., 'S1', 'E2', 'O', '-')
          const tileIdentifier = rowTiles[c] || 'X'; 
          const tile = document.createElement('div');
          tile.className = 'minimap-tile';
        
          // 🌟 Use a regular expression to match all 'O', 'S[number]', and 'E[number]' patterns
          const isPathTile = /^(O|S\d+|E\d+)$/.test(tileIdentifier);

          if (isPathTile) {
            tile.classList.add('path');
          } else if (tileIdentifier === '-') {
            tile.classList.add('sky');
          } else if (tileIdentifier === 'W') {
            tile.classList.add('water');
          }  else {
            // Default for 'X' or any other unknown/unhandled identifier
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
});