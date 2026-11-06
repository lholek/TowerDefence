/* the map can be panned a bit lower, by the tile strip's height, so its bottom rows
   don't stay hidden under the strip (the game is untouched).
   editor_map.js clamps the camera to the canvas; its camera object (exposed as
   window._editorMapDebug.camera) gets a y setter that applies the same clamp with the
   strip's height added, and ignores the shared clamp re-assigning its own (narrower) result. */
import { currentLevelData } from '../level_data.js';
const TILE = 60; // editor_map.js TILE_SIZE
const canvas = document.getElementById('mapCanvas');
const dock = document.getElementById('devTileDock');

const hook = (cam) => {
    if (!cam || cam.__devExtraPan) return;
    Object.defineProperty(cam, '__devExtraPan', { value: true });
    let y = cam.y;
    const bounds = () => {
        const rows = currentLevelData?.maps?.[0]?.layout?.length || 0;
        const H = canvas.height;
        const rect = canvas.getBoundingClientRect();
        const extra = dock && rect.height ? dock.offsetHeight * (H / rect.height) : 0;
        return { H, mapH: rows * TILE * cam.zoom, extra, ok: rows > 0 && H > 0 };
    };
    const shared = (s, b) => b.mapH <= b.H ? (b.H - b.mapH) / 2 : Math.min(0, Math.max(b.H - b.mapH, s));
    const ours = (s, b) => {
        const room = b.H - b.extra;
        return b.mapH <= room ? (room - b.mapH) / 2 : Math.min(0, Math.max(room - b.mapH, s));
    };
    Object.defineProperty(cam, 'y', {
        configurable: true, enumerable: true,
        get: () => y,
        set: (v) => {
            const b = bounds();
            if (!b.ok) { y = v; return; }
            // the shared clampCamera() writing back its own result for our value -> keep ours
            if (Math.abs(v - shared(y, b)) < 0.01) { y = ours(y, b); return; }
            y = ours(v, b);
        }
    });
    cam.y = y;
    window.app?.mapEditor?.renderMap?.();
};

// --- a loaded / pasted map always starts centered (classic: it kept the old camera,
//     so a big map opened at its top-left corner). Centered in the part of the canvas
//     above the tile strip. Triggers: the editor's start, a different map showing up
//     (name or size changed - e.g. pasted JSON, Resize Map), and explicitly a paste
//     into Final JSON or loading a Save Slot (even the same map again). Undo / Redo of
//     normal edits keeps the camera where it is.
const center = () => {
    const cam = window._editorMapDebug?.camera;
    const layout = currentLevelData?.maps?.[0]?.layout;
    if (!cam || !layout?.length || !layout[0]?.length) return;
    window.app?.mapEditor?.renderMap?.(); // canvas size up to date first
    const W = canvas.width, H = canvas.height;
    const rect = canvas.getBoundingClientRect();
    const extra = dock && rect.height ? dock.offsetHeight * (H / rect.height) : 0;
    cam.x = (W - layout[0].length * TILE * cam.zoom) / 2;
    cam.y = (H - extra - layout.length * TILE * cam.zoom) / 2;
    window.app?.mapEditor?.renderMap?.();
};
const sig = () => {
    const m = currentLevelData?.maps?.[0];
    return m?.layout?.length ? `${m.name}|${m.layout.length}x${m.layout[0]?.length}` : '';
};
let lastSig = '', lastData = null, forceUntil = 0;
const force = () => { forceUntil = performance.now() + 10000; };
document.getElementById('jsonEditor')?.addEventListener('paste', force);
document.addEventListener('click', e => { if (e.target.closest?.('.btn-save-slot')) force(); }, true);
const watch = () => {
    const s = sig();
    const forced = forceUntil > performance.now() && currentLevelData !== lastData;
    if (s && (s !== lastSig || forced)) {
        forceUntil = forced ? 0 : forceUntil;
        requestAnimationFrame(center);
    }
    lastSig = s;
    lastData = currentLevelData;
};

const wait = () => {
    const cam = window._editorMapDebug?.camera;
    if (cam) { hook(cam); lastData = currentLevelData; watch(); setInterval(watch, 250); }
    else requestAnimationFrame(wait);
};
wait();
