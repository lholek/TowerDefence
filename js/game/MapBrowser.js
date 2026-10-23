// MapBrowser.js
//
// The "☰" button next to the map select opens a popup with every standard
// map in one table (name + description, level count, difficulty, map size,
// towers, extra life, abilities) - by default in the same order as the
// <select>.
//  - Sorting: click a sortable column header (again = reverse). The last
//    sort is remembered (localStorage) for the next time.
//  - Search (by name) + filter chips: Extra Life, abilities and difficulty.
//    Within one group a map needs ANY of the chosen chips, across groups
//    ALL groups must match.
//  - "Reset" goes back to the default order with no search / filters.
//  - Hover a row (or move with Up / Down) -> its minimap shows next to it,
//    click / Enter selects that map: writes #mapSelect.value + fires a real
//    'change' event, so the map preview (main.js) and the custom select
//    (CustomSelect.js) update exactly like after picking it from the
//    dropdown.
// Styles: css/map_browser.css.

import { fillMinimap } from './minimapTiles.js';

const mapSelect = document.getElementById('mapSelect');
const popup = document.getElementById('mapBrowserPopup');
const tbody = document.getElementById('mapBrowserBody');
const emptyMsg = document.getElementById('mapBrowserEmpty');
const scrollBox = popup.querySelector('.map-browser-scroll');
const resetBtn = document.getElementById('mapBrowserResetSort');
const searchInput = document.getElementById('mapBrowserSearch');
const chips = [...document.querySelectorAll('#mapBrowserFilters .map-filter-chip')];
const headers = [...document.querySelectorAll('.map-browser-table th[data-sort]')];
const preview = document.getElementById('mapBrowserPreview');
const previewName = preview.querySelector('.map-browser-preview-name');
const previewGrid = preview.querySelector('.map-browser-preview-grid');
const controller = new window.PopupController('openMapBrowserBtn', 'mapBrowserPopup');

const PREVIEW_MAX = 240;              // px, longer side of the hover minimap
const SORT_STORAGE_KEY = 'mapBrowserSort';

// map file -> its first map's data, fetched once on the first open
const mapCache = new Map();
// map file -> its built hover minimap (built on the first hover)
const minimapCache = new Map();

// one entry per <option>: { value, name, index (= default order), map, tr }
let rows = [];
let sort = null;         // { key, dir: 1 | -1 } or null = default order (restored below)
let activeRow = null;    // row highlighted by the mouse / arrow keys
const filters = { life: false, ability: new Set(), difficulty: new Set() };

const escapeHtml = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function loadMap(url) {
    if (!mapCache.has(url)) {
        mapCache.set(url, fetch(url)
            .then(res => { if (!res.ok) throw new Error('Fetch failed'); return res.json(); })
            .then(data => (data.maps ? data.maps[0] : data)));
    }
    return mapCache.get(url);
}

const descOf = map => (map.description && map.description[0]) || {};
const starsOf = map => ((descOf(map).difficulty || '').match(/⭐/g) || []).length;

// ---------- remembered sort ----------
function loadSort() {
    try {
        const s = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY));
        if (s && sortValue[s.key] && (s.dir === 1 || s.dir === -1)) return s;
    } catch { /* storage blocked / bad value -> default order */ }
    return null;
}
function saveSort() {
    try {
        if (sort) localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
        else localStorage.removeItem(SORT_STORAGE_KEY);
    } catch { /* storage blocked - sorting still works, just isn't remembered */ }
}

// value each sortable column is compared by (undefined = not loaded yet)
const sortValue = {
    name: row => row.name.toLowerCase(),
    levels: row => row.map && (Number(descOf(row.map)['level count']) || 0),
    difficulty: row => row.map && starsOf(row.map),
    size: row => {
        if (!row.map) return undefined;
        const [w, h] = String(descOf(row.map).map_size || '').split('x').map(Number);
        return (w || 0) * (h || 0);
    },
    towers: row => row.map && Object.keys(row.map.towerTypes || {}).length,
};
sort = loadSort();

// ---------- rows ----------
function nameCell(row) {
    const text = row.map && descOf(row.map).descriptionText;
    const desc = text && text !== 'Edit description'
        ? `<div class="map-browser-desc" title="${escapeHtml(text)}">${escapeHtml(text)}</div>`
        : '';
    return `<td class="map-browser-name-cell"><div class="map-browser-name">${escapeHtml(row.name)}</div>${desc}</td>`;
}

function rowCells(map) {
    const d = descOf(map);
    const towers = Object.keys(map.towerTypes || {}).length;
    const life = map.extraLife === false
        ? '<span class="info-table-life info-table-life-no">✖</span>'
        : '<span class="info-table-life info-table-life-yes">✔</span>';
    const abilities = map.abilities && map.abilities.length
        ? map.abilities.map(ab => `<span>${escapeHtml((ab.ui && ab.ui.icon) || '')} ${escapeHtml(ab.name)}</span>`).join('')
        : '-';
    return `
        <td>${escapeHtml(d['level count'] || '-')}</td>
        <td class="map-browser-difficulty">${escapeHtml(d.difficulty || '-')}</td>
        <td>${escapeHtml(d.map_size || '-')}</td>
        <td>${towers ? towers + ' types' : '-'}</td>
        <td>${life}</td>
        <td class="map-browser-abilities">${abilities}</td>`;
}

function markSelected() {
    rows.forEach(row => row.tr.classList.toggle('is-selected', row.value === mapSelect.value));
}

// ---------- search + filters ----------
function matches(row) {
    const q = searchInput.value.trim().toLowerCase();
    if (q && !row.name.toLowerCase().includes(q)) return false;
    const anyFilter = filters.life || filters.ability.size || filters.difficulty.size;
    if (!anyFilter) return true;
    if (!row.map) return false; // not loaded yet - can't tell, hide until it is
    if (filters.life && row.map.extraLife === false) return false;
    if (filters.ability.size) {
        const ids = new Set((row.map.abilities || []).map(ab => ab.id));
        if (![...filters.ability].some(id => ids.has(id))) return false;
    }
    if (filters.difficulty.size && !filters.difficulty.has(String(starsOf(row.map)))) return false;
    return true;
}

const visibleRows = () => [...tbody.children].map(tr => rows.find(r => r.tr === tr)).filter(r => !r.tr.hidden);
const isCustomized = () => !!sort || !!searchInput.value.trim() ||
    filters.life || filters.ability.size > 0 || filters.difficulty.size > 0;

// Reorders the existing <tr>s (no rebuild) and hides the filtered-out ones.
// Equal values keep the default order, maps still loading go last.
function refresh() {
    const ordered = [...rows];
    if (sort) {
        const get = sortValue[sort.key];
        ordered.sort((a, b) => {
            const va = get(a), vb = get(b);
            if (va === undefined || vb === undefined) return (va === undefined) - (vb === undefined) || a.index - b.index;
            if (va < vb) return -sort.dir;
            if (va > vb) return sort.dir;
            return a.index - b.index;
        });
    }
    ordered.forEach(row => {
        row.tr.hidden = !matches(row);
        tbody.appendChild(row.tr);
    });
    emptyMsg.hidden = ordered.some(row => !row.tr.hidden);
    if (activeRow && activeRow.tr.hidden) setActive(null);

    headers.forEach(th => {
        const active = sort && sort.key === th.dataset.sort;
        th.classList.toggle('is-sorted', !!active);
        th.querySelector('.map-sort-icon').textContent = active ? (sort.dir === 1 ? '▲' : '▼') : '⇅';
    });
    chips.forEach(chip => {
        const f = chip.dataset.filter;
        chip.classList.toggle('is-on', f === 'life' ? filters.life : filters[f].has(chip.dataset.value));
    });
    resetBtn.disabled = !isCustomized();
}

headers.forEach(th => th.addEventListener('click', () => {
    const key = th.dataset.sort;
    sort = sort && sort.key === key ? { key, dir: -sort.dir } : { key, dir: 1 };
    saveSort();
    refresh();
}));

chips.forEach(chip => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    if (f === 'life') filters.life = !filters.life;
    else if (filters[f].has(chip.dataset.value)) filters[f].delete(chip.dataset.value);
    else filters[f].add(chip.dataset.value);
    refresh();
}));

searchInput.addEventListener('input', refresh);

resetBtn.addEventListener('click', () => {
    sort = null;
    saveSort();
    searchInput.value = '';
    filters.life = false;
    filters.ability.clear();
    filters.difficulty.clear();
    refresh();
    searchInput.focus();
});

// ---------- hover / keyboard preview (minimap next to the row) ----------
function showPreview(row) {
    if (!row.map || !row.map.layout || !row.map.layout.length) { hidePreview(); return; }
    let grid = minimapCache.get(row.value);
    if (!grid) {
        const rowsN = row.map.layout.length, colsN = row.map.layout[0].length;
        const cell = Math.max(1, Math.floor(PREVIEW_MAX / Math.max(rowsN, colsN)));
        grid = document.createElement('div');
        grid.className = 'map-browser-preview-map';
        grid.style.width = colsN * cell + 'px';
        grid.style.height = rowsN * cell + 'px';
        const inner = document.createElement('div');
        grid.appendChild(inner);
        fillMinimap(inner, row.map);
        minimapCache.set(row.value, grid);
    }
    previewGrid.replaceChildren(grid);
    previewName.textContent = row.name;
    preview.classList.add('is-visible');
}

// next to a point (the mouse), flipped / clamped to stay on screen
function placePreview(px, py) {
    if (!preview.classList.contains('is-visible')) return;
    const gap = 18;
    const w = preview.offsetWidth, h = preview.offsetHeight;
    let x = px + gap, y = py + gap;
    if (x + w > window.innerWidth - 8) x = px - gap - w;   // flip to the left of the mouse
    if (y + h > window.innerHeight - 8) y = window.innerHeight - 8 - h;
    preview.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
}

const hidePreview = () => preview.classList.remove('is-visible');

let keyboardPreview = false; // preview placed at the active row, not at the mouse

// no mouse position to follow - show it right of the active map's name
function placePreviewAtRow(row) {
    const r = row.tr.querySelector('.map-browser-name-cell').getBoundingClientRect();
    placePreview(r.right - 10, r.top - 8);
}

function setActive(row, { scroll = false, fromKeyboard = false } = {}) {
    if (activeRow) activeRow.tr.classList.remove('is-active');
    activeRow = row;
    keyboardPreview = fromKeyboard;
    if (!row) { hidePreview(); return; }
    row.tr.classList.add('is-active');
    if (scroll) row.tr.scrollIntoView({ block: 'nearest' });
    if (fromKeyboard) {
        showPreview(row);
        placePreviewAtRow(row);
    }
}

function chooseRow(row) {
    hidePreview();
    if (mapSelect.value !== row.value) {
        mapSelect.value = row.value;
        mapSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    controller.close();
}

// Up / Down move through the visible rows, Enter picks the highlighted one
// (works while typing in the search box too). ESC is handled by the
// PopupController.
document.addEventListener('keydown', e => {
    if (!popup.classList.contains('is-open')) return;
    const list = visibleRows();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!list.length) return;
        const i = list.indexOf(activeRow);
        const next = i === -1
            ? (e.key === 'ArrowDown' ? 0 : list.length - 1)
            : Math.min(list.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
        setActive(list[next], { scroll: true, fromKeyboard: true });
    } else if (e.key === 'Enter') {
        const row = activeRow && !activeRow.tr.hidden ? activeRow : (list.length === 1 ? list[0] : null);
        if (row) { e.preventDefault(); chooseRow(row); }
    }
});
// scrolling moves the rows: a keyboard-placed preview follows its row, a
// mouse one hides (the row now under the mouse shows its own on mouseenter)
scrollBox.addEventListener('scroll', () => {
    if (keyboardPreview && activeRow) placePreviewAtRow(activeRow);
    else hidePreview();
}, { passive: true });

// One row per <option>, in the same order; the details fill in as each
// map file arrives.
function buildRows() {
    tbody.innerHTML = '';
    rows = Array.from(mapSelect.options).map((opt, index) => {
        const row = { value: opt.value, name: opt.textContent, index, map: null, tr: document.createElement('tr') };
        row.tr.innerHTML = nameCell(row) + '<td colspan="6" class="map-browser-loading">Loading...</td>';
        row.tr.addEventListener('click', () => chooseRow(row));
        row.tr.addEventListener('mouseenter', e => { setActive(row); showPreview(row); placePreview(e.clientX, e.clientY); });
        row.tr.addEventListener('mousemove', e => placePreview(e.clientX, e.clientY));
        row.tr.addEventListener('mouseleave', hidePreview);
        tbody.appendChild(row.tr);

        loadMap(row.value)
            .then(map => {
                row.map = map;
                row.tr.innerHTML = nameCell(row) + rowCells(map);
                refresh();
            })
            .catch(() => {
                row.tr.querySelector('.map-browser-loading').textContent = 'Malformed data for Map';
            });
        return row;
    });
    refresh();
}

document.getElementById('openMapBrowserBtn').addEventListener('click', () => {
    if (!rows.length) buildRows();
    markSelected();
    hidePreview();
    // start the keyboard browsing at the selected map + keep it in view
    const sel = rows.find(r => r.value === mapSelect.value && !r.tr.hidden) || null;
    setActive(sel, { scroll: true });
    searchInput.focus({ preventScroll: true });
});
