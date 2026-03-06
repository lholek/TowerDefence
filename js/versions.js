// Version history popup logic
const versionButtons = document.querySelectorAll('.versionButton');
const versionPopup = document.getElementById('versionPopup');
const versionList = document.getElementById('versionList');

function formatVersionDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr; // Return original if format is unexpected
    return `${parts[2]}. ${parts[1]}. ${parts[0]}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Initialize our Global Controller (Pass null for button because we have multiple buttons)
    const versionController = new PopupController(null, 'versionPopup');

    // 2. Fetch current version from versions.json for the main page
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
        const eventsBoxSubtitle = document.querySelector('.subtitle');
        if (eventsBoxSubtitle) {
            eventsBoxSubtitle.textContent = currentVersion;
        }

        const subtitleTag = document.getElementById('subtitle-tag');
        if (subtitleTag) {
            subtitleTag.textContent = currentVersion;
        }

    } catch (err) {
        console.error('Failed to load version:', err);
    }

    // 3. Handle clicking the version buttons
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
            
            const displayDate = formatVersionDate(v.release);
            vDiv.innerHTML = `
              <h3 class="version-title ${isFirstVersion ? 'first-version' : ''}">
                ${isFirstVersion ? '' : '<span class="expand-icon">▶</span>'}
                ${v.version}
              </h3>
              <div class="version-content" style="display: ${isFirstVersion ? 'block' : 'none'}">
                <div class="text-center cl-primary ml-n15">(${displayDate})</div>
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

          // 4. Use the Controller to open the popup and handle game pausing!
          versionController.open();

        } catch (err) {
          console.error('Failed to load version history:', err);
          alert('Failed to load version history.');
        }
      });
    });
    
    // NOTE: All the close logic, ESC logic, and Unpause logic is now handled automatically by versionController!
});