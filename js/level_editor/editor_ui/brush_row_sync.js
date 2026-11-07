/* keeps the Brush row's selected tile + X / Y in sync with the editor's own (hidden)
   #currentTileDisplay / #tileCoordinates inside #tileKey. Those get rebuilt on every render
   (and coords are written right after), so this just copies their final state once things settle. */
document.addEventListener('DOMContentLoaded', () => {
    const tileKey = document.getElementById('tileKey');
    const tile = document.getElementById('devCurrentTile');
    const coordX = document.getElementById('devCoordX');
    const coordY = document.getElementById('devCoordY');
    if (!tileKey || !tile) return;

    const copy = () => {
        const src = document.getElementById('currentTileDisplay');
        if (src) {
            tile.textContent = src.textContent;
            tile.className = src.className;
        }
        // "X: 3, Y: 5" or "X: - | Y: -"
        const m = (document.getElementById('tileCoordinates')?.textContent || '').match(/X:\s*([^,|]*?)\s*[,|]\s*Y:\s*(.*)/);
        coordX.textContent = m ? m[1].trim() || '-' : '-';
        coordY.textContent = m ? m[2].trim() || '-' : '-';
    };
    // the tile picker (#tileKey) lies in the map now - its header (Search tile + Filters) goes
    // right under the map. Every render of #tileKey brings a fresh header, which replaces
    // the old one in the slot (before the browser paints, so nothing flickers)
    const slot = document.getElementById('devTileHeaderSlot');
    // "(Drawing is disabled for Start and End)" lives in the tile legend's "i" tooltip
    // (shared JSON text + the note) instead of a text line under the map
    const LEGEND_NOTE = 'Drawing is disabled for Start and End.';
    let legendText = null;
    fetch('js/level_editor/dataEditorDescription.json')
        .then(r => r.json())
        // "Can build towers" / "Can't build towers" in gold, so it's clear at a glance where towers go
        .then(d => { legendText = (d?.['map-editor']?.['tile-legend']?.description || '').replace(/\b(can't|can)\s+build\s+towers/gi, '<span class="dev-build">$&</span>') + '<br><br>' + LEGEND_NOTE; moveHeader(); })
        .catch(() => { legendText = LEGEND_NOTE; moveHeader(); });
    const moveHeader = () => {
        const header = tileKey.querySelector(':scope > .tile-editor-header');
        if (header && slot) slot.replaceChildren(header);
        const ico = slot?.querySelector('.info-icon[data-tooltip="map-editor.tile-legend"]');
        if (ico && legendText !== null) {
            ico.removeAttribute('data-tooltip');
            ico.setAttribute('data-tooltip-text', legendText);
        }
    };
    new MutationObserver(moveHeader).observe(tileKey, { childList: true });
    moveHeader();

    // the dock is inside #mapCanvasContainer, which pans (mousedown) and zooms (wheel) the map -
    // a click on a tile / the wheel over the tile row must not reach it. Only the tiles and the
    // selected tile catch the mouse (CSS pointer-events), the rest of the dock lets it through.
    // (mouseup is let through on purpose, so a map drag released over the row still ends.)
    const dock = document.getElementById('devTileDock');
    ['mousedown', 'wheel', 'dblclick'].forEach(type =>
        dock?.addEventListener(type, e => e.stopPropagation()));

    const watch = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] };
    const mirror = new MutationObserver(copy);
    mirror.observe(tileKey, watch);
    if (slot) mirror.observe(slot, watch); // the hidden originals travel there with the header
    copy();
});
