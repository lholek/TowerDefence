/* "Copied!" on Share Map and Format & Copy JSON for 2 s. The real label is kept once and
   every click just restarts the 2 s, so a quick double click can never leave "Copied!" there.
   Share Map also creates the share link here (main.js has no handler of its own for it). */
(() => {
    const flash = (btn, text = 'Copied!', ms = 2000) => {
        if (!btn) return;
        if (btn.dataset.devLabel === undefined) btn.dataset.devLabel = btn.textContent;
        clearTimeout(btn._devFlash);
        btn.textContent = text;
        btn.classList.add('dev-copied');
        btn._devFlash = setTimeout(() => {
            btn.textContent = btn.dataset.devLabel;
            btn.classList.remove('dev-copied');
        }, ms);
    };
    document.addEventListener('click', async (e) => {
        const share = e.target.closest?.('#shareMapBtn');
        if (share) {
            flash(share);
            try { await window.app?.jsonFunctions?.generateShareLink(); } catch (err) { console.warn(err); }
            return;
        }
        const copy = e.target.closest?.('#devCopyJsonBtn');
        if (copy) flash(copy); // its onclick still does the formatting + copying
    }, true);
})();
