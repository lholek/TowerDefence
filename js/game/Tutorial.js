document.addEventListener('DOMContentLoaded', () => {
    const tutorialPopup = document.getElementById('tutorialPopup');
    const openBtn = document.getElementById('openTutorialBtn');
    
    let currentPage = 0;
    const totalPages = 5;

    async function loadAndOpen() {
        // Only fetch if we haven't loaded it yet
        if (tutorialPopup.innerHTML === "") {
            try {
                const response = await fetch('./html/tutorial.html');
                tutorialPopup.innerHTML = await response.text();
                setupControls();
            } catch (err) {
                console.error("Failed to load tutorial:", err);
                return;
            }
        }
        currentPage = 0;
        updateUI();
        tutorialPopup.style.display = 'flex';
    }

    function setupControls() {
        document.getElementById('closeTutorial').onclick = () => tutorialPopup.style.display = 'none';
        
        document.getElementById('nextPage').onclick = () => {
            if (currentPage < totalPages - 1) {
                currentPage++;
                updateUI();
            } else {
                tutorialPopup.style.display = 'none';
            }
        };

        document.getElementById('prevPage').onclick = () => {
            if (currentPage > 0) {
                currentPage--;
                updateUI();
            }
        };
    }

    function updateUI() {
        const totalPages = 5;
        const nextBtn = document.getElementById('nextPage');
        const prevBtn = document.getElementById('prevPage');
        const stepNum = document.getElementById('currentStepNum');
        
        // Toggle Pages
        for (let i = 0; i < totalPages; i++) {
            const page = document.getElementById(`page-${i}`);
            if (page) page.classList.toggle('d-none', i !== currentPage);
        }

        // 1) Handle Back Button Visibility
        if (currentPage === 0) {
            prevBtn.style.visibility = 'hidden';
        } else {
            prevBtn.style.visibility = 'visible';
        }

        // Update Step Number
        if (stepNum) stepNum.innerText = (currentPage + 1);

        // Update Next Button Text
        if (currentPage === totalPages - 1) {
            nextBtn.innerText = "Finish";
        } else {
            nextBtn.innerText = "Next";
        }
    }

    if (openBtn) openBtn.onclick = loadAndOpen;
});