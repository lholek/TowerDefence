// js/level_editor/copy_flash.js
//
// A short gold frame around a freshly copied card (wave, enemy group, tower, ability) -
// css/level_editor/editor.css .copy-flash. Called right after the modifyJson() that made
// the copy; waits one frame so the re-rendered card is on the page.
export function flashCopy(selector) {
    requestAnimationFrame(() => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.classList.remove('copy-flash');
        void el.offsetWidth; // restart the animation when copying again quickly
        el.classList.add('copy-flash');
        setTimeout(() => el.classList.remove('copy-flash'), 1000);
    });
}
