// cursor.js
//
// Cross-browser fix for the custom cursor over scrollbars. CSS alone
// can't fully do this: ::-webkit-scrollbar-thumb:hover only exists in
// Chromium, only covers the thumb (not the track around it), and
// Firefox's scrollbar-width/-color styling has no per-part hover hook
// at all - see css/cursor.css for that CSS fast-path and its limits.
//
// This does its own hit-testing instead: for whatever element is under
// the pointer, work out whether it actually scrolls, and whether the
// pointer is within the native scrollbar's own on-screen strip (that
// strip isn't a DOM node, so it's not something CSS :hover can target
// directly) - a vertical strip along the right edge and/or a horizontal
// one along the bottom, each exactly as wide/tall as the gap between
// clientWidth/clientHeight (content box) and offsetWidth/offsetHeight
// (content box + scrollbar). If the pointer is in either strip, add
// .cursor-on-scrollbar to <html>, which css/cursor.css turns into the
// blazing-sword hover cursor.
//
// Also tracks an active drag: once a scrollbar drag starts (mousedown
// inside a strip), the cursor stays the hover sword for the whole drag
// even if the pointer strays outside the strip while dragging fast,
// until mouseup - matching how the browser's own scrollbar drag behaves.

(function () {
    const root = document.documentElement;
    let dragging = false;

    function scrollbarStripsAt(el, clientX, clientY) {
        const rect = el.getBoundingClientRect();
        const hasVerticalScrollbar = el.scrollHeight > el.clientHeight && el.offsetWidth > el.clientWidth;
        const hasHorizontalScrollbar = el.scrollWidth > el.clientWidth && el.offsetHeight > el.clientHeight;
        if (!hasVerticalScrollbar && !hasHorizontalScrollbar) return false;

        // offsetWidth/offsetHeight include the border, clientWidth/Height
        // don't - so "offsetWidth - clientWidth" is border-left + border-
        // right + scrollbar width combined, not the scrollbar width alone.
        // Every scrollable popup/list in this game has a visible border
        // (.custom-select-list, .log-popup-content, ...), so skipping this
        // made the detected strip drift by however wide that border is.
        const style = getComputedStyle(el);
        const borderLeft = parseFloat(style.borderLeftWidth) || 0;
        const borderRight = parseFloat(style.borderRightWidth) || 0;
        const borderTop = parseFloat(style.borderTopWidth) || 0;
        const borderBottom = parseFloat(style.borderBottomWidth) || 0;

        if (hasVerticalScrollbar) {
            const scrollbarWidth = el.offsetWidth - el.clientWidth - borderLeft - borderRight;
            // The scrollbar sits inside the border, flush against it.
            const stripRight = rect.right - borderRight;
            const stripLeft = stripRight - scrollbarWidth;
            if (clientX >= stripLeft && clientX <= stripRight && clientY >= rect.top && clientY <= rect.bottom) {
                return true;
            }
        }
        if (hasHorizontalScrollbar) {
            const scrollbarHeight = el.offsetHeight - el.clientHeight - borderTop - borderBottom;
            const stripBottom = rect.bottom - borderBottom;
            const stripTop = stripBottom - scrollbarHeight;
            if (clientY >= stripTop && clientY <= stripBottom && clientX >= rect.left && clientX <= rect.right) {
                return true;
            }
        }
        return false;
    }

    function isOverAnyScrollbar(clientX, clientY) {
        // elementFromPoint still resolves to the scrolling element itself
        // when the point is over its native scrollbar (the scrollbar is
        // part of that element's own box, not a separate hit-target), so
        // this alone is enough - no need to enumerate scrollable elements.
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) return false;
        // Walk up in case the exact hit is a child that doesn't itself
        // scroll (e.g. text inside a scrollable box, right at its edge).
        let node = el;
        while (node && node !== document.body && node !== document.documentElement) {
            if (scrollbarStripsAt(node, clientX, clientY)) return true;
            node = node.parentElement;
        }
        return false;
    }

    document.addEventListener('mousemove', (e) => {
        if (dragging) return; // stays on for the whole drag regardless of exact position
        root.classList.toggle('cursor-on-scrollbar', isOverAnyScrollbar(e.clientX, e.clientY));
    });

    document.addEventListener('mousedown', (e) => {
        if (isOverAnyScrollbar(e.clientX, e.clientY)) {
            dragging = true;
            root.classList.add('cursor-on-scrollbar');
        }
    });

    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        root.classList.remove('cursor-on-scrollbar');
    });
})();
