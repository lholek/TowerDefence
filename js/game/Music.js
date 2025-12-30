export class MusicManager {
    constructor() {
        // Define the prefixes for both sets of UI
        const prefixes = ['menuMusic', 'music'];

        // Helper to find elements for both sets (filters out nulls if one UI isn't loaded)
        const getEls = (suffix) => prefixes.map(p => document.getElementById(p + suffix)).filter(el => el);

        this.titleEls = getEls('Title');
        this.toggleBtns = getEls('Toggle');
        this.prevBtns = getEls('Prev');
        this.nextBtns = getEls('Next');
        this.progressBars = getEls('ProgressBar');
        this.timeEls = getEls('Time');
        this.volumeRanges = getEls('Volume');

        // Tracks
        this.tracks = [
            './assets/sounds/background/medieval_001.mp3',
            './assets/sounds/background/medieval_002.mp3',
            './assets/sounds/background/medieval_003.mp3',
            './assets/sounds/background/medieval_004.mp3',
            './assets/sounds/background/medieval_005.mp3',
            './assets/sounds/background/medieval_006.mp3',
            './assets/sounds/background/medieval_007.mp3',
            './assets/sounds/background/medieval_008.mp3',
            './assets/sounds/background/medieval_009_Medieval-Abbey.mp3',
            './assets/sounds/background/medieval_010_Medieval-Background.mp3',
            './assets/sounds/background/medieval_011_Medieval-Escape.mp3',
            './assets/sounds/background/medieval_012_The-Minstrels-Return.mp3'
        ];
        this.trackNames = [
            'medieval_001', 'medieval_002', 'medieval_003', 'medieval_004',
            'medieval_005', 'medieval_006', 'medieval_007', 'medieval_008',
            'Medieval Abbey (009)', 'Medieval Background (010)', 'Medieval Escape (011)',
            'The Minstrels Return (012)'
        ];

        // Settings
        this.currentIndex = parseInt(localStorage.getItem('musicIndex')) || 0;
        this.volume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;

        // Audio Setup
        this.audio = new Audio();
        this.audio.src = this.tracks[this.currentIndex];
        this.audio.volume = this.volume;

        // Initialize UI
        this.syncUI();
        
        // --- Event Listeners (Applied to all found buttons) ---
        this.toggleBtns.forEach(btn => btn.addEventListener('click', () => this.toggleMusic()));
        this.prevBtns.forEach(btn => btn.addEventListener('click', () => this.prevTrack()));
        this.nextBtns.forEach(btn => btn.addEventListener('click', () => this.nextTrack()));
        this.volumeRanges.forEach(range => {
            range.value = this.volume;
            range.addEventListener('input', (e) => this.changeVolume(e.target.value));
        });

        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.nextTrack());

        // Seek functionality for both progress containers
        this.progressBars.forEach(bar => {
            if (bar.parentElement) {
                bar.parentElement.addEventListener('click', (e) => this.seekMusic(e));
            }
        });
    }

    syncUI() {
        const state = this.audio.paused ? 'Paused' : 'On';
        const name = this.trackNames[this.currentIndex];
        this.toggleBtns.forEach(btn => btn.textContent = `Music: ${state}`);
        this.titleEls.forEach(el => el.textContent = name);
    }

    toggleMusic() {
        if (this.audio.paused) this.audio.play();
        else this.audio.pause();
        this.syncUI();
    }

    prevTrack() {
        this.currentIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
        this.playCurrent();
    }

    nextTrack() {
        this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
        this.playCurrent();
    }

    playCurrent() {
        this.audio.src = this.tracks[this.currentIndex];
        this.audio.currentTime = 0;
        this.audio.play();
        this.syncUI();
        localStorage.setItem('musicIndex', this.currentIndex);
    }

    changeVolume(val) {
        this.audio.volume = val;
        this.volumeRanges.forEach(range => range.value = val);
        localStorage.setItem('musicVolume', val);
    }

    updateProgress() {
        if (!this.audio.duration) return;
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBars.forEach(bar => bar.style.width = `${percent}%`);

        const formatTime = (s) => {
            const m = Math.floor(s / 60).toString().padStart(2, '0');
            const sec = Math.floor(s % 60).toString().padStart(2, '0');
            return `${m}:${sec}`;
        };
        const timeStr = `${formatTime(this.audio.currentTime)} / ${formatTime(this.audio.duration)}`;
        this.timeEls.forEach(el => el.textContent = timeStr);
    }

    seekMusic(e) {
        if (!this.audio.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.audio.currentTime = percent * this.audio.duration;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Start ONE manager to rule them all
    const musicManager = new MusicManager();

    // Elements for Menu Dropdown
    const menuMusicBtn = document.getElementById('menuMusicBtn');
    const menuMusicDropdown = document.getElementById('menuMusicDropdown');

    // Toggle logic for the Menu
    menuMusicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menuMusicDropdown.style.display === 'none' || menuMusicDropdown.style.display === '';
        menuMusicDropdown.style.display = isHidden ? 'block' : 'none';
    });

    // Close when clicking outside
    window.addEventListener('click', () => {
        menuMusicDropdown.style.display = 'none';
        // Add gameMusicDropdown here too if you have it
    });

    // Prevent closing when clicking inside the dropdown
    menuMusicDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});