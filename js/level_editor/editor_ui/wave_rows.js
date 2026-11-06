/* Waves - each wave's enemy groups are one row that scrolls sideways (.wave-collapse-inner).
   editor_wave.js rebuilds every wave card on every change, which would throw each row back
   to its start: the rows' scroll positions are remembered (per wave) and put back right
   after a rebuild, before the page is painted. "+ Add Enemy Group" / a group's Copy then
   scroll that row to the new card. */
(() => {
    const root = document.getElementById('devWaves');
    const list = document.getElementById('waves-editor-container');
    if (!root || !list) return;
    const ROW = '.wave-card .wave-collapse-inner';
    const saved = new Map(); // wave index -> scrollLeft
    let pending = null;      // { wave, card: index | 'last' } to bring into view after the rebuild

    root.addEventListener('scroll', e => {
        const row = e.target;
        if (!(row instanceof Element) || !row.matches(ROW)) return;
        saved.set(row.closest('.wave-card').dataset.waveIndex, row.scrollLeft);
    }, true);

    const restore = () => {
        list.querySelectorAll(ROW).forEach(row => {
            const left = saved.get(row.closest('.wave-card').dataset.waveIndex);
            if (left) row.scrollLeft = left;
        });
        if (!pending) return;
        const { wave, card } = pending;
        pending = null;
        requestAnimationFrame(() => {
            const row = list.querySelector(`.wave-card[data-wave-index="${wave}"] .wave-collapse-inner`);
            if (!row) return;
            const target = card === 'last'
                ? row.querySelector(':scope > .btn-add')
                : row.querySelector(`.enemy-card[data-enemy-index="${card}"]`);
            if (!target) return;
            const tr = target.getBoundingClientRect(), rr = row.getBoundingClientRect();
            if (tr.left < rr.left || tr.right > rr.right) {
                row.scrollTo({ left: row.scrollLeft + (tr.right - rr.right) + 12, behavior: 'smooth' });
            }
        });
    };
    // once per frame, after all the other observers changed the fresh cards (setting
    // scrollLeft forces a layout - doing it mid-render made the browser lay out twice)
    let queued = false;
    const queue = () => {
        if (queued || (!saved.size && !pending)) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; restore(); });
    };
    // only the list's own children = a re-render (not every input / icon change inside)
    new MutationObserver(queue).observe(list, { childList: true });

    // "Group N" in each card's header (CSS attr(), see .card-controls::before) - set right
    // when cards appear (a re-render, or a collapsed wave being expanded), before paint
    const number = () => list.querySelectorAll('.enemy-card > .card-controls:not([data-dev-num])').forEach(c => {
        c.dataset.devNum = +c.parentElement.dataset.enemyIndex + 1;
    });
    new MutationObserver(number).observe(list, { childList: true, subtree: true });
    number();

    // cards out of view (scrolled out of their row, or the wave off screen) get .dev-cv-off
    // = content-visibility:hidden (not laid out / painted - keeps collapsing waves smooth).
    // New cards start rendered (no class), so a re-render never shows empty cards.
    const cv = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.target.isConnected) { cv.unobserve(e.target); return; }
        e.target.classList.toggle('dev-cv-off', !e.isIntersecting);
    }), { rootMargin: '200px', scrollMargin: '0px 400px' }); // scrollMargin: also a bit beyond the row's edges
    const watchCards = () => list.querySelectorAll('.enemy-card:not([data-dev-cv])').forEach(c => {
        c.dataset.devCv = '1';
        cv.observe(c);
    });
    new MutationObserver(watchCards).observe(list, { childList: true, subtree: true });
    watchCards();

    // the mouse wheel over a group row that has more groups than fit scrolls ONLY that row
    // sideways - also at its ends (the page doesn't start moving up / down under the mouse).
    // A row that fits doesn't catch the wheel. Sideways touchpad swipes, Ctrl+wheel
    // (zoom) and open dropdown lists keep their own behaviour.
    root.addEventListener('wheel', e => {
        if (e.ctrlKey) return;
        const row = e.target.closest?.('.wave-collapse-inner');
        if (!row || e.target.closest('.custom-path-dropdown, .dev-sel-list')) return;
        const max = row.scrollWidth - row.clientWidth;
        if (max <= 0) return;
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        row.scrollLeft += e.deltaMode === 1 ? d * 40 : e.deltaMode === 2 ? d * row.clientWidth : d;
    }, { passive: false });

    root.addEventListener('click', e => {
        const add = e.target.closest?.('.wave-collapse-inner > .btn-add');
        if (add) { pending = { wave: add.closest('.wave-card').dataset.waveIndex, card: 'last' }; return; }
        const copy = e.target.closest?.('.enemy-card .btn-copy');
        if (copy) {
            const c = copy.closest('.enemy-card');
            pending = { wave: c.dataset.waveIndex, card: +c.dataset.enemyIndex + 1 };
        }
    }, true);
})();
