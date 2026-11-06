/* Graphics - the editor has its OWN settings, separate from the game's.
   Editor code and the game code it reuses (Map.js, Enemy.js, Tower.js, editor_map.js, main.js)
   all read / write localStorage "graphicsSettings" - the game's per-object Settings. On this
   page that key is redirected to "editorGraphicsSettings", so the editor never changes
   the game's settings and the game's never change the editor. In the editor everything has
   ONE quality (Menu > Graphics switches all objects together, main.js), High by default,
   and the editor remembers it. Runs before any other script of the page. */
(() => {
    const GAME_KEY = 'graphicsSettings', EDITOR_KEY = 'editorGraphicsSettings';
    const proto = Storage.prototype;
    const real = { get: proto.getItem, set: proto.setItem, remove: proto.removeItem };
    const map = (store, key) => (store === window.localStorage && key === GAME_KEY) ? EDITOR_KEY : key;
    proto.getItem = function (key) { return real.get.call(this, map(this, key)); };
    proto.setItem = function (key, value) { return real.set.call(this, map(this, key), value); };
    proto.removeItem = function (key) { return real.remove.call(this, map(this, key)); };

    // every object, 'objects' = map objects (trees, bushes, logs, wells, rocks, bones, cacti,
    // palms, spikes, hay) - the editor never set that one before, so they always stayed High
    const KEYS = ['trees', 'portals', 'enemies', 'towers', 'water', 'terrain', 'roads', 'mountains', 'abilities', 'objects'];
    try {
        const saved = JSON.parse(localStorage.getItem(GAME_KEY) || 'null'); // = the editor's own
        const quality = saved?.terrain === 'low' ? 'low' : 'high';           // High until Low is picked
        const all = {};
        KEYS.forEach(k => { all[k] = quality; });
        localStorage.setItem(GAME_KEY, JSON.stringify(all));
    } catch {}
})();
