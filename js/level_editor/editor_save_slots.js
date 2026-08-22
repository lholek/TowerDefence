/**
 * 5 local-storage save slots for the Level Editor.
 *
 * Each slot just stores the raw currentLevelData JSON (nothing fancier — no metadata
 * object, matches what was asked for: "stačí jenom ten json"). A slot's button label is
 * derived on the fly from the stored JSON's map title, so there's nothing to keep in sync.
 *
 * UX: the main slot button LOADS that slot's map (with a confirm, since it replaces the
 * whole working map and clears Undo/Redo history). The small 💾 button next to it SAVES
 * the current map into that slot (with a confirm if the slot isn't empty). The 🗑️ button
 * clears that slot (with a confirm).
 */
import { currentLevelData, updateCurrentLevelData } from './level_data.js';
import { customConfirm } from './json_functions.js';

const SLOT_COUNT = 5;
const STORAGE_PREFIX = 'td_level_editor_save_slot_';

let modules = {}; // { updateUIFromLoadedData, resetEditorMap, resetHistory, setStatus }

export function setModuleReferences(refs) {
    modules = refs;
}

function slotKey(n) {
    return `${STORAGE_PREFIX}${n}`;
}

function readSlot(n) {
    try {
        const raw = localStorage.getItem(slotKey(n));
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null; // corrupted/foreign data in that key should never crash the editor
    }
}

function slotTitle(n) {
    const data = readSlot(n);
    const name = data && data.maps && data.maps[0] && data.maps[0].name;
    return (name && String(name).trim()) ? String(name).trim() : `Empty Slot ${n}`;
}

function renderSlotLabels() {
    for (let n = 1; n <= SLOT_COUNT; n++) {
        const btn = document.getElementById(`loadSlotBtn${n}`);
        if (!btn) continue;
        const title = slotTitle(n);
        btn.textContent = title;
        btn.title = `Load "${title}"`;
        btn.classList.toggle('is-empty', !readSlot(n));
    }
}

async function saveToSlot(n) {
    const existing = readSlot(n);
    if (existing) {
        const existingName = (existing.maps && existing.maps[0] && existing.maps[0].name) || `Slot ${n}`;
        const confirmed = await customConfirm(
            'Overwrite Save Slot',
            `Slot ${n} already contains "${existingName}". Overwrite it with the current map?`
        );
        if (!confirmed) return;
    }

    try {
        localStorage.setItem(slotKey(n), JSON.stringify(currentLevelData));
        renderSlotLabels();
        if (modules.setStatus) modules.setStatus(`Map saved to slot ${n}.`);
    } catch (err) {
        console.error('Save slot failed:', err);
        if (modules.setStatus) modules.setStatus(`Failed to save to slot ${n} (storage full?).`, true);
    }
}

async function loadFromSlot(n) {
    const data = readSlot(n);
    if (!data) {
        if (modules.setStatus) modules.setStatus(`Slot ${n} is empty.`, true);
        return;
    }

    const title = (data.maps && data.maps[0] && data.maps[0].name) || `Slot ${n}`;
    const confirmed = await customConfirm(
        'Load Map',
        `Load "${title}"? Any unsaved changes to the current map will be lost, and Undo/Redo history will be cleared.`
    );
    if (!confirmed) return;

    // Deep-copy so later edits never mutate what's sitting in localStorage.
    const ok = updateCurrentLevelData(JSON.parse(JSON.stringify(data)));
    if (!ok) {
        if (modules.setStatus) modules.setStatus(`Slot ${n} data is invalid.`, true);
        return;
    }

    // This is a wholesale swap to an unrelated map, not an edit — rebuild the map's
    // rendering layers and drop the Undo/Redo history rather than letting it dangle
    // pointing at a map that's no longer loaded.
    if (modules.resetEditorMap) modules.resetEditorMap();
    if (modules.resetHistory) modules.resetHistory();
    if (modules.updateUIFromLoadedData) modules.updateUIFromLoadedData();
    if (modules.setStatus) modules.setStatus(`Map loaded from slot ${n}.`);
}

async function deleteSlot(n) {
    const existing = readSlot(n);
    if (!existing) {
        if (modules.setStatus) modules.setStatus(`Slot ${n} is already empty.`, true);
        return;
    }

    const existingName = (existing.maps && existing.maps[0] && existing.maps[0].name) || `Slot ${n}`;
    const confirmed = await customConfirm(
        'Delete Save Slot',
        `Delete "${existingName}" from Slot ${n}? This cannot be undone.`
    );
    if (!confirmed) return;

    localStorage.removeItem(slotKey(n));
    renderSlotLabels();
    if (modules.setStatus) modules.setStatus(`Slot ${n} deleted.`);
}

export function initSaveSlots() {
    for (let n = 1; n <= SLOT_COUNT; n++) {
        const loadBtn = document.getElementById(`loadSlotBtn${n}`);
        const saveBtn = document.getElementById(`saveSlotBtn${n}`);
        const deleteBtn = document.getElementById(`deleteSlotBtn${n}`);
        if (loadBtn) loadBtn.addEventListener('click', () => loadFromSlot(n));
        if (saveBtn) saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveToSlot(n);
        });
        if (deleteBtn) deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSlot(n);
        });
    }
    renderSlotLabels();
}
