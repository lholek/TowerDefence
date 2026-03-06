class PopupController {
    constructor(buttonId, popupId, isLore = false) {
        // If buttonId is null, we can still trigger .open() manually in other scripts
        this.button = buttonId ? document.getElementById(buttonId) : null;
        this.popup = document.getElementById(popupId);
        this.isLore = isLore;
        this.wasPausedByUs = false;

        if (this.popup) {
            this._init();
        }
    }

    _init() {
        // 1. Open logic (if a standard button was provided)
        if (this.button) {
            this.button.addEventListener('click', () => this.open());
        }

        // 2. Close on Overlay Click
        this.popup.addEventListener('mousedown', (e) => {
            if (e.target === this.popup) {
                this.close();
            }
        });

        // 3. Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popup.style.display === 'flex') {
                this.close();
            }
        });

        // 4. Bind existing close buttons dynamically
        const closeBtn = this.popup.querySelector('.close-btn, #closeVersionPopup, #closeSettingsBtn, #closeLore, #closeTutorial');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    open() {
        this.popup.style.display = 'flex';
        
        // Unified Pause Logic
        if (window.game && !window.game.paused) {
            window.game.togglePause();
            this.wasPausedByUs = true;
        }
    }

    close() {
        this.popup.style.display = 'none';

        // Unified Unpause Logic
        if (window.game && window.game.paused && this.wasPausedByUs) {
            window.game.togglePause();
            this.wasPausedByUs = false;
        }
    }
}

// Make it globally accessible
window.PopupController = PopupController;