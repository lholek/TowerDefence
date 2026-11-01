// Version history popup logic
const versionButtons = document.querySelectorAll('.versionButton');
const versionPopup = document.getElementById('versionPopup');
const versionList = document.getElementById('versionList');

function formatVersionDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr; // Return original if format is unexpected
    return `${parts[2]}. ${parts[1]}. ${parts[0]}`;
}

const plainText = html => String(html).replace(/<[^>]*>/g, '').trim();

// Category name -> icon in the index.html sprite (#vhIco*), first match wins.
const CATEGORY_ICONS = [
    [/tower/i, 'Towers'], [/abilit/i, 'Abilities'], [/editor/i, 'Editor'],
    [/music/i, 'Music'], [/map/i, 'Map'], [/lore/i, 'Scroll'],
    [/how to play|manual|tutorial/i, 'Book'], [/bug/i, 'Bug'], [/performance/i, 'Bolt'],
    [/system/i, 'Gear'], [/menu/i, 'Home'], [/log/i, 'List'],
    [/version/i, 'Clock'], [/game/i, 'Sword'], [/ui|ux|graphic/i, 'UI'],
];
function categoryIcon(category) {
    const hit = CATEGORY_ICONS.find(([re]) => re.test(plainText(category)));
    return `<svg aria-hidden="true"><use href="#vhIco${hit ? hit[1] : 'Star'}"/></svg>`;
}

// One version's "changes" -> [{ cat, items: [{ html, sub }] }] in order, straight
// from versions.json: an object like { "<b>Towers</b>": [...] } is a category,
// a plain string has none (older versions are just a list of dots).
// An object inside a category is a change with its own sub-list.
function groupChanges(changes) {
    const groups = new Map();
    const add = (cat, item) => {
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(item);
    };
    const toItem = entry => {
        if (typeof entry === 'string') return { html: entry };
        const [[key, sub]] = Object.entries(entry);
        return { html: key, sub: (Array.isArray(sub) ? sub : [sub]).map(toItem) };
    };
    changes.forEach(entry => {
        if (typeof entry === 'string') {
            add('', { html: entry });
        } else if (entry && typeof entry === 'object') {
            Object.entries(entry).forEach(([cat, items]) =>
                (Array.isArray(items) ? items : [items]).forEach(item => add(cat, toItem(item))));
        }
    });
    return [...groups].map(([cat, items]) => ({ cat, items }));
}

const itemsHtml = items => `<ul class="vh-items">${items.map(item => `
    <li class="vh-item"><span>${item.html}</span>${item.sub ? itemsHtml(item.sub) : ''}</li>`).join('')}</ul>`;

// a category = gold icon + name, then its changes (no heading for plain strings)
const groupHtml = group => `
    <div class="vh-cat">
      ${group.cat ? `<div class="vh-cat-head"><span class="vh-ico">${categoryIcon(group.cat)}</span><span class="vh-cat-name">${group.cat}</span></div>` : ''}
      ${itemsHtml(group.items)}
    </div>`;

function versionHtml(v) {
    const released = v.release && v.release !== '-';
    return `
      <div class="vh-sticky">
        <span class="vh-gem" aria-hidden="true"></span>
        <button type="button" class="vh-head" aria-expanded="false">
          <span class="vh-name">${v.version.trim()}</span>
          <span class="vh-spacer"></span>
          ${released ? `<span class="vh-date"><svg aria-hidden="true"><use href="#vhIcoCalendar"/></svg>${formatVersionDate(v.release)}</span>` : ''}
          <span class="vh-chev"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
      </div>
      <div class="vh-body"><div class="vh-body-inner"><div class="vh-groups">${groupChanges(v.changes || []).map(groupHtml).join('')}</div></div></div>`;
}

function setVersionOpen(el, open) {
    el.classList.toggle('is-open', open);
    el.querySelector('.vh-head').setAttribute('aria-expanded', open);
}

// The version whose row is pinned at the top (the top edge is inside it) gets
// .is-stuck - css/versions.css then hides its rail above the dot.
function markStuckVersion() {
    const top = versionList.scrollTop;
    versionList.querySelectorAll('.vh-version').forEach(el =>
        el.classList.toggle('is-stuck', el.offsetTop < top && el.offsetTop + el.offsetHeight > top));
}

function renderVersions(versions) {
    versionList.innerHTML = '';
    versionList.scrollTop = 0;
    versions.forEach((v, index) => {
        const el = document.createElement('div');
        el.className = 'vh-version';
        el.innerHTML = versionHtml(v);
        el.querySelector('.vh-head').addEventListener('click', () => {
            const open = !el.classList.contains('is-open');
            setVersionOpen(el, open);
            // closing a version while its row is pinned -> jump back to that row
            if (!open && el.offsetTop < versionList.scrollTop) versionList.scrollTop = el.offsetTop;
        });
        if (index === 0) setVersionOpen(el, true); // the newest one starts open
        versionList.appendChild(el);
    });
    markStuckVersion();
}

versionList.addEventListener('scroll', markStuckVersion, { passive: true });
versionList.addEventListener('transitionend', markStuckVersion); // after a version opens / closes

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Initialize our Global Controller (Pass null for button because we have multiple buttons)
    const versionController = new PopupController(null, 'versionPopup');

    // 2. Fetch current version from versions.json for the main page
    try {
        const res = await fetch('versions.json');
        const data = await res.json();
        const currentVersion = data.versions[0].version;

        // Update page title
        document.title = `The CZSrna's Tower Defence – ${currentVersion}`;

        // Update events box subtitle
        const eventsBoxSubtitle = document.querySelector('.subtitle');
        if (eventsBoxSubtitle) {
            eventsBoxSubtitle.textContent = currentVersion;
        }

        const subtitleTag = document.getElementById('subtitle-tag');
        if (subtitleTag) {
            subtitleTag.textContent = currentVersion;
        }

    } catch (err) {
        console.error('Failed to load version:', err);
    }

    // 3. Handle clicking the version buttons
    versionButtons.forEach(versionButton => {
      versionButton.addEventListener('click', async () => {
        try {
          const res = await fetch('versions.json');
          const data = await res.json();

          renderVersions(data.versions);

          // 4. Use the Controller to open the popup and handle game pausing!
          versionController.open();

        } catch (err) {
          console.error('Failed to load version history:', err);
          alert('Failed to load version history.');
        }
      });
    });
    
    // NOTE: All the close logic, ESC logic, and Unpause logic is now handled automatically by versionController!
});
