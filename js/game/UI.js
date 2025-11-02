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