// Loading screen of the editor (#editorLoader in level_editor.html).
// Shown only once, while the editor starts (main.js): everything slow - including the tiles
// for every map size - is prepared behind it, so the editor never needs it again.

export function setLoaderProgress(fraction, text) {
    const fill = document.getElementById('editorLoaderFill');
    const step = document.getElementById('editorLoaderStep');
    if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
    if (step && text) step.textContent = text;
}

// Sets the progress and waits until the browser has painted it
export async function loaderStep(fraction, text) {
    setLoaderProgress(fraction, text);
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
}

export function hideEditorLoader() {
    const loader = document.getElementById('editorLoader');
    document.body.classList.remove('editor-loading');
    if (!loader) return;
    setLoaderProgress(1, 'Ready');
    loader.classList.add('is-done');
}
