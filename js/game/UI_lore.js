/*const loreBtn = document.getElementById('openLoreBtn');
const lorePopup = document.getElementById('lorePopup');
const closeLore = document.getElementById('closeLore');

// Open Lore
loreBtn.onclick = function() {
  lorePopup.style.display = 'flex';
}

// Close Lore
closeLore.onclick = function() {
  lorePopup.style.display = 'none';
}

// Close if user clicks outside the parchment
window.onclick = function(event) {
  if (event.target == lorePopup) {
    lorePopup.style.display = 'none';
  }
}*/

new PopupController('openLoreBtn', 'lorePopup', true);