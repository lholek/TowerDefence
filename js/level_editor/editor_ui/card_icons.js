/* gold "copy" icon instead of 📋 and a light ✖ instead of "X" on the cards' Copy / Delete
   buttons (towers, abilities, waves, enemy groups, shake effects, custom damage) - the editor writes
   the text into them on every render, so an observer swaps it right after. Only newly added nodes
   are looked at (the map's tile header re-renders on every hover - no full-page scan for that). */
document.addEventListener('DOMContentLoaded', () => {
    const COPY = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="2.5" width="12" height="15" rx="2" fill="url(#devGold)" stroke="#4a2c0c" stroke-width=".9"/><rect x="3.5" y="6.5" width="12" height="15" rx="2" fill="url(#devGold)" stroke="#4a2c0c" stroke-width=".9"/><path d="M6.5 11.5h6M6.5 14.5h6M6.5 17.5h4" stroke="#7a4a12" stroke-width="1.2" stroke-linecap="round"/></svg>';
    const DELETE = '<svg class="dev-btn-ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#devIcoXLight"/></svg>';
    // parsed once, cloned per button (hundreds of buttons on every wave re-render)
    const tpl = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
    const COPY_NODE = tpl(COPY), DELETE_NODE = tpl(DELETE);
    const swapIn = root => {
        root.querySelectorAll('.btn-copy:not([data-dev-ico]), .btn-delete:not([data-dev-ico])').forEach(b => {
            const text = b.textContent.trim();
            if (b.classList.contains('btn-copy') && text === '📋') b.replaceChildren(COPY_NODE.cloneNode(true));
            else if (b.classList.contains('btn-delete') && text === 'X') { b.replaceChildren(DELETE_NODE.cloneNode(true)); b.title ||= 'Delete'; }
            else return; // e.g. "Yes, remove" in the confirm popup keeps its text
            b.dataset.devIco = '1';
        });
    };
    new MutationObserver(records => {
        // a re-render adds many cards to one container - look at each container once
        const roots = new Set();
        for (const r of records) {
            if (roots.has(r.target) || r.target.dataset?.devIco) continue; // an icon we just put in
            for (const n of r.addedNodes) if (n.nodeType === 1) { roots.add(r.target); break; }
        }
        roots.forEach(swapIn);
    }).observe(document.body, { childList: true, subtree: true });
    swapIn(document.body);
});
