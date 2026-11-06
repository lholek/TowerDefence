/* autocomplete for .dev-combo (Difficulty). The list offers data-options; typing filters
   it (nothing matches = the list hides and the typed text is kept as a custom value). Picking an
   option writes it into the input and fires 'change', so the input's onchange saves it as before. */
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dev-combo').forEach(combo => {
        const input = combo.querySelector('.dev-combo-input');
        const list = combo.querySelector('.dev-sel-list');
        const options = combo.dataset.options.split('|');
        let active = -1;

        const shown = () => [...list.children];
        const setOpen = open => {
            combo.classList.toggle('is-open', open);
            list.classList.toggle('is-open', open);
            input.setAttribute('aria-expanded', open);
        };
        const render = filter => {
            const q = (filter || '').trim();
            // empty or exactly one of the options -> offer all of them
            const items = (!q || options.includes(q)) ? options : options.filter(o => o.includes(q));
            list.innerHTML = '';
            items.forEach(o => {
                const li = document.createElement('li');
                li.className = 'dev-combo-option';
                li.role = 'option';
                li.textContent = o;
                li.classList.toggle('is-selected', o === input.value);
                list.appendChild(li);
            });
            active = items.indexOf(input.value);
            markActive();
            setOpen(items.length > 0);
        };
        const markActive = () => shown().forEach((li, i) => li.classList.toggle('is-active', i === active));
        const pick = value => {
            setOpen(false);
            if (input.value === value) return;
            input.value = value;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        };

        input.addEventListener('focus', () => render(''));
        input.addEventListener('click', () => { if (!list.classList.contains('is-open')) render(''); });
        input.addEventListener('input', () => render(input.value));
        input.addEventListener('keydown', e => {
            const items = shown();
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!list.classList.contains('is-open')) { render(''); return; }
                active = Math.max(0, Math.min(items.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
                markActive();
                items[active]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (list.classList.contains('is-open') && items[active]) pick(items[active].textContent);
                else { setOpen(false); input.blur(); } // custom text -> blur fires the native 'change'
            } else if (e.key === 'Escape') {
                setOpen(false);
            }
        });
        // mousedown (not click) - fires before the input's blur closes the list
        list.addEventListener('mousedown', e => {
            const li = e.target.closest('.dev-combo-option');
            if (!li) return;
            e.preventDefault();
            pick(li.textContent);
        });
        input.addEventListener('blur', () => setOpen(false));
    });
});
