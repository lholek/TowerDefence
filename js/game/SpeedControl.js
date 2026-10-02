// SpeedControl.js
//
// The game-speed buttons (1x ... 5x) in the top bar. The real
// <select id="gameSpeedSelect"> stays the single source of truth - just
// hidden (css/bars.css): main.js listens to its 'change' event (sets
// game.setSpeed() + the .is-boosted pulse class) and main.js / UI.js /
// Game.js reset it with a plain `select.value = "1"`. So the buttons only
// ever write to the select, and mirror it back whenever it changes -
// including those programmatic resets, which fire no 'change' event.

(function () {
  const select = document.getElementById('gameSpeedSelect');
  const group = document.getElementById('gameSpeedButtons');
  if (!select || !group) return;

  const buttons = [...group.querySelectorAll('button[data-speed]')];

  function syncButtons() {
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.speed === select.value));
  }

  buttons.forEach(btn => btn.addEventListener('click', () => {
    if (select.value === btn.dataset.speed) return;
    select.value = btn.dataset.speed;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }));

  // Catch `select.value = x` assignments (they fire no event): wrap the
  // native value property on this one element (same trick CustomSelect.js
  // uses for the other selects).
  const native = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(select, 'value', {
    configurable: true,
    get() { return native.get.call(this); },
    set(v) { native.set.call(this, v); syncButtons(); }
  });
  select.addEventListener('change', syncButtons);

  syncButtons();
})();
