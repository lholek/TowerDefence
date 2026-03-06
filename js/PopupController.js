class PopupController {
    constructor(buttonId, popupId) {
        // If buttonId is null, we will trigger .open() manually (e.g., after a fetch)
        this.button = buttonId ? document.getElementById(buttonId) : null;
        this.popup = document.getElementById(popupId);
        this.wasPausedByUs = false;

        if (this.popup) {
            this._init();
        }
    }

    _init() {
        // Open logic: If a standard button ID was provided
        if (this.button) {
            this.button.addEventListener('click', () => this.open());
        }

        // Close logic: Click on the overlay background
        this.popup.addEventListener('mousedown', (e) => {
            if (e.target === this.popup) {
                this.close();
            }
        });

        // Close logic: ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popup.style.display === 'flex') {
                this.close();
            }
        });

        // Close logic: Standard close buttons found inside the popup
        const closeBtn = this.popup.querySelector('.close-btn, #closeVersionPopup, #closeSettingsBtn, #closeLore');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    open() {
        this.popup.style.display = 'flex';
        
        // Auto-pause the game
        if (window.game && !window.game.paused) {
            window.game.togglePause();
            this.wasPausedByUs = true;
        }
    }

    close() {
        this.popup.style.display = 'none';

        // Auto-unpause ONLY if we were the ones who paused it
        if (window.game && window.game.paused && this.wasPausedByUs) {
            window.game.togglePause();
            this.wasPausedByUs = false;
        }
    }
}
window.PopupController = PopupController;