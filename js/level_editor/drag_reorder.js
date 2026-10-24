// js/level_editor/drag_reorder.js
//
// Drag & drop reordering for the editor's card lists (towers, abilities,
// waves, enemy groups). Only the grip button (.btn-drag) is draggable, so
// the inputs inside a card keep working normally (text selection etc.).
// While dragging, a gold line shows where the card will land: before or
// after the hovered card - above / below for stacked cards (axis 'y'),
// left / right for side-by-side cards (axis 'x').
//
// Listeners are delegated to the list's container, which survives the
// repeaters' innerHTML rebuilds, so this is set up once per list.

/**
 * @param {HTMLElement} container - element that stays in the DOM (the repeater container)
 * @param {object} opts
 * @param {string} opts.item - selector of one reorderable card
 * @param {string} opts.handle - selector of that card's grip button
 * @param {'x'|'y'} [opts.axis='y'] - how the cards are laid out
 * @param {(from: number, to: number, card: HTMLElement) => void} opts.onMove
 *        called with the old and the new index among the card's siblings
 */
export function enableDragReorder(container, { item, handle, axis = 'y', onMove }) {
    if (!container) return;
    let dragged = null;           // card being dragged
    let target = null;            // card the line is drawn on
    let after = false;            // line after (true) or before (false) target

    const siblings = (card) => [...card.parentElement.children].filter(el => el.matches(item));

    const clearLine = () => {
        if (target) target.classList.remove('reorder-before', 'reorder-after');
        target = null;
    };

    // new index for the current target/after, or -1 when nothing would move
    const dropIndex = () => {
        if (!dragged || !target) return -1;
        const list = siblings(dragged);
        const from = list.indexOf(dragged);
        let to = list.indexOf(target) + (after ? 1 : 0);
        if (to > from) to--;
        return to === from ? -1 : to;
    };

    container.addEventListener('dragstart', (e) => {
        const grip = e.target.closest?.(handle);
        if (!grip || !container.contains(grip)) return;
        const card = grip.closest(item);
        if (!card) return;
        e.stopPropagation(); // a nested list (enemy groups inside a wave) must not start the outer one
        dragged = card;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Firefox only starts a drag with some data set
        // ghost image: the card's header (a whole wave card would be huge)
        const ghost = card.querySelector(':scope > .card-header') || card;
        const r = grip.getBoundingClientRect(), g = ghost.getBoundingClientRect();
        e.dataTransfer.setDragImage(ghost, r.left - g.left + r.width / 2, r.top - g.top + r.height / 2);
        requestAnimationFrame(() => card.classList.add('reorder-dragging'));
    });

    container.addEventListener('dragover', (e) => {
        if (!dragged) return;
        const card = e.target.closest?.(item);
        // only reorder among the dragged card's own siblings
        if (card && card.parentElement === dragged.parentElement) {
            const r = card.getBoundingClientRect();
            const isAfter = axis === 'x'
                ? e.clientX > r.left + r.width / 2
                : e.clientY > r.top + r.height / 2;
            if (card !== target || isAfter !== after) {
                clearLine();
                target = card;
                after = isAfter;
                if (dropIndex() >= 0) target.classList.add(after ? 'reorder-after' : 'reorder-before');
            }
        }
        if (target) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
        }
    });

    container.addEventListener('drop', (e) => {
        if (!dragged) return;
        e.preventDefault();
        e.stopPropagation();
        const list = siblings(dragged);
        const from = list.indexOf(dragged);
        const to = dropIndex();
        const card = dragged;
        cleanup();
        if (to >= 0) onMove(from, to, card);
    });

    const cleanup = () => {
        clearLine();
        if (dragged) dragged.classList.remove('reorder-dragging');
        dragged = null;
    };
    container.addEventListener('dragend', cleanup);
}

/** Markup of the grip button (9 dots), placed next to the copy button. */
export const dragHandleHtml = (extraClass = '') =>
    `<button type="button" class="btn btn-drag ${extraClass}" draggable="true" title="Drag to reorder"><span class="drag-dots"></span></button>`;
