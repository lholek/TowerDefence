// dev only: the confirm popup like the game's popups - × / ESC / click on the backdrop cancel it
// (= a click on Cancel, so json_functions.js resolves its promise as usual), and each kind of
// question gets its own icon + confirm button (it said "Yes, remove" even for "Load Map")
(() => {
    const popup = document.getElementById('customConfirmPopup');
    const title = document.getElementById('popupTitle');
    const ico = document.getElementById('devConfirmIco');
    const ok = document.getElementById('confirmActionButton');
    const cancel = () => document.getElementById('cancelActionButton').click();
    const isOpen = () => !popup.classList.contains('d-none');

    popup.querySelector('.dev-confirm-close').addEventListener('click', cancel);
    popup.addEventListener('click', e => { if (e.target === popup) cancel(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && isOpen()) { e.preventDefault(); e.stopPropagation(); cancel(); }
    }, true);

    // [title pattern, icon, confirm label, gold (safe) or red (destructive)]
    const KINDS = [
        [/^load/i, 'devIcoMap', 'Load', true],
        [/overwrite/i, 'devIcoDisk', 'Overwrite', false],
        [/delete|remove/i, 'devIcoX', 'Delete', false]
    ];
    const style = () => {
        const [, icon, label, safe] = KINDS.find(([re]) => re.test(title.textContent)) || [null, 'devIcoScroll', 'Yes', false];
        ico.setAttribute('href', '#' + icon);
        ok.textContent = label;
        ok.classList.toggle('dev-confirm-gold', safe);
        ok.classList.toggle('btn-delete', !safe);
    };
    new MutationObserver(style).observe(title, { childList: true, characterData: true, subtree: true });
    style();
})();
