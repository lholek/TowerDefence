// CardFx.js
//
// Animated background pieces for the Beta 1.1 cards (designed in
// dev/Graphics_1.1.html, styled by css/bars.css): fills a card's
// .concept-fx layer with small spans for its theme - lava bubbles, wind +
// arrows, coins, snow, or slow motes in a tower's own color. Only
// transform + opacity are animated, and everything stands still on
// "UI Effects: Low" / while the game is paused (see css/bars.css).

// Seeded random, so every card keeps the same (but per-card different)
// layout - no reshuffle each time the shop is rebuilt.
function seededRandom(seed) {
  let s = seed % 2147483647 || 7;
  return (min, max) => {
    s = (s * 16807) % 2147483647;
    return min + ((s - 1) / 2147483646) * (max - min);
  };
}

function piece(fx, cls, style) {
  const s = document.createElement('span');
  s.className = cls;
  Object.entries(style).forEach(([k, v]) => s.style.setProperty(k, v));
  fx.appendChild(s);
}

const builders = {
  'concept-lava-floor': (fx, rnd) => {
    for (let i = 0; i < 12; i++) {
      const size = rnd(10, 22);
      piece(fx, 'lava-bubble', {
        left: rnd(2, 94) + '%', top: rnd(-4, 50) + '%',
        width: size + 'px', height: size + 'px',
        '--d': rnd(4.8, 7.8).toFixed(2) + 's', '--delay': (-rnd(0, 7.8)).toFixed(2) + 's'
      });
    }
  },
  'concept-towers-fury': (fx, rnd) => {
    for (let i = 0; i < 6; i++) {
      piece(fx, 'fury-wind', {
        left: '0', top: rnd(6, 88) + '%', width: rnd(70, 130) + 'px',
        '--d': rnd(1.6, 2.6).toFixed(2) + 's', '--delay': (-rnd(0, 2.6)).toFixed(2) + 's'
      });
    }
    for (let i = 0; i < 3; i++) {
      piece(fx, 'fury-arrow', {
        left: '0', top: (14 + i * 28 + rnd(-4, 4)) + '%',
        '--d': rnd(1.4, 2.1).toFixed(2) + 's', '--delay': (-rnd(0, 2.1)).toFixed(2) + 's'
      });
    }
  },
  // Ready for the upcoming abilities (Gold Rush / Ice Storm) - css/bars.css
  // already has their themes.
  'concept-gold-rush': (fx, rnd) => {
    for (let i = 0; i < 6; i++) { // far coins
      const size = rnd(8, 11);
      piece(fx, 'gold-coin far', {
        left: rnd(3, 95) + '%', top: '0', width: size + 'px', height: size + 'px',
        '--d': rnd(3.4, 4.8).toFixed(2) + 's', '--delay': (-rnd(0, 4.8)).toFixed(2) + 's'
      });
    }
    for (let i = 0; i < 7; i++) { // near coins
      const size = rnd(14, 19);
      piece(fx, 'gold-coin', {
        left: rnd(3, 93) + '%', top: '0', width: size + 'px', height: size + 'px',
        '--d': rnd(2.4, 3.4).toFixed(2) + 's', '--delay': (-rnd(0, 3.4)).toFixed(2) + 's'
      });
    }
    for (let i = 0; i < 4; i++) { // glints
      piece(fx, 'gold-glint', {
        left: rnd(5, 92) + '%', top: rnd(4, 50) + '%',
        '--d': rnd(2.4, 3.6).toFixed(2) + 's', '--delay': (-rnd(0, 3.6)).toFixed(2) + 's'
      });
    }
  },
  'concept-ice-storm': (fx, rnd) => {
    for (let i = 0; i < 3; i++) { // snow-fog banks
      const w = rnd(150, 230);
      piece(fx, 'ice-mist', {
        left: '0', top: rnd(-10, 60) + '%', width: w + 'px', height: (w * 0.32) + 'px',
        '--d': rnd(5.5, 8).toFixed(2) + 's', '--delay': (-rnd(0, 8)).toFixed(2) + 's'
      });
    }
    for (let i = 0; i < 12; i++) { // far snow dots (was 18 - each one is its own animated layer)
      piece(fx, 'ice-dot', {
        left: rnd(0, 115) + '%', top: '0', '--size': rnd(1.5, 3).toFixed(1) + 'px',
        '--o': rnd(0.45, 0.85).toFixed(2),
        '--d': rnd(1.4, 2.4).toFixed(2) + 's', '--delay': (-rnd(0, 2.4)).toFixed(2) + 's'
      });
    }
    for (let i = 0; i < 6; i++) { // snow lashes
      piece(fx, 'ice-lash', {
        left: '0', top: rnd(-5, 60) + '%', width: rnd(36, 80) + 'px',
        '--d': rnd(1.0, 1.6).toFixed(2) + 's', '--delay': (-rnd(0, 1.6)).toFixed(2) + 's'
      });
    }
    for (let i = 0; i < 8; i++) { // near flakes
      piece(fx, 'ice-flake' + (i % 3 === 0 ? ' soft' : ''), {
        left: rnd(5, 115) + '%', top: '0',
        '--size': rnd(9, 17).toFixed(1) + 'px',
        '--d': rnd(2.4, 3.8).toFixed(2) + 's', '--delay': (-rnd(0, 3.8)).toFixed(2) + 's'
      });
    }
  },
  // tower cards: slow motes of the tower's own color drifting up
  'concept-tower': (fx, rnd) => {
    for (let m = 0; m < 7; m++) {
      // drift left / right via class (not a var() in the keyframes - see css/bars.css)
      piece(fx, 'tower-mote ' + (rnd(0, 1) < 0.5 ? 'l' : 'r'), {
        left: rnd(4, 96) + '%', top: rnd(30, 95) + '%',
        '--size': rnd(2, 4).toFixed(1) + 'px',
        '--o': rnd(0.4, 0.85).toFixed(2),
        '--d': rnd(4.5, 7.5).toFixed(2) + 's', '--delay': (-rnd(0, 7.5)).toFixed(2) + 's'
      });
    }
  }
};

/**
 * Builds and prepends the .concept-fx layer for a card.
 * @param {HTMLElement} card  the .concept-card element
 * @param {string} theme      builder key, e.g. 'concept-lava-floor' / 'concept-tower'
 * @param {number} seed       any number, keeps the layout stable per card
 */
export function buildCardFx(card, theme, seed = 7) {
  const build = builders[theme];
  if (!build) return;
  const fx = document.createElement('div');
  fx.className = 'concept-fx';
  build(fx, seededRandom(seed));
  card.prepend(fx);
}

// 3 018 / 16 000 - thousands separated by a (non-breaking) space, not a comma
export function groupNum(n) {
  const [int, dec] = String(n).split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (dec ? '.' + dec : '');
}
