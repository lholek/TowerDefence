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