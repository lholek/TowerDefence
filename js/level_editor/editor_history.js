/**
 * Undo/Redo history for the Level Editor.
 *
 * How it hooks in: every mutation in the editor already funnels through
 * modifyJson() in json_functions.js (map drawing, tower/wave/ability edits,
 * basic info edits, etc). Each of the other editor_*.js files wraps that
 * import locally so every one of its modifyJson(...) calls is automatically
 * tagged with a "section" ('map' | 'tower' | 'wave' | 'ability' | 'basic')
 * without having to touch every individual call site — and call sites that
 * touch one specific field/card/row can additionally pass a CSS selector for
 * that exact element, so Undo/Redo can highlight+scroll to the precise spot
 * that changed instead of just the whole section.
 *
 * modifyJson() calls recordHistory(target) BEFORE running the mutation, so
 * each history entry stores the state as it was right before that change,
 * plus where that change happened.
 */
import { currentLevelData, updateCurrentLevelData } from './level_data.js';

let modules = {}; // { updateUIFromLoadedData, setStatus }

const MAX_HISTORY = 50;
const SCROLL_DURATION = 400; // ms — fast smooth scroll

let undoStack = []; // [{ snapshot, section, selector, fallbackSelector }]
let redoStack = [];
let isApplyingHistory = false; // guards against re-entrant recordHistory during undo/redo
let isBusy = false; // true while an Undo/Redo is mid-flight (scrolling, then applying)

// section -> panel element id (used both to check visibility and as the last-resort scroll target)
const PANEL_IDS = {
    map: 'mapEditorPanel',
    tower: 'towerEditorPanel',
    wave: 'waveEditorPanel',
    ability: 'abilityEditorPanel',
    basic: 'basicInfoEditorPanel',
};

// section -> default fallback container selector, used when a specific item's selector
// doesn't match anything in the current DOM (e.g. it was the item that got deleted).
const CONTAINER_SELECTORS = {
    map: '#mapEditorPanel',
    tower: '#towerEditorContent',
    wave: '#waves-editor-container',
    ability: '#abilityEditorContent',
    basic: '#basicInfoEditorPanel',
};

export function setModuleReferences(refs) {
    modules = refs;
}

/**
 * Wipes both stacks — used when a completely unrelated map is loaded (e.g. from a save
 * slot), where "undo" pointing back into the previous map's history would make no sense.
 */
export function resetHistory() {
    undoStack = [];
    redoStack = [];
    updateButtons();
}

function cloneState() {
    return JSON.parse(JSON.stringify(currentLevelData));
}

function updateButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = isBusy || undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = isBusy || redoStack.length === 0;
}

/**
 * Swaps a button's content for a small 3-dot "loading" indicator while an Undo/Redo is
 * mid-flight, then restores its original content once it's done.
 */
function setButtonLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    if (loading) {
        if (btn.dataset.originalContent === undefined) {
            btn.dataset.originalContent = btn.innerHTML;
        }
        btn.innerHTML = '<span class="btn-dots"><i></i><i></i><i></i></span>';
        btn.classList.add('is-loading');
    } else {
        if (btn.dataset.originalContent !== undefined) {
            btn.innerHTML = btn.dataset.originalContent;
            delete btn.dataset.originalContent;
        }
        btn.classList.remove('is-loading');
    }
}

/**
 * Normalizes what modifyJson() passes in: either a plain section string (legacy /
 * section-only calls), or { section, selector, fallbackSelector } for a precise target.
 */
function normalizeTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') return { section: target, selector: null, fallbackSelector: null };
    if (!target.section) return null;
    return { section: target.section, selector: target.selector || null, fallbackSelector: target.fallbackSelector || null };
}

/**
 * Called by modifyJson() right before it mutates currentLevelData.
 * @param {string|{section:string, selector?:string, fallbackSelector?:string}|null} target
 */
export function recordHistory(target) {
    const normalized = normalizeTarget(target);
    if (!normalized || isApplyingHistory) return;
    undoStack.push({ snapshot: cloneState(), ...normalized });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateButtons();
}

// --- Manual recording (for edits that mutate currentLevelData directly, outside of
// modifyJson's modifyFn — currently only the map canvas's drag-to-paint tool, which
// mutates the grid live on every mousemove for performance and only syncs afterwards) ---
//
// beginManualRecord() must be called BEFORE any mutation happens (e.g. on mousedown),
// capturing the true "before" snapshot into a pending slot. The caller then either:
//   - commitManualRecord() once it knows a real change happened (e.g. on mouseup, only
//     if at least one tile actually changed), which pushes the pending snapshot; or
//   - cancelManualRecord() to discard it (e.g. the stroke ended up not changing anything).
let pendingManualSnapshot = null; // { snapshot, section }

export function beginManualRecord(section) {
    if (isApplyingHistory) {
        pendingManualSnapshot = null;
        return;
    }
    pendingManualSnapshot = { snapshot: cloneState(), section };
}

export function commitManualRecord(selector = null, fallbackSelector = null) {
    if (!pendingManualSnapshot) return;
    undoStack.push({ ...pendingManualSnapshot, selector, fallbackSelector });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    pendingManualSnapshot = null;
    updateButtons();
}

export function cancelManualRecord() {
    pendingManualSnapshot = null;
}

/**
 * The editor tabs are toggle buttons (each click shows/hides its panel independently),
 * so we must only click a tab's button when its panel is currently hidden — clicking an
 * already-visible tab's button would hide it instead.
 */
function ensurePanelVisible(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel || !panel.classList.contains('d-none')) return;

    const btn = document.querySelector(`.editor-tabs button[data-target*="${panelId}"]`);
    if (btn) btn.click();
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animatedScrollTo(targetY, duration) {
    const startY = window.scrollY || window.pageYOffset;
    const distance = targetY - startY;
    if (Math.abs(distance) < 1) return;
    const startTime = performance.now();

    function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        window.scrollTo(0, startY + distance * easeInOutQuad(t));
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function safeQuery(selector) {
    if (!selector) return null;
    try {
        return document.querySelector(selector);
    } catch {
        return null; // a stale/malformed selector should never break undo/redo
    }
}

/**
 * Picks the best element to jump to: the exact item (selector), else the section's
 * fallback container for that specific edit, else the section's own default container,
 * else the whole panel as a last resort (e.g. an entire item was deleted and even its
 * list container isn't more specific than the panel).
 */
function resolveJumpTarget(section, selector, fallbackSelector) {
    return safeQuery(selector)
        || safeQuery(fallbackSelector)
        || safeQuery(CONTAINER_SELECTORS[section])
        || document.getElementById(PANEL_IDS[section]);
}

function scrollToElement(el) {
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const absoluteY = rect.top + (window.scrollY || window.pageYOffset);
    // Center it a bit rather than jamming it flush against the top edge.
    const offset = Math.min(80, rect.height / 2 + 20);
    animatedScrollTo(Math.max(0, absoluteY - offset), SCROLL_DURATION);
}

function highlightElement(el) {
    if (!el) return;
    el.classList.add('history-jump-highlight');
    setTimeout(() => el.classList.remove('history-jump-highlight'), 900);
}

function applyDataChange(snapshot) {
    isApplyingHistory = true;
    try {
        updateCurrentLevelData(snapshot);
        if (modules.updateUIFromLoadedData) modules.updateUIFromLoadedData();
    } finally {
        isApplyingHistory = false;
    }
}

/**
 * Scrolls to where the change happened FIRST (while the data is still in its pre-Undo/Redo
 * state), then only once that scroll has finished does it actually apply the snapshot —
 * so the user sees the view arrive at the right spot before anything changes under them,
 * rather than the data flipping instantly and the page catching up afterwards.
 */
function applySnapshot(snapshot, section, selector, fallbackSelector, onComplete) {
    const panelId = PANEL_IDS[section];

    if (!panelId) {
        applyDataChange(snapshot);
        if (onComplete) onComplete();
        return;
    }

    ensurePanelVisible(panelId);
    // Double rAF: let the panel's d-none removal reflow before we measure positions and
    // look for the specific target element (resolved in the CURRENT, pre-change DOM).
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const target = resolveJumpTarget(section, selector, fallbackSelector);
        scrollToElement(target);

        setTimeout(() => {
            applyDataChange(snapshot);
            // Re-resolve after the re-render: the specific element may not have existed
            // before (e.g. Undo of a delete) or may be gone now (e.g. Redo of a delete),
            // so find the best target again in the post-change DOM before highlighting it.
            requestAnimationFrame(() => requestAnimationFrame(() => {
                highlightElement(resolveJumpTarget(section, selector, fallbackSelector));
                if (onComplete) onComplete();
            }));
        }, SCROLL_DURATION + 50);
    }));
}

export function undo() {
    if (isBusy) return;
    if (undoStack.length === 0) {
        if (modules.setStatus) modules.setStatus('Nothing to undo.', true);
        return;
    }
    const entry = undoStack.pop();
    redoStack.push({ snapshot: cloneState(), section: entry.section, selector: entry.selector, fallbackSelector: entry.fallbackSelector });
    if (redoStack.length > MAX_HISTORY) redoStack.shift();

    isBusy = true;
    setButtonLoading('undoBtn', true);
    updateButtons(); // disables both buttons for the duration (isBusy)

    applySnapshot(entry.snapshot, entry.section, entry.selector, entry.fallbackSelector, () => {
        isBusy = false;
        setButtonLoading('undoBtn', false);
        if (modules.setStatus) modules.setStatus('Undo applied.');
        updateButtons();
    });
}

export function redo() {
    if (isBusy) return;
    if (redoStack.length === 0) {
        if (modules.setStatus) modules.setStatus('Nothing to redo.', true);
        return;
    }
    const entry = redoStack.pop();
    undoStack.push({ snapshot: cloneState(), section: entry.section, selector: entry.selector, fallbackSelector: entry.fallbackSelector });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();

    isBusy = true;
    setButtonLoading('redoBtn', true);
    updateButtons(); // disables both buttons for the duration (isBusy)

    applySnapshot(entry.snapshot, entry.section, entry.selector, entry.fallbackSelector, () => {
        isBusy = false;
        setButtonLoading('redoBtn', false);
        if (modules.setStatus) modules.setStatus('Redo applied.');
        updateButtons();
    });
}

export function initHistoryButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);

    // Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) — skipped while typing in an input/textarea so we
    // don't hijack native text-field undo.
    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName || '').toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);
        if (isEditable) return;

        if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
        } else if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            redo();
        }
    });

    updateButtons();
}
