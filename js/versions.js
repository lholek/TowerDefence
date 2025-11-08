// Version history popup logic
const versionButtons = document.querySelectorAll('.versionButton');
const versionPopup = document.getElementById('versionPopup');
const versionList = document.getElementById('versionList');
const closeVersionPopup = document.getElementById('closeVersionPopup');

// Track if we paused the game
let wasGamePausedByUs = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch current version from versions.json
    try {
        const res = await fetch('versions.json');
        const data = await res.json();
        const currentVersion = data.versions[0].version;

        // Update all version displays
        document.querySelectorAll('.subtitle-bottom-left').forEach(el => {
            el.textContent = currentVersion;
        });
        
        // Update page title
        document.title = `The CZSrna's Tower Defence – ${currentVersion}`;

        // Update events box subtitle
        const eventsBoxSubtitle = document.querySelector('#eventsBox .subtitle');
        if (eventsBoxSubtitle) {
            eventsBoxSubtitle.textContent = currentVersion;
        }

    } catch (err) {
        console.error('Failed to load version:', err);
    }

    versionButtons.forEach(versionButton => {
      versionButton.addEventListener('click', async () => {
        try {
          const res = await fetch('versions.json');
          const data = await res.json();

          versionList.innerHTML = '';
          data.versions.forEach((v, index) => {
            const vDiv = document.createElement('div');
            vDiv.className = 'version-item';
            const isFirstVersion = index === 0;
            
            vDiv.innerHTML = `
              <h3 class="version-title ${isFirstVersion ? 'first-version' : ''}">
                ${isFirstVersion ? '' : '<span class="expand-icon">▶</span>'}
                ${v.version}
              </h3>
              <div class="version-content" style="display: ${isFirstVersion ? 'block' : 'none'}">
                <ul>${v.changes.map(c => `<li>${c}</li>`).join('')}</ul>
              </div>
            `;

            // Add click handler only for non-first versions
            if (!isFirstVersion) {
              const title = vDiv.querySelector('.version-title');
              const content = vDiv.querySelector('.version-content');
              const icon = vDiv.querySelector('.expand-icon');
              
              title.addEventListener('click', () => {
                const isVisible = content.style.display === 'block';
                content.style.display = isVisible ? 'none' : 'block';
                icon.textContent = isVisible ? '▶' : '▼';
              });
            }

            versionList.appendChild(vDiv);
          });

          versionPopup.style.display = 'flex';

          // Pause game if it's running
          if (window.game && !window.game.paused) {
            window.game.togglePause();
            wasGamePausedByUs = true;
          }

        } catch (err) {
          console.error('Failed to load version history:', err);
          alert('Failed to load version history.');
        }
      });
    });

    const closePopup = () => {
      versionPopup.style.display = 'none';
      
      // Only unpause if we were the ones who paused it
      if (window.game && window.game.paused && wasGamePausedByUs) {
        window.game.togglePause();
        wasGamePausedByUs = false;
      }
    };

    // Wire up close button
    if (closeVersionPopup) {
      closeVersionPopup.addEventListener('click', closePopup);
    }

    // Close popup with ESC
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && versionPopup.style.display === 'flex') {
        closePopup();
      }
    });

    // Add click outside handler
    document.addEventListener('mousedown', (e) => {
      // Check if version popup is visible
      if (versionPopup.style.display === 'flex') {
        // Get the popup content div
        const popupContent = document.getElementById('versionPopupContent');
        
        // If click is outside popup content, close it
        if (!popupContent.contains(e.target)) {
          closePopup();
        }
      }
    });
});
