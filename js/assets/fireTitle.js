// Renders `text` into `el` as an animated "fire title": each character
// becomes its own <span class="char">, staggered with an animation-delay so
// they fall into place one after another (see #title .char / fireTitleFallIn
// in css/fire-title.css). Used ONLY for the main menu's #title - it does not
// touch font-family, so it can't leak into any other element's typography.
//
// Loaded as type="module" (like the other js/game/*.js scripts) but still
// exposes itself on `window` rather than via export/import - same pattern
// as PopupController.js - so callers like js/game/UI.js can use it without
// needing an import graph.
const FIRE_TITLE_CHAR_DELAY_MS = 65;
const FIRE_TITLE_FALL_IN_MS = 350; // keep in sync with the .char animation duration in css/fire-title.css

function renderFireTitle(el, text) {
    if (!el) return 0;
    el.textContent = '';

    const chars = [...text];
    chars.forEach((letter, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.innerHTML = letter === ' ' ? '&nbsp;' : letter;
        span.style.animationDelay = (i * FIRE_TITLE_CHAR_DELAY_MS) + 'ms';
        el.appendChild(span);
    });

    // Total time (ms) until the whole title has finished falling into place
    // (last letter's delay + its own fall-in duration) - callers use this to
    // time the subtitle reveal so it lands right after the title settles.
    if (chars.length === 0) return 0;
    return (chars.length - 1) * FIRE_TITLE_CHAR_DELAY_MS + FIRE_TITLE_FALL_IN_MS;
}

window.renderFireTitle = renderFireTitle;
