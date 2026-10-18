// Lore popup - ONE long parchment split into chapters (the Ember Decree +
// the four Elder Mages). It scrolls normally (wheel, scrollbar, keys); the
// tabs on the bottom roll smooth-scroll to a chapter and the tab of the
// chapter being read lights up. The torn edges move with the parchment and
// the mage chapters ink in as they appear. Opening unrolls the parchment,
// closing (× / ESC / backdrop) rolls it back up before the popup fades.
// Styles: css/ui_lore.css, designed in dev/Lore_Mages.html.

const UNROLL_MS = 500;   // = parchmentUnroll in ui_lore.css
const ROLL_UP_MS = 650;   // = parchmentRollUp in ui_lore.css
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

class LorePopupController extends PopupController {
    constructor(buttonId, popupId) {
        super(buttonId, popupId);
        this.scroll = document.getElementById('loreScroll');
        this.body = document.getElementById('loreBody');
        this.chapters = [...this.popup.querySelectorAll('.lore-chapter')];
        this.animated = [...this.popup.querySelectorAll('.reveal')];
        this.closing = false;
        this._unrollTimeout = null;
        this._rollUpTimeout = null;

        // chapter tabs on the bottom roll
        const nav = document.getElementById('loreNav');
        this.tabs = this.chapters.map((ch, i) => {
            const t = document.createElement('button');
            t.type = 'button';
            t.className = 'lore-tab';
            t.innerHTML = `<span class="lore-tab-num">${NUMERALS[i]}</span>${ch.dataset.label}`;
            t.addEventListener('click', () => this.body.scrollTo({ top: this._topOf(i), behavior: 'smooth' }));
            nav.appendChild(t);
            return t;
        });

        // the torn edges (mask) move with the parchment
        this.body.addEventListener('scroll', () => {
            this.body.style.setProperty('--tear', -this.body.scrollTop + 'px');
            this._updateTabs();
        }, { passive: true });

        // ink-in of the mage chapters as they come into view
        this.io = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) { en.target.classList.add('seen'); this.io.unobserve(en.target); }
            });
        }, { root: this.body, threshold: 0.15 });
    }

    // chapter top in the parchment's scroll coordinates
    _topOf(i) {
        if (i <= 0) return 0;
        return Math.round(this.chapters[i].getBoundingClientRect().top
            - this.body.getBoundingClientRect().top + this.body.scrollTop);
    }

    // active tab = the chapter at the upper third of the view (the last one
    // once the bottom of the parchment is reached)
    _updateTabs() {
        const b = this.body;
        const y = b.scrollTop + b.clientHeight * 0.33;
        let idx = 0;
        this.chapters.forEach((_, i) => { if (this._topOf(i) <= y) idx = i; });
        if (b.scrollTop + b.clientHeight >= b.scrollHeight - 4) idx = this.chapters.length - 1;
        this.tabs.forEach((t, k) => t.classList.toggle('active', k === idx));
    }

    // Every open starts fresh: unrolls at the letter, chapters ink in again.
    open() {
        clearTimeout(this._rollUpTimeout);
        clearTimeout(this._unrollTimeout);
        this.closing = false;
        this.scroll.classList.remove('rolling-up', 'unrolling');
        void this.scroll.offsetWidth;          // restart the unroll animation
        this.scroll.classList.add('unrolling');

        super.open();

        this.animated.forEach(el => { el.classList.remove('seen'); this.io.observe(el); });
        this.body.scrollTop = 0;
        this.body.style.setProperty('--tear', '0px');
        this._updateTabs();
        this._unrollTimeout = setTimeout(() => this.scroll.classList.remove('unrolling'), UNROLL_MS + 100);
    }

    // Roll the parchment back up into the top roll, then fade the popup out
    close() {
        if (this.closing || !this.popup.classList.contains('is-open')) return;
        this.closing = true;
        clearTimeout(this._unrollTimeout);
        this.scroll.classList.remove('unrolling');
        this.scroll.classList.add('rolling-up');
        this._rollUpTimeout = setTimeout(() => {
            this.closing = false;
            super.close();
        }, ROLL_UP_MS);
    }
}

new LorePopupController('openLoreBtn', 'lorePopup');
