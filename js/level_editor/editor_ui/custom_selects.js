/* every <select> in the editor (incl. the ones the wave editor renders later) gets the
   Settings "Background" look. Same idea as js/CustomSelect.js - the real <select> stays the source
   of truth (value, 'change' events, inline onchange) - but with ONE set of document listeners
   instead of one per select, because the wave editor re-renders hundreds of selects. */
(() => {
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    let openWrap = null;

    const parts = wrap => ({
        sel: wrap.querySelector(':scope > select'),
        trigger: wrap.querySelector(':scope > .dev-sel-trigger'),
        list: wrap.querySelector(':scope > .dev-sel-list')
    });

    function sync(wrap) {
        const { sel, trigger } = parts(wrap);
        const opt = sel.options[sel.selectedIndex];
        trigger.textContent = opt ? opt.textContent.trim() : '';
    }

    function enhance(sel) {
        if (sel.dataset.devSel || sel.multiple || sel.size > 1) return;
        sel.dataset.devSel = '1';
        const wrap = document.createElement('div');
        wrap.className = 'dev-sel';
        if (sel.id) wrap.dataset.for = sel.id;
        if (sel.style.width === '100%') wrap.classList.add('is-block');
        sel.before(wrap);
        wrap.append(sel);
        sel.classList.add('dev-sel-native');
        sel.tabIndex = -1;

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'dev-sel-trigger';
        const list = document.createElement('ul');
        list.className = 'dev-sel-list';
        wrap.append(trigger, list);

        // `sel.value = x` from the editor code doesn't fire 'change' -> re-sync the trigger too
        Object.defineProperty(sel, 'value', {
            configurable: true,
            get() { return nativeValue.get.call(sel); },
            set(v) {
                // e.g. Difficulty: a loaded map may carry a value the list doesn't have - keep it selectable
                if (sel.dataset.devKeepUnknown && v !== '' && v != null && ![...sel.options].some(o => o.value === String(v))) {
                    sel.add(new Option(String(v), String(v)));
                }
                nativeValue.set.call(sel, v);
                sync(wrap);
            }
        });
        sel.addEventListener('change', () => sync(wrap));
        sync(wrap);
    }

    function close() {
        if (!openWrap) return;
        const { trigger, list } = parts(openWrap);
        list.classList.remove('is-open');
        trigger.classList.remove('is-open');
        openWrap = null;
    }

    function open(wrap) {
        close();
        const { sel, trigger, list } = parts(wrap);
        list.innerHTML = '';
        Array.from(sel.options).forEach((opt, i) => {
            if (opt.disabled || opt.hidden) return;
            const li = document.createElement('li');
            li.className = 'dev-sel-option';
            li.textContent = opt.textContent.trim();
            li.dataset.index = i;
            li.classList.toggle('is-selected', i === sel.selectedIndex);
            list.appendChild(li);
        });
        list.classList.add('is-open');
        trigger.classList.add('is-open');
        openWrap = wrap;
        setActive(wrap, sel.selectedIndex);
    }

    function setActive(wrap, index) {
        const items = [...parts(wrap).list.children];
        if (!items.length) return;
        let pos = items.findIndex(li => +li.dataset.index === index);
        if (pos < 0) pos = 0;
        items.forEach((li, i) => li.classList.toggle('is-active', i === pos));
        items[pos].scrollIntoView({ block: 'nearest' });
    }

    function commit(wrap, index) {
        const { sel } = parts(wrap);
        if (index < 0 || index >= sel.options.length || index === sel.selectedIndex) return;
        sel.selectedIndex = index;
        sync(wrap);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // next / previous enabled option, clamped at the ends like a native select
    function step(wrap, from, delta) {
        const opts = parts(wrap).sel.options;
        for (let i = from + delta; i >= 0 && i < opts.length; i += delta) {
            if (!opts[i].disabled && !opts[i].hidden) return i;
        }
        return from;
    }

    document.addEventListener('click', e => {
        const option = e.target.closest('.dev-sel-option');
        if (option) {
            // the wave editor's selects sit inside <label>s - don't let the label re-target the click
            e.preventDefault();
            const wrap = option.closest('.dev-sel');
            commit(wrap, +option.dataset.index);
            close();
            parts(wrap).trigger.focus();
            return;
        }
        const trigger = e.target.closest('.dev-sel-trigger');
        if (trigger) {
            e.preventDefault();
            const wrap = trigger.parentElement;
            if (openWrap === wrap) close(); else open(wrap);
            return;
        }
        if (openWrap && !openWrap.contains(e.target)) close();
    });

    document.addEventListener('keydown', e => {
        const trigger = e.target.closest?.('.dev-sel-trigger');
        if (!trigger) return;
        const wrap = trigger.parentElement;
        const { sel } = parts(wrap);
        const isOpen = openWrap === wrap;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            commit(wrap, step(wrap, sel.selectedIndex, e.key === 'ArrowDown' ? 1 : -1));
            if (isOpen) {
                [...parts(wrap).list.children].forEach(li => li.classList.toggle('is-selected', +li.dataset.index === sel.selectedIndex));
                setActive(wrap, sel.selectedIndex);
            }
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen) close(); else open(wrap);
        } else if (e.key === 'Escape' && isOpen) {
            e.preventDefault();
            close();
        }
    });

    // selects in the static HTML now, and any the editor renders later (waves, effects, damage...)
    const scan = root => {
        if (root.matches?.('select')) enhance(root);
        if (root.getElementsByTagName) [...root.getElementsByTagName('select')].forEach(enhance); // (enhance moves the select)
    };
    document.addEventListener('DOMContentLoaded', () => {
        scan(document.body);
        new MutationObserver(records => {
            // thousands of small nodes per re-render (stepper buttons, icons...) - only elements
            // that are a select or have children can hold one
            for (const r of records) for (const n of r.addedNodes) {
                if (n.nodeType === 1 && (n.tagName === 'SELECT' || n.firstElementChild)) scan(n);
            }
            // the open list's select was re-rendered away
            if (openWrap && !openWrap.isConnected) openWrap = null;
        }).observe(document.body, { childList: true, subtree: true });
    });
})();
