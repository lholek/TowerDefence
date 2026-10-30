import Game from './Game.js';
import { MusicManager } from './Music.js';
import { fillMinimap } from './minimapTiles.js';

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('gameCanvas');
    canvas.style.width = '1230px';
    canvas.style.height = '600px';

    canvas.width = 1230;  // Internal drawing width
    canvas.height = 600;  // Internal drawing height

    // --- Elementy pro startovací obrazovku ---
    const mapSelect = document.getElementById('mapSelect');
    const mapFileInput = document.getElementById('mapFileInput');
    const mapFileName = document.getElementById('mapFileName');
    const clearMapFileBtn = document.getElementById('clearMapFileBtn');
    const startBtn = document.getElementById('startButton');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mapSelectArea = document.getElementById('mapSelectionArea');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const modeSelectBtn = document.getElementById('modeSelectBtn');
    const modeFileBtn = document.getElementById('modeFileBtn');

    let game;

    // Reflects the currently selected custom map file (or lack thereof) in
    // the #mapFileName label next to the "Choose File" button, turning it
    // yellow once a valid file is picked.
    function refreshFileNameDisplay() {
        const file = mapFileInput.files[0];
        if (file) {
            mapFileName.textContent = file.name;
            mapFileName.classList.add('has-file');
            clearMapFileBtn.classList.add('is-visible');
        } else {
            mapFileName.textContent = 'No file selected';
            mapFileName.classList.remove('has-file');
            clearMapFileBtn.classList.remove('is-visible');
        }
    }

    // Start Game only makes sense once there's actually a map to load - in
    // Custom maps mode that means a file has to be chosen first.
    function updateStartButtonState() {
        const isFileModeActive = modeFileBtn.classList.contains('active-mode');
        startBtn.disabled = isFileModeActive && !mapFileInput.files.length;
    }

    function loadMapDataFromFile(file) {
        return new Promise((resolve, reject) => {
            const mapFileInput = document.getElementById('mapFileInput');

            // 1. Check file extension
            if (!file.name.toLowerCase().endsWith('.json')) {
                if (mapFileInput) mapFileInput.value = ""; // Delete/Clear the file
                refreshFileNameDisplay();
                updateStartButtonState();
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
                    refreshFileNameDisplay();
                    updateStartButtonState();
                    reject(e);
                }
            };

            reader.onerror = () => {
                if (mapFileInput) mapFileInput.value = "";
                refreshFileNameDisplay();
                updateStartButtonState();
                reject(new Error("Read error"));
            };
            reader.readAsText(file);
        });
    }

    // Text from a map file goes into innerHTML below - escape it (custom maps are user files)
    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Centered message across the whole map card (empty / error)
    function showMapMessage(infoDiv, html) {
        infoDiv.innerHTML = `<div class="mc-message">${html}</div>`;
    }
    const MAP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="url(#mcGold)" stroke="#4a2c0c" stroke-width=".8" stroke-linejoin="round" d="M3 5.5 9 3l6 2.5L21 3v15.5L15 21l-6-2.5L3 21z"/><path stroke="#4a2c0c" stroke-width=".9" opacity=".6" d="M9 3v15.5M15 5.5V21"/></svg>';

    // Only the newest request may fill the card - quick prev / next clicks
    // could otherwise let an older, slower fetch overwrite a newer map
    let previewRequest = 0;

    async function updateMapPreview() {
        const infoDiv = document.getElementById('mapInfo');
        const request = ++previewRequest;

        try {
            const isFileMode = modeFileBtn.classList.contains('active-mode');
            let map;
            let label;

            if (isFileMode) {
                if (!mapFileInput.files.length) {
                    showMapMessage(infoDiv, `${MAP_ICON}No map selected - choose a .json file above`);
                    return;
                }

                const data = await loadMapDataFromFile(mapFileInput.files[0]);
                map = data.maps ? data.maps[0] : data;
                label = (map && map.name) || mapFileInput.files[0].name.replace(/\.json$/i, '');

            } else {
                if (!mapSelect.value) {
                    showMapMessage(infoDiv, `${MAP_ICON}No map selected`);
                    return;
                }

                const res = await fetch(mapSelect.value, { cache: 'no-cache' }); // see Game.js loadGameData
                if (!res.ok) throw new Error('Fetch failed');
                const data = await res.json();
                map = data.maps ? data.maps[0] : data;
                label = mapSelect.selectedOptions[0] ? mapSelect.selectedOptions[0].textContent : '';
            }

            if (request !== previewRequest) return;
            if (!map) {
                showMapMessage(infoDiv, `${MAP_ICON}Invalid map data.`);
                return;
            }

            renderMapCard(infoDiv, map, label);

        } catch (err) {
            if (request !== previewRequest) return;
            // This displays your requested Alpha 0.1.4 error notice
            showMapMessage(infoDiv, `
                <div class="import-error-notice">
                    <h3>Malformed data for Map</h3>
                    <p>Reason: ${escapeHtml(err.message)}</p>
                </div>
            `);
        }
    }

    // The map card (css/map_select.css): name + subtitle + difficulty stars,
    // description, 4 stats, abilities as chips and the minimap
    function renderMapCard(infoDiv, map, label) {
        const d = (map.description && map.description[0]) || {};
        // "Adventure Map VI (Crossroads of Realms)" -> name + subtitle
        const parts = /^(.*?)\s*\((.*)\)\s*$/.exec(label || '');
        const name = parts ? parts[1] : (label || 'Unnamed map');
        const subtitle = parts ? parts[2] : '';

        const stars = [...String(d.difficulty || '')].filter(c => c === '⭐').length || parseInt(d.difficulty) || 0;
        const star = (on) => `<svg class="${on ? 'on' : 'off'}" viewBox="0 0 24 24"><use href="#mcStar"/></svg>`;
        const life = map.extraLife !== false;
        const abilities = map.abilities || [];
        const rows = (map.layout && map.layout.length) || 0;
        const cols = (rows && map.layout[0].length) || 0;

        infoDiv.innerHTML = `
            <div class="mc-info">
                <div class="mc-head">
                    <div class="mc-name">
                        <h3 title="${escapeHtml(name)}">${escapeHtml(name)}</h3>
                        ${subtitle ? `<div class="mc-sub">${escapeHtml(subtitle)}</div>` : ''}
                    </div>
                    <div class="mc-stars" title="Difficulty ${stars} / 5">${[1, 2, 3, 4, 5].map(i => star(i <= stars)).join('')}</div>
                </div>

                <div class="mc-desc">${escapeHtml(d.descriptionText || 'No description.')}</div>

                <div class="mc-stats">
                    <div class="mc-stat">
                        <span class="mc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="url(#mcGold)" stroke="#4a2c0c" stroke-width=".8" stroke-linejoin="round" d="M5 2.5h2V22H5zM7 3.5h12.5l-3.2 4.2 3.2 4.3H7z"/><path fill="#7a4a12" d="M10 6.2h4.5L13 7.7l1.5 1.6H10z"/></svg></span>
                        <span class="mc-stat-text"><span class="mc-label">Levels</span><b class="mc-value">${escapeHtml(d['level count'] || '-')}</b></span>
                    </div>
                    <div class="mc-stat">
                        <span class="mc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="url(#mcGold)" fill-rule="evenodd" stroke="#4a2c0c" stroke-width=".8" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3.4a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2z"/><path fill="url(#mcGold)" stroke="#4a2c0c" stroke-width=".8" stroke-linejoin="round" d="M16 8 13.2 13.2 8 16 10.8 10.8z"/><path fill="#7a4a12" d="M8 16 10.8 10.8 13.2 13.2z"/><circle cx="12" cy="12" r="1.1" fill="#4a2c0c"/></svg></span>
                        <span class="mc-stat-text"><span class="mc-label">Map Size</span><b class="mc-value">${escapeHtml(String(d.map_size || '-').replace('x', ' × '))}</b></span>
                    </div>
                    <div class="mc-stat">
                        <span class="mc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="url(#mcGold)" fill-rule="evenodd" stroke="#4a2c0c" stroke-width=".8" d="M5 2h3v2h2V2h4v2h2V2h3v5l-2 2v11h2v2H5v-2h2V9L5 7zM10.5 20v-3.5a1.5 1.5 0 0 1 3 0V20zM11 11h2v3h-2z"/></svg></span>
                        <span class="mc-stat-text"><span class="mc-label">Towers</span><b class="mc-value">${Object.keys(map.towerTypes || {}).length || '-'}</b></span>
                    </div>
                    <div class="mc-stat ${life ? 'mc-life-yes' : 'mc-life-no'}">
                        <span class="mc-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="url(#mcHeart)" stroke="#4a0d08" stroke-width=".8" d="M12 21s-7.5-4.6-9.5-9.2C1 8.2 3.2 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.6 0 5.8 3.7 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg></span>
                        <span class="mc-stat-text"><span class="mc-label">Extra Life</span><b class="mc-value" title="${life ? 'Yes' : 'No'}">${life ? '✔' : '✖'}</b></span>
                    </div>
                </div>

                <div class="mc-abilities">
                    <span class="mc-label">Abilities</span>
                    <div class="mc-chips">${abilities.length
                        ? abilities.map(ab => `<span class="mc-chip" title="${ab.type === 'global' ? 'Global' : 'Targeted'}">${escapeHtml((ab.ui && ab.ui.icon) || '')} ${escapeHtml(ab.name || '')}</span>`).join('')
                        : '<span class="mc-none">No abilities on this map</span>'}</div>
                </div>
            </div>

            <div class="mc-map">
                <div class="mc-frame">
                    <div class="mc-minimap"></div>
                    ${cols ? `<span class="mc-size">${cols} × ${rows}</span>` : ''}
                </div>
            </div>
        `;
        fillMinimap(infoDiv.querySelector('.mc-minimap'), map);
    }
    // --- Logika přepínání režimů mapy (Select / File) ---

    // Standard / Custom maps tabs - the brown thumb slides under the active one (.is-custom)
    const mapModeTabs = document.getElementById('mapModeTabs');

    // Nastaví výchozí režim ('' = the display from the CSS, flex for the select row)
    mapSelectArea.style.display = '';
    fileUploadArea.style.display = 'none';
    modeSelectBtn.classList.add('active-mode');
    updateStartButtonState();

    modeSelectBtn.addEventListener('click', () => {
        mapSelectArea.style.display = '';
        fileUploadArea.style.display = 'none';
        modeSelectBtn.classList.add('active-mode');
        modeFileBtn.classList.remove('active-mode');
        mapModeTabs.classList.remove('is-custom');
        updateStartButtonState();
        updateMapPreview(); // refresh preview from the SELECT dropdown
    });

    modeFileBtn.addEventListener('click', () => {
        mapSelectArea.style.display = 'none';
        fileUploadArea.style.display = 'block';
        modeFileBtn.classList.add('active-mode');
        modeSelectBtn.classList.remove('active-mode');
        mapModeTabs.classList.add('is-custom');
        updateStartButtonState();
        updateMapPreview(); // refresh preview - shows the already-chosen file again, or "No map selected"
    });

    // Prev / next arrows around the map select - step through the list (wraps around).
    // Setting .value keeps the custom select in sync (CustomSelect.js), the 'change'
    // event runs the same listeners as picking the map by hand.
    const stepMap = (dir) => {
        const count = mapSelect.options.length;
        if (!count) return;
        const i = (mapSelect.selectedIndex + dir + count) % count;
        mapSelect.value = mapSelect.options[i].value;
        mapSelect.dispatchEvent(new Event('change'));
    };
    document.getElementById('prevMapBtn').addEventListener('click', () => stepMap(-1));
    document.getElementById('nextMapBtn').addEventListener('click', () => stepMap(1));

    // Handle pause after leave window (již existující funkce)
    window.addEventListener('blur', pauseOnBlur);

    // Remembers whichever map (preset URL string, or parsed file JSON object) is
    // currently in play, so Restart (see window.restartCurrentGame below) can
    // reload the exact same map without the user having to reselect it.
    let currentMapSource = null;

    // Tears down the running game (if any) and boots a fresh one from mapSource.
    // Shared by the Start button and the pause menu's Restart button.
    function startGame(mapSource) {
        // 1. Show loading
        loadingOverlay.style.display = 'flex';
        document.getElementById('startOverlay').style.display = 'none';

        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    // 2. Kill the old game (this replaces the canvas)
                    if (game) {
                        game.destroy();
                    }

                    // 3. FIND THE FRESH CANVAS (The one created by destroy)
                    const freshCanvas = document.getElementById('gameCanvas');

                    // 4. Start the NEW game on the NEW canvas
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

                    // New Game instances default to 1x (see Game.js's constructor),
                    // but the <select> keeps whatever the player last picked - sync
                    // it back to 1x so the dropdown matches the actual game speed.
                    if (gameSpeedSelect) {
                        gameSpeedSelect.value = "1";
                        gameSpeedSelect.classList.remove('is-boosted');
                    }

                    loadingOverlay.style.display = 'none';
                } catch (error) {
                    console.error("Game start failed:", error);
                    loadingOverlay.style.display = 'none';
                }
                resolve();
            }, 50);
        });
    }

    // Exposed for UI.js's pause-menu "Restart" button, which has no direct
    // access to this module's closure (game, currentMapSource, startGame).
    window.restartCurrentGame = () => {
        if (!currentMapSource) return;
        return startGame(currentMapSource);
    };

    // --- Logika tlačítka Start Game (s podporou souboru) ---
    startBtn.addEventListener('click', async () => {
        // 1. Get the map data (preset or file)
        const isFileModeActive = modeFileBtn.classList.contains('active-mode');
        let mapSource = isFileModeActive ? await loadMapDataFromFile(mapFileInput.files[0]) : mapSelect.value;
        if (!mapSource) return;

        currentMapSource = mapSource;
        await startGame(mapSource);
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
            // The Log popup is driven by PopupController, which already has its
            // own ESC-close (and auto-unpauses when it does) - skip here so we
            // don't also toggle pause and end up double-toggling it back.
            // (Not needed for the Return/Pause popup itself - togglePause() IS
            // what shows/hides it, so ESC/P must keep reaching it below.)
            const logPopup = document.getElementById('logPopup');
            if (logPopup?.classList.contains('is-open')) return;

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

    // --- Show/Hide Image button (lets the player see the full background image) ---
    const toggleMenuBtn = document.getElementById('toggleMenuBtn');
    const menuContainer = document.querySelector('.menu-container');
    const titlesContainer = document.querySelector('.titles');
    if (toggleMenuBtn && menuContainer) {
        toggleMenuBtn.addEventListener('click', () => {
            const isHidden = menuContainer.classList.toggle('menu-hidden');
            if (titlesContainer) titlesContainer.classList.toggle('menu-hidden', isHidden);
            toggleMenuBtn.textContent = isHidden ? 'Show Main Menu' : 'View Full Image';
        });
    }


    mapSelect.addEventListener('change', updateMapPreview);
    mapFileInput.addEventListener('change', () => {
        refreshFileNameDisplay();
        updateStartButtonState();
        updateMapPreview();
    });

    // Clearing lives inside the <label for="mapFileInput">, so its own click
    // would otherwise also bubble up and re-open the file dialog - stop that.
    clearMapFileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        mapFileInput.value = '';
        refreshFileNameDisplay();
        updateStartButtonState();
        updateMapPreview();
    });

    /* Setting Game speed */
    if (gameSpeedSelect) {
        gameSpeedSelect.addEventListener('change', (e) => {
            const speed = parseFloat(e.target.value);
            // Gentle pulse reminder while running above/below normal speed
            gameSpeedSelect.classList.toggle('is-boosted', speed !== 1);
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
            // UI Cleanup: hide the start-menu titles (startGame() below already
            // hides startOverlay, boots the game, and shows the game container).
            if(document.getElementById('title')) document.getElementById('title').style.display = 'none';
            if(document.getElementById('subtitle')) document.getElementById('subtitle').style.display = 'none';

            // Remember this map so the pause menu's Restart button can reload it too -
            // without this, restarting a URL-shared custom map had nothing to restart
            // (currentMapSource stayed null) and left the game stuck/broken.
            currentMapSource = importedData;
            await startGame(importedData);

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