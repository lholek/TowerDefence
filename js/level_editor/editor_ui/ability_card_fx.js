/* ability cards get the animated background of their type, built exactly like the game's
   ability cards (js/game/CardFx.js + css/bars.css). The editor re-renders the list on edits, so an
   observer adds the layer to every new card. The type comes from the card's Class ID field. */
import { buildCardFx } from '../../game/CardFx.js';

const THEMES = {
    lava_floor: 'concept-lava-floor',
    towers_fury: 'concept-towers-fury',
    gold_rush: 'concept-gold-rush',
    ice_storm: 'concept-ice-storm'
};

function decorate(card, index) {
    if (card.querySelector(':scope > .dev-ab-bg')) return;
    const id = card.querySelector('.card-header input[disabled]')?.value;
    const theme = THEMES[id];
    if (!theme) return;
    const bg = document.createElement('div');
    bg.className = `dev-ab-bg concept-card ${theme}`;
    bg.setAttribute('aria-hidden', 'true');
    bg.dataset.theme = theme;
    bg.dataset.seed = index * 131 + 7;
    card.classList.add('dev-ab');
    card.prepend(bg);
    // the dark veil over the background (CSS .dev-ab-veil)
    const veil = document.createElement('div');
    veil.className = 'dev-ab-veil';
    veil.setAttribute('aria-hidden', 'true');
    bg.after(veil);
    resizer.observe(bg); // fills it with tiles once it has a size (hidden panel = 0 x 0)
    onScreen.observe(bg); // animations only run while the card is in view
}

// one 260 x 132 tile of the game card's pieces per grid cell - rebuilt only when the grid changes
function tile(bg, w = bg.clientWidth, h = bg.clientHeight) {
    const cols = Math.ceil(w / 260);
    const rows = Math.ceil(h / 132);
    const grid = `${cols}x${rows}`;
    if (!cols || !rows || bg.dataset.grid === grid) return;
    bg.dataset.grid = grid;
    bg.querySelectorAll(':scope > .dev-ab-tile').forEach(t => t.remove());
    // every edit anywhere re-renders the ability cards too - build each (theme, seed, grid)
    // set of tiles once and clone it afterwards
    const key = `${bg.dataset.theme}|${bg.dataset.seed}|${grid}`;
    let set = tileCache.get(key);
    if (!set) {
        set = document.createDocumentFragment();
        const seed = +bg.dataset.seed;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const t = document.createElement('div');
                t.className = 'dev-ab-tile';
                t.style.left = c * 260 + 'px';
                t.style.top = r * 132 + 'px';
                buildCardFx(t, bg.dataset.theme, seed + (r * cols + c) * 37);
                set.appendChild(t);
            }
        }
        tileCache.set(key, set);
    }
    bg.appendChild(set.cloneNode(true));
}
const tileCache = new Map();
const onScreen = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.target.isConnected) { onScreen.unobserve(e.target); return; }
    e.target.classList.toggle('dev-ab-off', !e.isIntersecting);
}), { rootMargin: '150px 0px' });
const resizer = new ResizeObserver(entries => entries.forEach(e => {
    if (!e.target.isConnected) resizer.unobserve(e.target); // card re-rendered away
    else tile(e.target, e.contentRect.width, e.contentRect.height); // no forced layout
}));

const content = document.getElementById('abilityEditorContent');
const decorateAll = () => content.querySelectorAll('.ability-card').forEach((c, i) => decorate(c, i));
new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && !n.matches('.dev-ab-bg, .dev-ab-tile, .dev-ab-veil')))) decorateAll();
}).observe(content, { childList: true, subtree: true });
decorateAll();
