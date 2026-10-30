// Music Player (Beta 1.1) - ONE audio element drives both players: the main menu's
// (#menuMusicDropdown) and the game top bar's (#musicDropdown). Every part of a player
// is found by its data-mp="..." attribute, so both stay in sync.
const FADE_MS = 600; // fade out / in between tracks instead of a hard cut

export class MusicManager {
    constructor() {
        this.players = ['menuMusicDropdown', 'musicDropdown']
            .map(id => document.getElementById(id))
            .filter(el => el);

        // Tracks: [file, name shown in the player]
        this.tracks = [
            ['./assets/sounds/background/medieval_001.mp3', 'Medieval 001'],
            ['./assets/sounds/background/medieval_002.mp3', 'Medieval 002'],
            ['./assets/sounds/background/medieval_003.mp3', 'Medieval 003'],
            ['./assets/sounds/background/medieval_004.mp3', 'Medieval 004'],
            ['./assets/sounds/background/medieval_005.mp3', 'Medieval 005'],
            ['./assets/sounds/background/medieval_006.mp3', 'Medieval 006'],
            ['./assets/sounds/background/medieval_007.mp3', 'Medieval 007'],
            ['./assets/sounds/background/medieval_008.mp3', 'Medieval 008'],
            ['./assets/sounds/background/medieval_009_Medieval-Abbey.mp3', 'Medieval Abbey'],
            ['./assets/sounds/background/medieval_010_Medieval-Background.mp3', 'Medieval Background'],
            ['./assets/sounds/background/medieval_011_Medieval-Escape.mp3', 'Medieval Escape'],
            ['./assets/sounds/background/medieval_012_The-Minstrels-Return.mp3', "The Minstrel's Return"]
        ];

        // Settings (a saved volume of 0 stays 0 - only a missing value falls back to 0.5)
        const savedIndex = parseInt(localStorage.getItem('musicIndex'));
        const savedVolume = parseFloat(localStorage.getItem('musicVolume'));
        this.currentIndex = savedIndex >= 0 && savedIndex < this.tracks.length ? savedIndex : 0;
        this.volume = isNaN(savedVolume) ? 0.5 : savedVolume;
        this.muted = localStorage.getItem('musicMuted') === 'true';
        this.shuffle = localStorage.getItem('musicShuffle') === 'true';
        this.repeatOne = localStorage.getItem('musicRepeat') === 'true';
        this.dragging = false;
        this.fadeRaf = 0;
        this.fadingOut = false;
        this.durationsLoaded = false;

        // Audio Setup
        this.audio = new Audio();
        this.audio.loop = this.repeatOne;

        this.players.forEach(player => this.setupPlayer(player));
        // after setupPlayer - marks the current playlist row too; continues where it stopped last time
        this.loadTrack(this.currentIndex, parseFloat(localStorage.getItem('musicTime')) || 0);
        window.addEventListener('pagehide', () => this.saveTime());
        this.syncVolume();
        this.syncToggles();

        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
            // position saved every ~2 s (+ on pagehide) - not on every timeupdate
            if (Math.abs(this.audio.currentTime - this.savedTime) >= 2) this.saveTime();
        });
        this.audio.addEventListener('loadedmetadata', () => this.each('dur', el => el.textContent = this.formatTime(this.audio.duration)));
        this.audio.addEventListener('ended', () => this.goTo(this.nextIndex(), true));
        this.audio.addEventListener('play', () => this.syncPlay());
        this.audio.addEventListener('pause', () => this.syncPlay());
    }

    // Runs fn on that part (data-mp="name") of every player
    each(name, fn) {
        this.players.forEach(player => player.querySelectorAll(`[data-mp="${name}"]`).forEach(fn));
    }

    setupPlayer(player) {
        const part = name => player.querySelector(`[data-mp="${name}"]`);

        // Playlist rows
        const list = part('list');
        this.tracks.forEach(([, name], i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="mp-n">${i + 1}</span><span>${name}</span><span class="mp-d">-:--</span>`;
            li.addEventListener('click', () => this.goTo(i, true));
            list.appendChild(li);
        });
        player.querySelectorAll('[data-mp="count"]').forEach(el => el.textContent = `${this.tracks.length} tracks`);

        part('toggle').addEventListener('click', () => this.toggleMusic());
        part('prev').addEventListener('click', () => this.prevTrack());
        part('next').addEventListener('click', () => this.nextTrack());
        part('shuffle').addEventListener('click', () => {
            this.shuffle = !this.shuffle;
            localStorage.setItem('musicShuffle', this.shuffle);
            this.syncToggles();
        });
        part('repeat').addEventListener('click', () => {
            this.repeatOne = !this.repeatOne;
            this.audio.loop = this.repeatOne;
            localStorage.setItem('musicRepeat', this.repeatOne);
            this.syncToggles();
        });
        part('mute').addEventListener('click', () => {
            this.muted = !this.muted;
            if (!this.muted && this.volume === 0) this.volume = 0.5;
            this.syncVolume();
        });
        part('volume').addEventListener('input', (e) => {
            this.volume = parseFloat(e.target.value);
            this.muted = this.volume === 0;
            this.syncVolume();
        });

        // Playlist slides out on the right - or on the left when there's no room (game top bar)
        part('listToggle').addEventListener('click', () => {
            this.loadDurations();
            const opening = !player.classList.contains('is-list-open');
            if (opening) {
                const rect = player.getBoundingClientRect();
                // the playlist (250px + 6px gap) is ~0.8x the player's 324px (both scale with the player's zoom)
                player.classList.toggle('mp-side-left', rect.right + rect.width * 0.8 > window.innerWidth);
            }
            player.classList.toggle('is-list-open', opening);
        });

        // Seek: click or drag along the bar
        const bar = part('bar');
        const ratioAt = e => {
            const r = bar.getBoundingClientRect();
            return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        };
        bar.addEventListener('pointerdown', (e) => {
            if (!this.audio.duration) return;
            this.dragging = true;
            bar.classList.add('is-dragging');
            bar.setPointerCapture(e.pointerId);
            const p = ratioAt(e);
            this.setProgress(p);
            this.each('cur', el => el.textContent = this.formatTime(p * this.audio.duration));
        });
        bar.addEventListener('pointermove', (e) => {
            if (!this.dragging) return;
            const p = ratioAt(e);
            this.setProgress(p);
            this.each('cur', el => el.textContent = this.formatTime(p * this.audio.duration));
        });
        bar.addEventListener('pointerup', (e) => {
            if (!this.dragging) return;
            this.dragging = false;
            bar.classList.remove('is-dragging');
            this.audio.currentTime = ratioAt(e) * this.audio.duration;
        });
    }

    formatTime(s) {
        if (!isFinite(s)) return '0:00';
        return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    }

    // Track lengths for the playlist - only metadata, loaded the first time a playlist opens
    loadDurations() {
        if (this.durationsLoaded) return;
        this.durationsLoaded = true;
        this.tracks.forEach(([file], i) => {
            const probe = new Audio();
            probe.preload = 'metadata';
            probe.addEventListener('loadedmetadata', () => {
                const time = this.formatTime(probe.duration);
                this.each('list', list => list.children[i].querySelector('.mp-d').textContent = time);
                probe.removeAttribute('src');
            }, { once: true });
            probe.src = file;
        });
    }

    // startAt (s) - only used on page load, to continue the saved track where it stopped
    loadTrack(i, startAt = 0) {
        this.currentIndex = (i + this.tracks.length) % this.tracks.length;
        this.audio.src = this.tracks[this.currentIndex][0];
        localStorage.setItem('musicIndex', this.currentIndex);
        this.savedTime = startAt;
        localStorage.setItem('musicTime', startAt);
        if (startAt > 0) {
            this.audio.addEventListener('loadedmetadata', () => {
                // a track saved right at its end starts again from 0
                if (startAt < this.audio.duration - 1) {
                    this.audio.currentTime = startAt;
                    this.setProgress(startAt / this.audio.duration);
                    this.each('cur', el => el.textContent = this.formatTime(startAt));
                }
            }, { once: true });
        }
        this.setProgress(0);
        this.each('cur', el => el.textContent = '0:00');
        this.each('dur', el => el.textContent = '0:00');
        this.each('title', el => el.textContent = this.tracks[this.currentIndex][1]);
        this.each('sub', el => el.textContent = `Track ${this.currentIndex + 1} of ${this.tracks.length}`);
        this.each('list', list => [...list.children].forEach((li, n) => li.classList.toggle('is-current', n === this.currentIndex)));
    }

    saveTime() {
        if (this.audio.readyState < 1) return; // metadata not loaded yet - currentTime is still 0
        this.savedTime = this.audio.currentTime;
        localStorage.setItem('musicTime', this.savedTime);
    }

    outVolume() {
        return this.muted ? 0 : this.volume;
    }

    // done is only passed for a fade OUT (pause / track change) - see syncVolume
    fadeTo(target, ms, done) {
        cancelAnimationFrame(this.fadeRaf);
        this.fadingOut = !!done;
        const from = this.audio.volume;
        const t0 = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - t0) / ms);
            this.audio.volume = Math.min(1, Math.max(0, from + (target - from) * k));
            if (k < 1) {
                this.fadeRaf = requestAnimationFrame(step);
            } else {
                this.fadeRaf = 0;
                this.fadingOut = false;
                if (done) done();
            }
        };
        this.fadeRaf = requestAnimationFrame(step);
    }

    play(fadeMs) {
        this.audio.volume = 0;
        this.audio.play().then(() => this.fadeTo(this.outVolume(), fadeMs)).catch(() => {});
    }

    // Switch track - the playing one fades out first, the new one fades in
    goTo(i, play) {
        const start = () => {
            this.loadTrack(i);
            if (play) this.play(FADE_MS);
        };
        if (!this.audio.paused) this.fadeTo(0, FADE_MS, start);
        else start();
    }

    nextIndex() {
        if (!this.shuffle || this.tracks.length < 2) return this.currentIndex + 1;
        let n;
        do { n = Math.floor(Math.random() * this.tracks.length); } while (n === this.currentIndex);
        return n;
    }

    toggleMusic() {
        if (this.audio.paused) this.play(250);
        else this.fadeTo(0, 250, () => this.audio.pause());
    }

    prevTrack() {
        // Past the first 3 s "previous" restarts the track, like most players
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }
        this.goTo(this.currentIndex - 1, !this.audio.paused);
    }

    nextTrack() {
        this.goTo(this.nextIndex(), !this.audio.paused);
    }

    syncPlay() {
        this.players.forEach(player => player.classList.toggle('is-playing', !this.audio.paused));
    }

    syncToggles() {
        this.each('shuffle', btn => btn.classList.toggle('is-on', this.shuffle));
        this.each('repeat', btn => btn.classList.toggle('is-on', this.repeatOne));
    }

    syncVolume() {
        this.each('volume', range => {
            range.value = this.volume;
            range.style.setProperty('--v', `${this.volume * 100}%`);
        });
        this.each('volPct', el => el.textContent = this.muted ? 'Muted' : `${Math.round(this.volume * 100)}%`);
        this.players.forEach(player => player.classList.toggle('is-muted', this.muted));
        localStorage.setItem('musicVolume', this.volume);
        localStorage.setItem('musicMuted', this.muted);
        // a fade out (pause / track change) is left to finish - the next fade in uses the new volume
        if (this.fadingOut) return;
        cancelAnimationFrame(this.fadeRaf);
        this.fadeRaf = 0;
        this.audio.volume = this.outVolume();
    }

    setProgress(p) {
        this.each('fill', el => el.style.transform = `scaleX(${p})`);
        this.each('knob', el => el.style.transform = `translateX(${p * 100}%)`);
    }

    updateProgress() {
        if (this.dragging || !this.audio.duration) return;
        this.setProgress(this.audio.currentTime / this.audio.duration);
        const time = this.formatTime(this.audio.currentTime);
        this.each('cur', el => el.textContent = time);
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
