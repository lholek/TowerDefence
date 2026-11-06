/* Tower editor - a live preview of each tower's shop card, built the same way as
   Game.createTowerShop() (real Tower pre-render, same crop, same markup + css/bars.css).
   The editor re-renders the tower list now and then, so a MutationObserver re-adds the
   previews; typing in a field updates its own card right away. */
import Tower from '../../game/Tower.js';
import { buildCardFx, groupNum } from '../../game/CardFx.js';

const TILE = 80;
// just enough of a map for Tower's constructor (only the pre-rendered image is used)
const stubMap = { tileSize: TILE, tileToWorld: () => ({ x: 0, y: 0 }) };
const num = v => Number(String(v ?? '').replace(/[\s\u00A0]/g, '').replace(',', '.')) || 0;

// every edit anywhere re-renders the tower cards too - draw each color / quality once
const imgCache = new Map();
function towerImage(color) {
    // follow the editor's own Graphics: Low / High select
    const quality = document.getElementById('editorGraphicsSelect')?.value || 'low';
    const key = color + '|' + quality;
    if (!imgCache.has(key)) imgCache.set(key, drawTower(color, quality));
    return imgCache.get(key);
}
function drawTower(color, quality) {
    const t = new Tower(null, stubMap, 0, 0, { color });
    const src = quality === 'high' ? t._preRenderTowerHigh(TILE) : t._preRenderTowerLow(TILE);
    // same 45% crop as the game's shop card
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const cropSize = src.width * 0.45;
    c.getContext('2d').drawImage(src, src.width / 2.5 - cropSize / 2, src.height / 2 - cropSize / 1.2, cropSize, cropSize, 0, 0, 120, 120);
    return c.toDataURL();
}

function cardHtml(type, index) {
    const dps = type.fireRate > 0 ? type.damage * 1000 / type.fireRate : 0;
    const range = type.range / TILE;
    const speed = type.speed * 144 / TILE;
    const fmt = n => groupNum(n >= 100 ? Math.round(n) : Number(n.toFixed(1)));
    const price = groupNum(type.price);
    const name = String(type.name || '').replace(/[<>&"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch]);
    return `
        <div class="concept-card-index">${index}</div>
        <div class="concept-tower-img"><img src="${towerImage(type.color)}" alt="" /></div>
        <div class="concept-tower-side">
          <div class="concept-card-name${name.length > 14 ? ' concept-name-long' : ''}">${name}</div>
          <div class="concept-tower-values">
            <div class="concept-tower-base">
              <div class="concept-tower-row price"><span>🪙 Price</span><b>${price}</b></div>
              <div class="concept-tower-row"><span>💰 Sell</span><b>${groupNum(type.sellPrice)}</b></div>
              <div class="concept-tower-row"><span>💥 DPS</span><b class="concept-num">${fmt(dps)}</b></div>
            </div>
            <div class="concept-tower-stats">
              <div class="concept-tower-stat price"><span><i>🪙</i>Price</span><b>${price}</b></div>
              <div class="concept-tower-stat"><span><i>💥</i>DPS</span><b>${fmt(dps)}</b></div>
              <div class="concept-tower-stat"><span><i>⚔️</i>Damage</span><b>${fmt(type.damage)}</b></div>
              <div class="concept-tower-stat"><span><i>🎯</i>Range</span><b>${range.toFixed(1)} <small>tiles</small></b></div>
              <div class="concept-tower-stat"><span><i>⏱️</i>Fire rate</span><b>${type.fireRate} <small>ms</small></b></div>
              <div class="concept-tower-stat"><span><i>🗲</i>Speed</span><b>${speed.toFixed(1)} <small>tiles/s</small></b></div>
            </div>
          </div>
        </div>`;
}

// reads the card's own fields, so the preview follows typing before the editor saves it
function readTower(card) {
    const v = key => card.querySelector(`[data-key="${key}"]`)?.value;
    return {
        name: v('name'), color: v('color') || '#f0c674',
        price: num(v('price')), damage: num(v('damage')), fireRate: num(v('fireRate')),
        range: num(v('range')), speed: num(v('speed')), sellPrice: num(v('sellPrice'))
    };
}

function update(card) {
    const wrap = card.querySelector('.dev-tower-preview');
    if (!wrap) return;
    const type = readTower(card);
    const index = [...document.querySelectorAll('#towerEditorContent .tower-card')].indexOf(card) + 1;
    const key = JSON.stringify(type) + index + (document.getElementById('editorGraphicsSelect')?.value || '');
    if (wrap.dataset.key === key) return; // nothing changed - keep the card (and its hover state)
    wrap.dataset.key = key;
    const item = document.createElement('div');
    item.className = 'concept-card concept-tower';
    item.style.setProperty('--accent', type.color);
    item.innerHTML = cardHtml(type, index);
    buildCardFx(item, 'concept-tower', index * 97 + 11);
    wrap.querySelector('.concept-tower')?.remove();
    wrap.appendChild(item);
}

function addPreviews() {
    document.querySelectorAll('#towerEditorContent .tower-card').forEach(card => {
        const body = card.querySelector('.card-body');
        // Color goes up next to Name (moved, not copied - the editor's listeners stay on it)
        const color = body?.querySelector('.card-body-tower-color');
        const nameLabel = card.querySelector('.card-header [data-key="name"]')?.closest('label');
        if (color && nameLabel) nameLabel.after(color);
        // its "i" after the colour swatch
        const colorInfo = color?.querySelector('.label-text .info-icon');
        const swatch = color?.querySelector('[data-key="color"]');
        if (colorInfo && swatch) swatch.after(colorInfo);
        if (body && !body.querySelector('.dev-tower-preview')) {
            body.insertAdjacentHTML('beforeend', '<div class="dev-tower-preview"><span class="label-text">Preview</span></div>');
        }
        update(card);
    });
}

const content = document.getElementById('towerEditorContent');
// the preview's own DOM changes are ignored (only cards being added / replaced matter)
new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches('.tower-card') || n.querySelector?.('.tower-card'))))) addPreviews();
}).observe(content, { childList: true, subtree: true });
content.addEventListener('input', e => { const card = e.target.closest('.tower-card'); if (card) update(card); });
content.addEventListener('change', e => { const card = e.target.closest('.tower-card'); if (card) update(card); });
// steppers (- / +) change the value without an input event
content.addEventListener('click', e => { const card = e.target.closest('.tower-card'); if (card) setTimeout(() => update(card), 0); });
document.getElementById('editorGraphicsSelect')?.addEventListener('change', addPreviews);
addPreviews();
