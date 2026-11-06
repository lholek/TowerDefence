/* Waves - hovering an option of a Skin select shows the enemy next to it, drawn by the
   game's own Enemy.js art (cropped to the figure): Random = Golem + Eye side by side,
   Golem / Fiery Eye = just that one. The wave cards themselves stay as they are. */
import Enemy from '../../game/Enemy.js';
const SKINS = ['GOLEM', 'EYE'];
const NAMES = { GOLEM: 'Golem', EYE: 'Fiery Eye' };
const cache = new Map();
const heights = new Map(); // cropped picture height per type_quality

const quality = () => {
    try { return (JSON.parse(localStorage.getItem('graphicsSettings')) || {}).enemies || 'low'; }
    catch { return 'low'; }
};
// the enemy's body canvas as the game draws it, trimmed to its visible pixels
const art = (type) => {
    const q = quality();
    const key = type + '_' + q;
    if (cache.has(key)) return cache.get(key);
    let url = '';
    try {
        const fake = Object.create(Enemy.prototype);
        Object.assign(fake, { type, quality: q, size: 30 });
        const src = fake._preRenderEnemy(30);
        const { width: w, height: h } = src;
        const px = src.getContext('2d').getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (px[(y * w + x) * 4 + 3] > 8) {
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
        if (x1 >= x0) {
            const out = document.createElement('canvas');
            out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
            out.getContext('2d').drawImage(src, -x0, -y0);
            url = out.toDataURL('image/png');
            heights.set(key, out.height);
        }
    } catch (e) { console.warn('dev skin preview:', e); }
    cache.set(key, url);
    return url;
};

// the pictures above Type in every enemy group (CSS .enemy-card::before) read these
// the eye was as tall as the golem (both stretched to one height) - too big; at its true
// game size it'd be tiny, so it gets two thirds of the golem's height
const scale = (t, full) => Math.round(t === 'EYE' ? full * 2 / 3 : full);
const keepDecoded = []; // held, so the cards rebuilt on every change reuse the decoded picture
const setVars = () => SKINS.forEach(t => {
    const url = art(t);
    if (url) { const img = new Image(); img.src = url; img.decode?.().catch(() => {}); keepDecoded.push(img); }
    const name = t === 'GOLEM' ? 'golem' : 'eye';
    document.documentElement.style.setProperty(`--dev-skin-${name}`, url ? `url("${url}")` : 'none');
    document.documentElement.style.setProperty(`--dev-skin-${name}-h`, scale(t, 60) + 'px');
});
setVars();
// Menu > Graphics: main.js saves the new quality in its own change handler - read it after
document.getElementById('editorGraphicsSelect')?.addEventListener('change', () => setTimeout(setVars, 0));

// one floating box, shown next to the hovered option of an open Skin list
const pop = document.createElement('div');
pop.className = 'dev-skin-pop';
document.body.appendChild(pop);
let shownFor = null;

const hide = () => { pop.classList.remove('is-open'); shownFor = null; };
const show = (li, sel) => {
    const value = sel.options[+li.dataset.index]?.value ?? '';
    const types = SKINS.includes(value) ? [value] : SKINS;
    // re-read the quality every time: Menu > Graphics (Low / High) changes it
    const state = types.join('+') + '|' + quality();
    if (pop.dataset.state !== state) {
        pop.dataset.state = state;
        pop.replaceChildren(...types.map(t => {
            const fig = document.createElement('figure');
            const img = document.createElement('img');
            img.src = art(t); img.alt = NAMES[t]; img.draggable = false;
            img.style.height = scale(t, 72) + 'px';
            const cap = document.createElement('figcaption');
            cap.textContent = NAMES[t];
            fig.append(img, cap);
            return fig;
        }));
    }
    pop.classList.add('is-open');
    shownFor = li;
    // to the right of the list, centred on the option; to the left if there's no room
    const list = li.closest('.dev-sel-list').getBoundingClientRect();
    const r = li.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = list.right + 10;
    if (left + pw > innerWidth - 8) left = Math.max(8, list.left - pw - 10);
    const top = Math.min(Math.max(8, r.top + r.height / 2 - ph / 2), innerHeight - ph - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
};

document.addEventListener('mouseover', (e) => {
    const li = e.target.closest?.('.dev-sel-option');
    const sel = li?.closest('.dev-sel')?.querySelector(':scope > select[data-key="skin"]');
    if (!li || !sel) { if (shownFor) hide(); return; }
    if (li !== shownFor) show(li, sel);
});
// list closed (pick, click outside, Esc) or scrolled away -> no box left hanging
document.addEventListener('click', () => requestAnimationFrame(() => {
    if (shownFor && !shownFor.closest('.dev-sel-list.is-open')) hide();
}));
document.addEventListener('keydown', () => requestAnimationFrame(() => {
    if (shownFor && !shownFor.isConnected || shownFor && !shownFor.closest('.dev-sel-list.is-open')) hide();
}));
addEventListener('scroll', () => { if (shownFor) hide(); }, true);
