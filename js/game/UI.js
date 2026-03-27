const returnButton = document.getElementById('returnButton');
const returnPopup = document.getElementById('returnPopup');
const confirmReturn = document.getElementById('confirmReturn');
const cancelReturn = document.getElementById('cancelReturn');

returnButton.addEventListener('click', () => {
    returnPopup.style.display = 'flex';
    // Only pause if the game is NOT already paused
    if (window.game && !window.game.paused) {
        window.game.togglePause();
    }
});

cancelReturn.addEventListener('click', () => {
    returnPopup.style.display = 'none';
    // Only unpause if the game WAS paused (and we are resuming)
    if (window.game && window.game.paused) {
        window.game.togglePause();
    }
});

confirmReturn.addEventListener('click', () => {
  // 1. Kill the game logic completely
  if (game) {
    game.destroy(); 
    game = null; // Important: Clear the reference
  }

  // 2. Hide all Game UIs
  document.getElementById('returnPopup').style.display = 'none';
  document.getElementById('mainContainer').style.display = 'none'; // The game area
  document.getElementById('selectionIndicator').style.display =  'none';

  
  // 3. Show the Menu UIs
  document.getElementById('startOverlay').style.display = 'flex';
  document.getElementById('title').style.display = 'block';
  document.getElementById('subtitle').style.display = 'block';

  // 4. Reset Speed UI to 1x
  const gameSpeedSelect = document.getElementById('gameSpeedSelect');
  if (gameSpeedSelect) gameSpeedSelect.value = "1";
});

// === BUILD MODE SWITCHER ===
const towerModeBtn = document.getElementById('towerModeBtn');
const abilityModeBtn = document.getElementById('abilityModeBtn');
const shopWrapper = document.getElementById('shopWrapper');
const abilityBar = document.getElementById('abilityBar');

towerModeBtn.addEventListener('click', () => {
  towerModeBtn.classList.add('active');
  abilityModeBtn.classList.remove('active');
  shopWrapper.style.display = 'flex';
  abilityBar.style.display = 'none';
});

abilityModeBtn.addEventListener('click', () => {
  abilityModeBtn.classList.add('active');
  towerModeBtn.classList.remove('active');
  shopWrapper.style.display = 'none';
  abilityBar.style.display = 'flex';
});

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
let fpsRunning = false;

// --- Create FPS display ---
const fpsDisplay = document.createElement("div");
fpsDisplay.id = "fpsDisplay";
fpsDisplay.style.position = "fixed";
fpsDisplay.style.top = "10px";
fpsDisplay.style.left = "10px";
fpsDisplay.style.padding = "5px 10px";
fpsDisplay.style.background = "rgba(0,0,0,0.5)";
fpsDisplay.style.color = "#0f0";
fpsDisplay.style.fontFamily = "monospace";
fpsDisplay.style.zIndex = "9999";
fpsDisplay.style.display = "none";
document.body.appendChild(fpsDisplay);

// --- FPS update loop ---
function updateFPS() {
  if (!fpsRunning) return;

  const now = performance.now();
  frameCount++;

  if (now - lastFrameTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastFrameTime = now;
    fpsDisplay.textContent = `FPS: ${fps}`;
  }

  requestAnimationFrame(updateFPS);
}

// === MUSIC DROPDOWN LOGIC ===
const musicBtn = document.getElementById('musicBtn');
const musicDropdown = document.getElementById('musicDropdown');

if (musicBtn && musicDropdown) {
  musicBtn.addEventListener('click', (e) => {
    // Prevent clicking the button from immediately triggering the "click outside" closer
    e.stopPropagation();

    const isVisible = musicDropdown.style.display === 'block';
    musicDropdown.style.display = isVisible ? 'none' : 'block';
  });

  // Close the music player if you click anywhere else on the screen
  document.addEventListener('click', (e) => {
    if (musicDropdown.style.display === 'block' && !musicDropdown.contains(e.target)) {
      musicDropdown.style.display = 'none';
    }
  });
}

// === GAME LOG POPUP LOGIC ===
const gameLogBtn = document.getElementById('gameLogBtn');
const logPopup = document.getElementById('logPopup');
const closeLogBtn = document.getElementById('closeLogBtn');

if (gameLogBtn && logPopup && closeLogBtn) {
  gameLogBtn.addEventListener('click', () => {
    logPopup.style.display = 'flex';
    // Pause game if it is running
    if (window.game && window.game.gameStarted && !window.game.paused) {
      window.game.togglePause();
    }
  });

  closeLogBtn.addEventListener('click', () => {
    logPopup.style.display = 'none';
    // Unpause game if it was paused (optional: keep it paused if you prefer)
    // Here we toggle it back to running if it was running before
    if (window.game && window.game.gameStarted && window.game.paused) {
      window.game.togglePause();
    }
  });
}

// --- Init settings ---
document.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("settingsPopup");
  const saveBtn = document.getElementById("saveSettingsBtn");
  const showFpsCheckbox = document.getElementById("showFpsCheckbox");
  const fpsRange = document.getElementById("fpsRange");
  const fpsNumber = document.getElementById("fpsNumber");

  // --- Load from localStorage or defaults ---
  let settings = JSON.parse(localStorage.getItem("data.fps")) || {
    showFps: false,
    targetFps: 144
  };

  // --- Clamp FPS to 30–144 range ---
  const clampFps = (val) => Math.min(144, Math.max(30, parseInt(val, 10) || 144));

  // --- Apply settings ---
  settings.targetFps = clampFps(settings.targetFps);
  showFpsCheckbox.checked = settings.showFps;
  fpsRange.min = 30;
  fpsRange.max = 144;
  fpsRange.value = settings.targetFps;
  fpsNumber.min = 30;
  fpsNumber.max = 144;
  fpsNumber.value = settings.targetFps;

  // --- Sync range <-> number ---
  fpsRange.addEventListener("input", () => {
    fpsNumber.value = clampFps(fpsRange.value);
  });
  fpsNumber.addEventListener("input", () => {
    fpsRange.value = clampFps(fpsNumber.value);
  });

  const settingsController = new PopupController('openSettingsBtn', 'settingsPopup');
  // --- Save settings ---
  saveBtn.addEventListener("click", () => {
    // 1. Uložení FPS
    const targetFps = clampFps(fpsRange.value);
    settings = {
      showFps: showFpsCheckbox.checked,
      targetFps: targetFps
    };
    localStorage.setItem("data.fps", JSON.stringify(settings));

    // 2. Uložení Pozadí
    const selectedBg = bgSelect.value;
    localStorage.setItem('game_background', selectedBg);
    applyBackground(selectedBg);

    // 3. Uložení Nové Grafiky (Objekt currentGraphics)
    localStorage.setItem('graphicsSettings', JSON.stringify(currentGraphics));

    // 4. Aplikace viditelnosti FPS
    if (settings.showFps) {
      fpsDisplay.style.display = "block";
      if (!fpsRunning) { fpsRunning = true; updateFPS(); }
    } else {
      fpsDisplay.style.display = "none";
      fpsRunning = false;
    }

    // 5. Zavření popupu
    settingsController.close();
  });

  // --- Apply saved visibility immediately ---
  if (settings.showFps) {
    fpsDisplay.style.display = "block";
    fpsRunning = true;
    updateFPS();
  }

  // --- Saving differt themes ---
  const savedBg = localStorage.getItem('game_background') || 'sky'; // 'sky' is the fallback
  if (bgSelect) {
    bgSelect.value = savedBg;
  }
  applyBackground(savedBg);

  /* --- Graphics --- */

  /* --- Apply saved graphics settings immediately --- */
  // 1. Define the current state (Load from storage or use defaults)
  let currentGraphics = JSON.parse(localStorage.getItem('graphicsSettings')) || {
    trees: 'low',
    portals: 'low',
    enemies: 'low',
    towers: 'low',
    water: 'low',
    terrain: 'low',
    roads: 'low',
    mountains: 'low',
    lava_floor: 'low'
  };

  // 2. Function to refresh the UI buttons to match the state
  function updateGraphicsUI() {
    const rows = document.querySelectorAll('.segmented-control');
    rows.forEach(control => {
      const setting = control.dataset.setting;
      const value = currentGraphics[setting];

      control.querySelectorAll('button').forEach(btn => {
        if (btn.dataset.value === value) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    });
  }

  const list = document.getElementById('graphicsCustomList');
  if (!list) return;

  // Handle individual clicks
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    // Zabráníme tomu, aby tlačítko dělalo něco jiného (např. submit formy)
    e.preventDefault(); 

    const control = btn.closest('.segmented-control');
    const setting = control.dataset.setting;
    const value = btn.dataset.value;

    // OKAMŽITÁ vizuální změna v UI
    currentGraphics[setting] = value;
    updateGraphicsUI();
  });

  // Bulk Buttons
  document.getElementById('btnAllLow')?.addEventListener('click', () => {
    Object.keys(currentGraphics).forEach(k => currentGraphics[k] = 'low');
    updateGraphicsUI();
  });

  document.getElementById('btnAllHigh')?.addEventListener('click', () => {
    Object.keys(currentGraphics).forEach(k => currentGraphics[k] = 'high');
    updateGraphicsUI();
  });

  // Save Button
  document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
    localStorage.setItem('graphicsSettings', JSON.stringify(currentGraphics));
    // Here you would trigger the actual game engine to update visuals
  });

  // Initial sync
  updateGraphicsUI();

  /* --- Graphics --- */

});

// Titles
// --- Title Typing Effect ---
function typeTitle() {
  const titleEl = document.querySelector('.title');
  if (!titleEl) return;

  const fullText = "The CZSrna's Tower Defence";
  // Temporarily store the full text and clear the display
  titleEl.dataset.fullText = fullText;
  titleEl.textContent = "";

  const characters = fullText.split('');
  let charIndex = 0;
  const intervalTime = 50; // 50ms delay between characters

  const timer = setInterval(() => {
    if (charIndex < characters.length) {
      titleEl.textContent += characters[charIndex];
      charIndex++;
    } else {
      clearInterval(timer);
    }
  }, intervalTime);
}
document.addEventListener("DOMContentLoaded", typeTitle);

//  --- Title Laod Versions --- 
async function loadVersion() {
  try {
    const res = await fetch('versions.json');
    if (!res.ok) throw new Error(`Failed to load versions.json: ${res.status}`);
    const data = await res.json();

    const firstVersion = data.versions && data.versions[0];
    if (firstVersion && firstVersion.version) {
      const versionString = firstVersion.version;

      // Update title
      document.title = `The CZSrna's Tower Defence – ${versionString}`;

      // Update subtitle-bottom-left element
      const subtitleEl = document.querySelector('.subtitle-bottom-left');
      if (subtitleEl) {
        subtitleEl.textContent = versionString;
      } else {
        console.warn('Element with class "subtitle-bottom-left" not found.');
      }
    } else {
      console.warn('versions.json structure invalid or empty.');
    }
  } catch (err) {
    console.error("Error loading version data:", err);
  }
}

// Execute the function when the DOM is loaded
// This ensures all elements queried above (document.title, .subtitle-bottom-left) exist.
document.addEventListener("DOMContentLoaded", loadVersion);

// Inside your settings save event listener
const bgSelect = document.getElementById('backgroundSelect');
const gameContainer = document.getElementById('gameContainer');

function applyBackground(type) {
  const clouds = document.getElementById('cloudsLayer');
  if (!clouds) return;

  // Odstraní všechny předchozí třídy pozadí
  clouds.classList.remove('bg-sky', 'bg-sea', 'bg-nebula');

  void clouds.offsetWidth; // Restart animací
  clouds.classList.add(`bg-${type}`);
}

// When saving settings:
saveSettingsBtn.addEventListener('click', () => {
  const selectedBg = bgSelect.value;
  applyBackground(selectedBg);
  localStorage.setItem('game_background', selectedBg); // Save preference
});

/**
 * Vrátí aktuální nastavení konkrétního grafického prvku
 * @param {string} key - např. 'trees', 'water', 'enemies'
 * @returns {string} - 'low' nebo 'high'
 */
export function getGraphicsQuality(key) {
    const saved = localStorage.getItem('graphicsSettings');
    if (!saved) return 'low'; // Fallback
    
    const settings = JSON.parse(saved);
    return settings[key] || 'low';
}