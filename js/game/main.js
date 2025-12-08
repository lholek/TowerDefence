import Game from './Game.js';
import { MusicManager } from './Music.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Inicializace ---
    const musicManager = new MusicManager();
    const canvas = document.getElementById('gameCanvas');
    canvas.style.width = '1000px';
    canvas.style.height = '600px';

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
});