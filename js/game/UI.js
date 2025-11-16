const returnButton = document.getElementById('returnButton');
const returnPopup = document.getElementById('returnPopup');
const confirmReturn = document.getElementById('confirmReturn');
const cancelReturn = document.getElementById('cancelReturn');

returnButton.addEventListener('click', () => {
  returnPopup.style.display = 'flex';
  if (window.game && !window.game.paused) window.game.togglePause();
});

cancelReturn.addEventListener('click', () => {
  returnPopup.style.display = 'none';
  if (window.game && window.game.paused) window.game.togglePause();
});

confirmReturn.addEventListener('click', () => {
  returnPopup.style.display = 'none';
  
  // Optional cleanup before returning
  if (window.game) {
    window.game.running = false;
    window.game.paused = true;
  }

  // Use your built-in function to return to menu
  if (window.game && typeof window.game.resetGameToMenu === 'function') {
    window.game.resetGameToMenu();
  }
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

// --- Init settings ---
document.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("settingsPopup");
  const openBtn = document.getElementById("openSettingsBtn");
  const closeBtn = document.getElementById("closeSettingsBtn");
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

  // --- Open / Close popup ---
  openBtn.addEventListener("click", () => popup.classList.remove("hidden"));
  closeBtn.addEventListener("click", () => popup.classList.add("hidden"));

  // --- Save settings ---
  saveBtn.addEventListener("click", () => {
    const targetFps = clampFps(fpsRange.value);
    settings = {
      showFps: showFpsCheckbox.checked,
      targetFps: targetFps
    };

    // save to localStorage
    localStorage.setItem("data.fps", JSON.stringify(settings));

    // apply visibility
    if (settings.showFps) {
      fpsDisplay.style.display = "block";
      if (!fpsRunning) {
        fpsRunning = true;
        updateFPS();
      }
    } else {
      fpsDisplay.style.display = "none";
      fpsRunning = false;
    }

    popup.classList.add("hidden");
  });

  // --- Apply saved visibility immediately ---
  if (settings.showFps) {
    fpsDisplay.style.display = "block";
    fpsRunning = true;
    updateFPS();
  }
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