class PopupController {
    // 👉 Rychlost animace otevření/zavření popupu (v milisekundách).
    //    Uprav si tyhle 2 konstanty podle sebe - platí pro VŠECHNY popupy
    //    ovládané přes PopupController (Version History, Settings, Lore, ...).
    //    Skutečná animace (fade pozadí, "pop" karty s bounce efektem) je
    //    celá definovaná v CSS - viz css/popups.css (.menu-popup-overlay).
    //    Tady se jen tyhle 2 hodnoty pošlou do CSS proměnných.
    static OPEN_DURATION_MS = 350;
    static CLOSE_DURATION_MS = 250;

    constructor(buttonId, popupId) {
        // If buttonId is null, we will trigger .open() manually (e.g., after a fetch)
        this.button = buttonId ? document.getElementById(buttonId) : null;
        this.popup = document.getElementById(popupId);
        this.wasPausedByUs = false;
        this._closeTimeout = null;

        if (this.popup) {
            this.popup.style.setProperty('--popup-open-ms', `${PopupController.OPEN_DURATION_MS}ms`);
            this.popup.style.setProperty('--popup-close-ms', `${PopupController.CLOSE_DURATION_MS}ms`);
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
            if (e.key === 'Escape' && this.popup.classList.contains('is-open')) {
                this.close();
            }
        });

        // Close logic: Standard close buttons found inside the popup.
        // querySelectorAll (not querySelector) - a popup can have more than
        // one close trigger at once (e.g. Settings has both its corner "×"
        // and a text "Close" button at the bottom), and all of them need to
        // work, not just whichever comes first in the DOM.
        const closeBtns = this.popup.querySelectorAll('.close-btn, #closeVersionPopup, #closeSettingsBtn, #closeLore');
        closeBtns.forEach(closeBtn => closeBtn.addEventListener('click', () => this.close()));
    }

    open() {
        // In case a close animation was still running, cancel its pending
        // display:none so it doesn't hide the popup we're about to open.
        clearTimeout(this._closeTimeout);

        this.popup.style.display = 'flex';

        // Force a reflow so the browser "commits" display:flex (and the
        // resting closed styles from CSS) before we add .is-open below -
        // otherwise both changes could get coalesced into one and there'd
        // be nothing to animate from (the popup would just snap open).
        void this.popup.offsetWidth;

        this.popup.classList.add('is-open');

        // Auto-pause the game
        if (window.game && !window.game.paused) {
            window.game.togglePause();
            this.wasPausedByUs = true;
        }
    }

    close() {
        this.popup.classList.remove('is-open');

        // Only actually take it out of layout (display:none) once the CSS
        // fade/shrink transition has finished playing - CSS transitions
        // can't animate `display` itself, so this bit has to stay in JS.
        clearTimeout(this._closeTimeout);
        this._closeTimeout = setTimeout(() => {
            this.popup.style.display = 'none';
        }, PopupController.CLOSE_DURATION_MS);

        // Auto-unpause ONLY if we were the ones who paused it
        if (window.game && window.game.paused && this.wasPausedByUs) {
            window.game.togglePause();
            this.wasPausedByUs = false;
        }
    }
}
window.PopupController = PopupController;
