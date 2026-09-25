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
// .cursor-on-scrollbar to both <html> and <body> (see setActive() - both
// are needed, not just one), which css/cursor.css turns into the
// blazing-sword hover cursor.
//
// Also tracks an active drag: once a scrollbar drag starts (mousedown
// inside a strip), the cursor stays the hover sword for the whole drag
// even if the pointer strays outside the strip while dragging fast,
// until mouseup - matching how the browser's own scrollbar drag behaves.

(function () {
    // Toggled on both html and body (see css/cursor.css) - body has its
    // own explicit cursor value that everything inside it actually
    // inherits from, so the class has to land there too, not just html.
    const targets = [document.documentElement, document.body];
    let dragging = false;

    function setActive(active) {
        targets.forEach((el) => el.classList.toggle('cursor-on-scrollbar', active));
    }

    // Used only when a real scrollbar can't be measured (see the overlay-
    // scrollbar fallback below) - a guessed strip width, picked to match
    // a typical scrollbar rather than anything measured on the element.
    const FALLBACK_SCROLLBAR_SIZE = 12;

    function computeScrollbarMetrics(el) {
        const style = getComputedStyle(el);
        const overflowY = style.overflowY;
        const overflowX = style.overflowX;
        const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth;

        // offsetWidth/offsetHeight include the border, clientWidth/Height
        // don't - so "offsetWidth - clientWidth" is border-left + border-
        // right + scrollbar width combined, not the scrollbar width alone.
        // Every scrollable popup/list in this game has a visible border
        // (.custom-select-list, .log-popup-content, ...), so skipping this
        // made the detected strip drift by however wide that border is.
        const borderLeft = parseFloat(style.borderLeftWidth) || 0;
        const borderRight = parseFloat(style.borderRightWidth) || 0;
        const borderTop = parseFloat(style.borderTopWidth) || 0;
        const borderBottom = parseFloat(style.borderBottomWidth) || 0;

        let verticalScrollbarWidth = canScrollY ? el.offsetWidth - el.clientWidth - borderLeft - borderRight : 0;
        let horizontalScrollbarHeight = canScrollX ? el.offsetHeight - el.clientHeight - borderTop - borderBottom : 0;

        // Overlay-style scrollbars (macOS-style "thin, no reserved space",
        // or Windows with that same OS setting turned on) don't push
        // offsetWidth/Height out at all, even though the scrollbar is
        // genuinely there on screen - offsetWidth === clientWidth in that
        // case, so the maths above yields 0 despite a real scrollbar being
        // visible. Fall back to a guessed strip near the edge instead of
        // detecting nothing, but only when we know there IS something to
        // scroll (canScrollY/X already confirmed that), so this doesn't
        // start claiming ordinary content near an edge is a scrollbar.
        const verticalIsFallback = canScrollY && verticalScrollbarWidth <= 0;
        const horizontalIsFallback = canScrollX && horizontalScrollbarHeight <= 0;
        if (verticalIsFallback) verticalScrollbarWidth = FALLBACK_SCROLLBAR_SIZE;
        if (horizontalIsFallback) horizontalScrollbarHeight = FALLBACK_SCROLLBAR_SIZE;

        return {
            canScrollY, canScrollX,
            verticalScrollbarWidth, horizontalScrollbarHeight,
            verticalIsFallback, horizontalIsFallback,
            borderLeft, borderRight, borderTop, borderBottom
        };
    }

    function scrollbarStripsAt(el, clientX, clientY) {
        const metrics = computeScrollbarMetrics(el);
        if (!metrics.canScrollY && !metrics.canScrollX) return false;

        const rect = el.getBoundingClientRect();

        if (metrics.canScrollY) {
            // The scrollbar sits inside the border, flush against it.
            const stripRight = rect.right - metrics.borderRight;
            const stripLeft = stripRight - metrics.verticalScrollbarWidth;
            if (clientX >= stripLeft && clientX <= stripRight && clientY >= rect.top && clientY <= rect.bottom) {
                return true;
            }
        }
        if (metrics.canScrollX) {
            const stripBottom = rect.bottom - metrics.borderBottom;
            const stripTop = stripBottom - metrics.horizontalScrollbarHeight;
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
        setActive(isOverAnyScrollbar(e.clientX, e.clientY));
    });

    document.addEventListener('mousedown', (e) => {
        if (isOverAnyScrollbar(e.clientX, e.clientY)) {
            dragging = true;
            setActive(true);
        }
    });

    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        setActive(false);
    });

    // Diagnostic helper - run debugScrollbarCursor('#versionList') in the
    // console to see exactly what this file sees for a given element:
    // whether it thinks it scrolls, the computed strip size (and whether
    // that came from the overlay-scrollbar fallback above), and a couple
    // of OS/browser settings that can affect scrollbar rendering (forced-
    // colors / high-contrast mode is the big one - it can make Windows
    // and the browser draw scrollbars through an entirely different,
    // theme-controlled path that ignores page CSS no matter what).
    window.debugScrollbarCursor = function (selector) {
        const el = document.querySelector(selector);
        if (!el) { console.warn('debugScrollbarCursor: no element matches', selector); return; }
        const style = getComputedStyle(el);
        const metrics = computeScrollbarMetrics(el);
        const info = {
            selector,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            offsetWidth: el.offsetWidth,
            offsetHeight: el.offsetHeight,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            canScrollY: metrics.canScrollY,
            canScrollX: metrics.canScrollX,
            calculatedVerticalScrollbarWidth: metrics.verticalScrollbarWidth,
            calculatedHorizontalScrollbarHeight: metrics.horizontalScrollbarHeight,
            usedOverlayFallbackY: metrics.verticalIsFallback,
            usedOverlayFallbackX: metrics.horizontalIsFallback,
            scrollbarColor: style.scrollbarColor,
            scrollbarWidth: style.scrollbarWidth,
            forcedColors: matchMedia('(forced-colors: active)').matches
        };
        console.log('debugScrollbarCursor:', info);
        return info;
    };
})();
