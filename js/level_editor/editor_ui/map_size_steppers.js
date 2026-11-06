// Width / Height −/+ : only changes the number (min 3) like typing it - "Resize Map" still applies it
document.addEventListener('click', e => {
    const btn = e.target.closest('[data-dev-step]');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.devTarget);
    if (!input) return;
    const min = parseInt(input.min, 10) || 0;
    const current = parseInt(input.value, 10);
    input.value = Math.max(min, (isNaN(current) ? min : current) + parseInt(btn.dataset.devStep, 10));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
});
