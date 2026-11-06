/* off screen = paused. The map (sky drift) and the Tower editor (the tower cards' sparks)
   get .dev-paused while they're scrolled out of view (or their panel is hidden). */
(() => {
    const io = new IntersectionObserver(entries => entries.forEach(e =>
        e.target.classList.toggle('dev-paused', !e.isIntersecting)), { rootMargin: '100px 0px' });
    ['mapCanvasContainer', 'towerEditorContent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) io.observe(el);
    });
})();
