// Version history popup logic
const versionButtons = document.querySelectorAll('.versionButton');
const versionPopup = document.getElementById('versionPopup');
const versionList = document.getElementById('versionList');
const closeVersionPopup = document.getElementById('closeVersionPopup');

versionButtons.forEach(versionButton => {
  versionButton.addEventListener('click', async () => {
    try {
      const res = await fetch('versions.json');
      const data = await res.json();

      versionList.innerHTML = '';
      data.versions.forEach(v => {
        const vDiv = document.createElement('div');
        vDiv.innerHTML = `
          <h3>${v.version}</h3>
          <ul>${v.changes.map(c => `<li>${c}</li>`).join('')}</ul>
        `;
        versionList.appendChild(vDiv);
      });

      versionPopup.style.display = 'flex';

      // Pause game if it's running
      if (window.game && !window.game.paused) {
        window.game.togglePause();
      }

    } catch (err) {
      alert('Failed to load version history.');
      console.error(err);
    }
  });

  const closePopup = () => {
    versionPopup.style.display = 'none';

    // Resume game if it was paused by opening the popup
    if (window.game && window.game.paused) {
      window.game.togglePause();
    }
  };

  closeVersionPopup.addEventListener('click', closePopup);

  // Optional: close popup with ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && versionPopup.style.display === 'flex') {
      closePopup();
    }
  });
});
