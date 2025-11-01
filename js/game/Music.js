export class MusicManager {
    constructor(containerSelector) {
        // Elements
        this.titleEl = document.getElementById('musicTitle');
        this.toggleBtn = document.getElementById('musicToggle');
        this.prevBtn = document.getElementById('musicPrev');
        this.nextBtn = document.getElementById('musicNext');
        this.progressBar = document.getElementById('musicProgressBar');
        this.timeEl = document.getElementById('musicTime');
        this.volumeRange = document.getElementById('musicVolume');

        // Tracks
        this.tracks = [
            './assets/sounds/background/medival_001.mp3',
            './assets/sounds/background/medival_002.mp3',
            './assets/sounds/background/medival_003.mp3',
            './assets/sounds/background/medival_004.mp3',
            './assets/sounds/background/medival_005.mp3',
            './assets/sounds/background/medival_006.mp3',
            './assets/sounds/background/medival_007.mp3',
            './assets/sounds/background/medival_008.mp3'
        ];
        this.trackNames = [
            'medival_001', 'medival_002', 'medival_003', 'medival_004',
            'medival_005', 'medival_006', 'medival_007', 'medival_008'
        ];

        // Load settings
        this.currentIndex = parseInt(localStorage.getItem('musicIndex')) || 0;
        this.volume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;

        // Audio
        this.audio = new Audio();
        this.audio.src = this.tracks[this.currentIndex];
        this.audio.loop = true; // loop current track
        this.audio.volume = this.volume;

        this.updateTitle();
        this.updateToggleButton();

        // Event listeners
        this.toggleBtn.addEventListener('click', () => this.toggleMusic());
        this.prevBtn.addEventListener('click', () => this.prevTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        this.volumeRange.addEventListener('input', () => this.changeVolume());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());

        // ✅ NEW: allow clicking the progress bar to seek
        const progressContainer = this.progressBar.parentElement;
        progressContainer.addEventListener('click', (e) => this.seekMusic(e));
    }

    playRandomTrack() {
        this.currentIndex = Math.floor(Math.random() * this.tracks.length);
        this.audio.src = this.tracks[this.currentIndex];
        this.audio.currentTime = 0;
        this.audio.play();
        this.updateTitle();
        this.updateToggleButton();
        localStorage.setItem('musicIndex', this.currentIndex);
    }

    toggleMusic() {
        if (this.audio.paused) this.audio.play();
        else this.audio.pause();
        this.updateToggleButton();
    }

    updateToggleButton() {
        const state = this.audio.paused ? 'Paused' : 'On';
        this.toggleBtn.textContent = `Music: ${state}`;
    }

    prevTrack() {
        this.currentIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
        this.audio.src = this.tracks[this.currentIndex];
        this.audio.currentTime = 0;
        this.audio.play();
        this.updateTitle();
        this.updateToggleButton();
        localStorage.setItem('musicIndex', this.currentIndex);
    }

    nextTrack() {
        this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
        this.audio.src = this.tracks[this.currentIndex];
        this.audio.currentTime = 0;
        this.audio.play();
        this.updateTitle();
        this.updateToggleButton();
        localStorage.setItem('musicIndex', this.currentIndex);
    }

    changeVolume() {
        this.audio.volume = this.volumeRange.value;
        localStorage.setItem('musicVolume', this.audio.volume);
    }

    updateTitle() {
        this.titleEl.textContent = this.trackNames[this.currentIndex];
    }

    updateProgress() {
        if (!this.audio.duration) return;
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.style.width = `${percent}%`;

        const formatTime = (s) => {
            const m = Math.floor(s / 60).toString().padStart(2, '0');
            const sec = Math.floor(s % 60).toString().padStart(2, '0');
            return `${m}:${sec}`;
        };
        this.timeEl.textContent = `${formatTime(this.audio.currentTime)} / ${formatTime(this.audio.duration)}`;
    }

    // ✅ NEW: Seek function
    seekMusic(e) {
        if (!this.audio.duration) return;

        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;

        const percent = clickX / width;
        this.audio.currentTime = percent * this.audio.duration;
        this.updateProgress();
    }
}
