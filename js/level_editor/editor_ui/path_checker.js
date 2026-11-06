/* path watcher - instead of the "Validate Map Paths" button. Checks the map and the
   waves continuously and only shows something (above the Menu) when there's an error,
   which then stays until it's fixed:
   - the map has no Start / no End, or a Start has no road to any End
   - an enemy group's path isn't S#E# (e.g. "S1E"), names a Start/End the map doesn't
   have (e.g. "S1E6" with no E6), or there's no road between the two.
   Same rules as the game (Map.js generatePaths / findPathBFS, Game.js: empty path = S1E1). */
import { currentLevelData } from '../level_data.js';
const box = document.getElementById('devPathErrors');
const WALK = /^(O|O\[SNW\]|O\[SND\])$|^[SE]\d+$/;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const reach = (layout, from) => {
    const rows = layout.length, cols = layout[0].length;
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
    const q = [from]; seen[from.r][from.c] = true;
    for (let i = 0; i < q.length; i++) {
        const { r, c } = q[i];
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen[nr][nc]) continue;
            if (!WALK.test(String(layout[nr][nc] ?? ''))) continue;
            seen[nr][nc] = true; q.push({ r: nr, c: nc });
        }
    }
    return seen;
};

const check = () => {
    const map = currentLevelData?.maps?.[0];
    const layout = map?.layout;
    if (!Array.isArray(layout) || !layout.length || !Array.isArray(layout[0]) || !layout[0].length) return [];
    const starts = {}, ends = {};
    layout.forEach((row, r) => row.forEach((t, c) => {
        const tok = String(t ?? '');
        if (/^S\d+/i.test(tok)) starts[tok] = { r, c };
        if (/^E\d+/i.test(tok)) ends[tok] = { r, c };
    }));
    const errors = [];
    const sKeys = Object.keys(starts), eKeys = Object.keys(ends);
    if (!sKeys.length) errors.push('The map has no Start (S1, S2…).');
    if (!eKeys.length) errors.push('The map has no End (E1, E2…).');

    // road from every Start to the Ends it can reach
    const reachable = {};
    sKeys.forEach(s => {
        const seen = reach(layout, starts[s]);
        reachable[s] = new Set(eKeys.filter(e => seen[ends[e].r][ends[e].c]));
        if (eKeys.length && !reachable[s].size) errors.push(`<code>${esc(s)}</code> has no road to any End.`);
    });
    if (sKeys.length) eKeys.forEach(e => {
        if (!sKeys.some(s => reachable[s].has(e))) errors.push(`No Start has a road to <code>${esc(e)}</code>.`);
    });

    // the enemy groups' paths
    (map.levels || []).forEach((lvl, wi) => (lvl?.enemies || []).forEach((en, gi) => {
        const raw = String(en?.path ?? '').trim();
        const path = raw || 'S1E1';
        const where = `Wave ${wi + 1}, group ${gi + 1}:`;
        const m = /^(S\d+)(E\d+)$/.exec(path);
        if (!m) { errors.push(`${where} path <code>${esc(path)}</code> isn't valid (use S#E#, e.g. S1E1).`); return; }
        const [, s, e] = m;
        const missing = [s in starts ? null : s, e in ends ? null : e].filter(Boolean);
        if (missing.length) {
            errors.push(`${where} path <code>${esc(path)}</code> - ${missing.map(x => `<code>${esc(x)}</code>`).join(' and ')} ${missing.length > 1 ? "aren't" : "isn't"} on the map${raw ? '' : ' (empty path = S1E1)'}.`);
        } else if (!reachable[s]?.has(e)) {
            errors.push(`${where} path <code>${esc(path)}</code> - no road from ${esc(s)} to ${esc(e)}.`);
        }
    }));
    return errors;
};

let lastSig = null, lastHtml = null;
const run = () => {
    const map = currentLevelData?.maps?.[0];
    if (!map) return;
    const sig = JSON.stringify(map.layout) + '|' + JSON.stringify((map.levels || []).map(l => (l?.enemies || []).map(e => e?.path ?? '')));
    if (sig === lastSig) return;
    lastSig = sig;
    let errors = [];
    try { errors = check(); } catch (e) { console.warn('dev path watcher:', e); }
    const html = errors.length
        ? `<strong>⚠ Path ${errors.length === 1 ? 'error' : `errors (${errors.length})`}</strong><ul>${errors.map(x => `<li>${x}</li>`).join('')}</ul>`
        : '';
    if (html === lastHtml) return;
    lastHtml = html;
    box.innerHTML = html;
    box.hidden = !errors.length;
};
setInterval(run, 400);
run();
