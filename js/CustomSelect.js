// CustomSelect.js
//
// Wraps a real <select> with a custom-styled dropdown so individual
// <option>s can get a real CSS :hover (native open dropdown lists are
// drawn by the OS, outside CSS's reach - see css/cursor.css).
//
// The real <select> stays in the DOM and stays the single source of
// truth: every other script (main.js, UI.js, Game.js) keeps reading
// `.value`, setting `.value = ...`, toggling `.classList`, and listening
// for 'change' exactly as before - nothing about them changes. This file
// only adds a visual layer on top and keeps it in sync both ways:
//   - user clicks a custom option -> writes selectEl.value + fires a
//     real 'change' event, so existing listeners fire normally.
//   - anything else changes selectEl.value/class programmatically (e.g.
//     resetting game speed back to "1" on restart) -> the custom UI
//     re-syncs automatically (see the .value property override below -
//     a plain MutationObserver can't see property-only changes, only
//     attribute/DOM changes).
//
// The real <select> is kept functional (not display:none) so keyboard
// navigation/screen readers still work on it directly - it's just laid
// underneath the custom trigger, which sits on top and intercepts the
// mouse.

function enhanceSelect(selectEl) {
    if (!selectEl || selectEl.dataset.customSelectEnhanced) return;
    selectEl.dataset.customSelectEnhanced = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    // Lets CSS target this one select's wrapper specifically (e.g. a
    // background-color override) without needing its own full class,
    // since the trigger/list only ever clone the real select's classes.
    if (selectEl.id) wrapper.dataset.for = selectEl.id;
    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);
    selectEl.classList.add('custom-select-native');

    // Trigger reuses the real select's own classes, so it inherits its
    // exact look (.styled-select / .gameSpeedSelect - mapSelect and
    // backgroundSelect both use .styled-select now, so they match) without
    // duplicating any CSS - minus 'custom-select-native', which is
    // only meant to hide the real select itself, not the visible trigger.
    function triggerClassName() {
        const extra = Array.from(selectEl.classList).filter((c) => c !== 'custom-select-native');
        return ['custom-select-trigger', ...extra].join(' ');
    }

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = triggerClassName();
    wrapper.appendChild(trigger);

    const list = document.createElement('ul');
    list.className = 'custom-select-list';
    wrapper.appendChild(list);

    let activeIndex = -1; // keyboard-highlighted option while the list is open

    // Applies an option to the real select WITHOUT touching open/close
    // state - used while browsing with the list still open (see the
    // keydown handler), so switching options previews live like a native
    // open <select> does, instead of closing after every arrow press.
    function applyOption(opt) {
        if (selectEl.value !== opt.value) {
            selectEl.value = opt.value; // triggers syncUI via the property override below
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    function commitOption(opt) {
        applyOption(opt);
        closeList();
        // Stays focused after picking one (mousedown on the <li> - which
        // isn't itself focusable - shouldn't steal focus away, but this
        // makes sure) so Up/Down keeps working right away without having
        // to click the trigger again first.
        trigger.focus();
    }

    // Moves the real selection by +1/-1 immediately, without opening the
    // list - mirrors how a native, closed <select> reacts to arrow keys
    // while focused. Clamped (not wrapped) at the ends, same as native.
    function stepSelection(delta) {
        const options = Array.from(selectEl.options);
        if (!options.length) return;
        const currentIndex = Math.max(0, options.findIndex((o) => o.value === selectEl.value));
        const nextIndex = Math.min(options.length - 1, Math.max(0, currentIndex + delta));
        if (nextIndex !== currentIndex) commitOption(options[nextIndex]);
    }

    function buildOptions() {
        list.innerHTML = '';
        Array.from(selectEl.options).forEach((opt) => {
            const li = document.createElement('li');
            li.className = 'custom-select-option';
            li.textContent = opt.textContent;
            li.dataset.value = opt.value;
            li.addEventListener('click', () => commitOption(opt));
            list.appendChild(li);
        });
        syncSelected();
    }

    function syncSelected() {
        list.querySelectorAll('.custom-select-option').forEach((li) => {
            li.classList.toggle('is-selected', li.dataset.value === selectEl.value);
        });
    }

    function setActiveIndex(index) {
        const items = list.querySelectorAll('.custom-select-option');
        if (!items.length) return;
        activeIndex = (index + items.length) % items.length;
        items.forEach((li, i) => li.classList.toggle('is-active', i === activeIndex));
        items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function syncUI() {
        const selected = selectEl.options[selectEl.selectedIndex];
        trigger.textContent = selected ? selected.textContent : '';
        // Mirror any extra state class (e.g. gameSpeedSelect's "is-boosted"
        // pulse animation) from the real select onto the visible trigger.
        const wasOpen = trigger.classList.contains('is-open');
        trigger.className = triggerClassName();
        trigger.classList.toggle('is-open', wasOpen);
        syncSelected();
    }

    function openList() {
        buildOptions();
        list.classList.add('is-open');
        trigger.classList.add('is-open');
        const currentIndex = Array.from(selectEl.options).findIndex((o) => o.value === selectEl.value);
        setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    }
    function closeList() {
        list.classList.remove('is-open');
        trigger.classList.remove('is-open');
        activeIndex = -1;
    }
    function isOpen() {
        return list.classList.contains('is-open');
    }

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isOpen()) closeList();
        else openList();
    });
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) closeList();
    });
    // While closed but focused, Up/Down immediately switches to the
    // next/previous option and applies it - same as a native, closed
    // <select>. The trigger stays focused after a pick (see commitOption),
    // so this keeps working for as many presses in a row as you like,
    // until you click something else. Enter/Space instead opens the full
    // list to browse; once open, Up/Down moves the highlight AND applies
    // that option live (same as a native OPEN <select> previewing each
    // option as you arrow through it), without closing the list - Enter/
    // Space/click just confirms and closes, Escape closes without
    // reverting (matches stepSelection/commitOption already having
    // applied the value live as you moved through it).
    trigger.addEventListener('keydown', (e) => {
        if (!isOpen()) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                stepSelection(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                stepSelection(-1);
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openList();
            }
            return;
        }
        const options = Array.from(selectEl.options);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(activeIndex + 1);
            if (options[activeIndex]) applyOption(options[activeIndex]);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(activeIndex - 1);
            if (options[activeIndex]) applyOption(options[activeIndex]);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (options[activeIndex]) commitOption(options[activeIndex]);
            else closeList();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeList();
        }
    });

    // Catches the real select changing for ANY reason - user interacting
    // with the real (hidden-under-the-trigger) select directly via
    // keyboard, or a 'change' event we ourselves dispatched above.
    selectEl.addEventListener('change', syncUI);

    // classList.add/remove/toggle DOES update the "class" attribute, so a
    // MutationObserver catches things like gameSpeedSelect's is-boosted
    // toggle in main.js/Game.js without those files needing to change.
    new MutationObserver(syncUI).observe(selectEl, { attributes: true, attributeFilter: ['class'] });

    // Options being replaced/rebuilt at runtime (not currently done for
    // any of these selects, but cheap safety net if that ever changes).
    new MutationObserver(() => { buildOptions(); syncUI(); }).observe(selectEl, { childList: true });

    // `selectEl.value = x` (used throughout main.js/UI.js/Game.js to reset
    // selections programmatically) does NOT fire a native 'change' event,
    // so it would otherwise leave the custom trigger showing stale text.
    // Overriding the property on this one instance to also re-sync fixes
    // that without touching any of those call sites.
    const nativeValueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(selectEl, 'value', {
        configurable: true,
        get() { return nativeValueDescriptor.get.call(selectEl); },
        set(v) {
            nativeValueDescriptor.set.call(selectEl, v);
            syncUI();
        }
    });

    buildOptions();
    syncUI();
}

document.addEventListener('DOMContentLoaded', () => {
    ['mapSelect', 'backgroundSelect', 'gameSpeedSelect'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) enhanceSelect(el);
    });
});
