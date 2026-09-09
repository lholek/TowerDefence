document.addEventListener('DOMContentLoaded', () => {
    const tutorialPopup = document.getElementById('tutorialPopup');
    const openBtn = document.getElementById('openTutorialBtn');

    let currentPage = 0;
    const totalPages = 5;

    async function loadAndOpen() {
        // Only fetch if we haven't loaded it yet
        if (tutorialPopup.innerHTML === "") {
            try {
                // no-store: avoids the browser silently serving a stale
                // cached copy (e.g. from before the last edit), which is
                // what caused pages / controls to go "missing" before even
                // though the actual file on disk was fine.
                const response = await fetch('./html/tutorial.html', { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} ${response.statusText} while fetching html/tutorial.html`);
                }
                const html = await response.text();
                if (!html.includes('id="page-4"')) {
                    throw new Error('Fetched tutorial.html but it is missing expected content (stale cache?)');
                }
                tutorialPopup.innerHTML = html;
                setupControls();
            } catch (err) {
                console.error("Failed to load tutorial:", err);
                // Reset so the NEXT click retries the fetch instead of being
                // permanently stuck with an empty/broken popup forever.
                tutorialPopup.innerHTML = "";
                return;
            }
        }
        currentPage = 0;
        updateUI();
        tutorialController.open();
    }

    function goNext() {
        if (currentPage < totalPages - 1) {
            currentPage++;
            updateUI();
        }
    }

    function goPrev() {
        if (currentPage > 0) {
            currentPage--;
            updateUI();
        }
    }

    function setupControls() {
        document.getElementById('nextPage').onclick = goNext;
        document.getElementById('prevPage').onclick = goPrev;

        // PopupController wires up '.close-btn' once, at construction time -
        // but the tutorial's close button doesn't exist yet then (its HTML
        // is only injected here, later, after the fetch). So it has to be
        // wired by hand once the button actually exists.
        const closeBtn = tutorialPopup.querySelector('.close-tutorial');
        if (closeBtn) closeBtn.onclick = () => tutorialController.close();
    }

    function updateUI() {
        const nextBtn = document.getElementById('nextPage');
        const prevBtn = document.getElementById('prevPage');
        const stepNum = document.getElementById('currentStepNum');

        // Toggle Pages
        for (let i = 0; i < totalPages; i++) {
            const page = document.getElementById(`page-${i}`);
            if (page) page.classList.toggle('d-none', i !== currentPage);
        }

        // Hide the arrow that has nowhere left to go (no wrap-around).
        // Closing the tutorial itself is handled separately (X button / ESC
        // / click outside), not by the Next arrow anymore.
        if (prevBtn) prevBtn.hidden = currentPage === 0;
        if (nextBtn) nextBtn.hidden = currentPage === totalPages - 1;

        // Update Step Number
        if (stepNum) stepNum.innerText = (currentPage + 1);
    }

    // --- Keyboard navigation: ArrowLeft/ArrowRight or A/D ---
    // Only acts while the tutorial popup is actually open, so it doesn't
    // steal these keys from the game (camera/tower controls) at other times.
    document.addEventListener('keydown', (e) => {
        if (!tutorialPopup.classList.contains('is-open')) return;

        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            e.preventDefault();
            goNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            goPrev();
        }
    });

    const tutorialController = new PopupController(null, 'tutorialPopup');

    if (openBtn) {
        openBtn.addEventListener('click', loadAndOpen);
    }
});
