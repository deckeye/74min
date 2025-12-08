
// Main Application Logic
console.log('74min Initializing...');

// Simple state
const state = {
    tracks: [],
    totalTime: 0, // in seconds
    maxTime: 74 * 60, // 74 minutes in seconds
    title: "My Summer Mix",
    isPlaying: false
};

// Mock Data
const MOCK_TRACKS = [
    { title: "Midnight City", artist: "M83", duration: 243, service: "YT" },
    { title: "Get Lucky", artist: "Daft Punk", duration: 369, service: "SP" },
    { title: "Video Games", artist: "Lana Del Rey", duration: 282, service: "AM" },
    { title: "Oblivion", artist: "Grimes", duration: 251, service: "SC" },
    { title: "Archangel", artist: "Burial", duration: 230, service: "BC" },
    { title: "Instant Crush", artist: "Daft Punk", duration: 337, service: "SP" },
    { title: "Genesis", artist: "Grimes", duration: 255, service: "SC" }
];

// DOM Elements
const cdVisual = document.getElementById('cd-visual');
const cdDisc = document.querySelector('.cd-disc');
const timelineBar = document.getElementById('timeline-bar');
const currentTimeEl = document.getElementById('current-time');
const playlistTitle = document.getElementById('playlist-title');
const trackListEl = document.getElementById('track-list');
const addBtn = document.getElementById('add-track-btn');

// Initialize
function init() {
    updateUI();

    // Event Listeners
    if (addBtn) addBtn.addEventListener('click', addRandomTrack);
    document.addEventListener('mousemove', handleMouseMove);

    // Toggle play on CD click
    if (cdVisual) cdVisual.addEventListener('click', togglePlay);
}

function togglePlay() {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        cdDisc.classList.add('playing');
    } else {
        cdDisc.classList.remove('playing');
    }
}

function addRandomTrack() {
    const track = MOCK_TRACKS[Math.floor(Math.random() * MOCK_TRACKS.length)];

    if (state.totalTime + track.duration > state.maxTime) {
        // Simple alert for now - could be a nice toast later
        alert("Disc Full! 74min limit reached.");
        return;
    }

    state.tracks.push(track);
    state.totalTime += track.duration;

    renderTrack(track);
    updateUI();
    animateCDAction();

    // Auto-play on first track if not playing
    if (!state.isPlaying) togglePlay();
}

function renderTrack(track) {
    const el = document.createElement('div');
    el.className = 'track-item';
    el.innerHTML = `
        <div class="track-info">
            <span class="track-title">${track.title}</span>
            <span class="track-meta">${track.artist}</span>
        </div>
        <div class="track-right">
            <span class="service-tag" style="margin-right:8px; font-size:0.7em; opacity:0.7">${track.service}</span>
            <span class="duration">${formatTime(track.duration)}</span>
        </div>
    `;
    trackListEl.appendChild(el);
    trackListEl.scrollTop = trackListEl.scrollHeight;
}

function animateCDAction() {
    // A quick jump/scale effect when adding a track
    if (!cdVisual) return;
    cdVisual.style.transition = 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    cdVisual.style.transform = 'scale(1.05)';
    setTimeout(() => {
        cdVisual.style.transform = 'scale(1)';
        setTimeout(() => {
            // Reset to hover-ready transition
            cdVisual.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        }, 100);
    }, 150);
}

function handleMouseMove(e) {
    if (!cdVisual) return;

    // Don't tilt if we are doing a distinct animation (optimization)
    // but here we keep it simple.

    const { innerWidth, innerHeight } = window;
    const x = (e.clientX - innerWidth / 2) / 25;
    const y = (e.clientY - innerHeight / 2) / 25;

    // Apply tilt. Note: If we are 'spinning' (via class), that is on .cd-disc (child).
    // This transform is on .cd-container (parent).
    cdVisual.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

function updateUI() {
    const pct = (state.totalTime / state.maxTime) * 100;
    if (timelineBar) {
        timelineBar.style.width = `${pct}%`;
        // Gradient color shift based on fullness
        if (pct > 90) {
            timelineBar.style.boxShadow = '0 0 15px #ff0055';
        }
    }

    if (currentTimeEl) currentTimeEl.textContent = formatTime(state.totalTime);
}

init();
