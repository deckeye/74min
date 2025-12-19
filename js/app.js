
import { state, CONFIG, setConfig } from './state.js';
import { updateUI, renderTrackList, formatTime } from './ui.js';
import { CommandManager, AddTrackCommand, DeleteTrackCommand, ClearAllCommand } from './commands.js';
import { initYouTubePlayer, playTrack, stopPlayback } from './player.js';
import { searchYouTube } from './services.js';

// Global instances for inter-module accessibility or legacy bridging
window.commandManager = new CommandManager(() => {
    renderTrackList(handleDeleteTrack);
    updateUI();
});

// --- Legacy Bridging & Core Logic ---

async function init() {
    console.log('🚀 74min Initializing (Modular)...');
    try {
        // Load Config
        try {
            const configModule = await import('./config.js');
            setConfig(configModule.CONFIG);
        } catch (e) { console.warn('config.js skip'); }

        setupEventListeners();

        // Init Supabase if exists
        const isSupabaseReady = window.supabaseClient?.init();
        if (isSupabaseReady) await loadInitialData();

        // Init Player
        initYouTubePlayer(
            (e) => { if (e.data === 0) playNextTrack(); },
            () => { updateUI(); }
        );

        // Atmosphere setup
        const savedAtmo = localStorage.getItem('74min_atmo') || 'cyber';
        switchAtmosphere(savedAtmo);

        updateUI();
    } catch (err) {
        console.error('Critical Init Error:', err);
    }
}

function setupEventListeners() {
    // History
    document.getElementById('undo-btn')?.addEventListener('click', () => window.commandManager.undo());
    document.getElementById('redo-btn')?.addEventListener('click', () => window.commandManager.redo());

    // Tracks
    document.getElementById('clear-all-btn')?.addEventListener('click', handleDeleteAll);
    document.getElementById('add-track-btn')?.addEventListener('click', openSearchModal);

    // Media Control
    document.getElementById('cd-play-pause')?.addEventListener('click', togglePlay);
    document.getElementById('cd-stop')?.addEventListener('click', () => stopPlayback(updateUI));
    document.getElementById('cd-prev')?.addEventListener('click', playPrevTrack);
    document.getElementById('cd-next')?.addEventListener('click', playNextTrack);

    document.getElementById('cass-stop')?.addEventListener('click', () => stopPlayback(updateUI));
    document.getElementById('cass-rew')?.addEventListener('click', playPrevTrack);
    document.getElementById('cass-ff')?.addEventListener('click', playNextTrack);

    // Premium Radikase Mode Select
    document.getElementById('btn-mode-cd')?.addEventListener('click', () => switchMedia('cd'));
    document.getElementById('btn-mode-tape')?.addEventListener('click', () => switchMedia('cassette'));

    // Volume Knob Interaction (Visual only for now)
    const knob = document.getElementById('volume-knob');
    if (knob) {
        let rotation = 0;
        knob.addEventListener('click', () => {
            rotation = (rotation + 30) % 360;
            knob.querySelector('.knob-marker').style.transform = `translateX(-50%) rotate(${rotation}deg)`;
            knob.style.transform = `rotate(${rotation}deg)`;
        });
    }

    // Toggles
    document.getElementById('media-toggle')?.addEventListener('click', () => {
        const next = state.mediaType === 'cd' ? 'cassette' : 'cd';
        switchMedia(next);
    });

    document.getElementById('atmo-toggle')?.addEventListener('click', () => {
        const next = state.atmosphere === 'cyber' ? 'study-desk' : 'cyber';
        switchAtmosphere(next);
    });

    // Modals
    document.getElementById('close-modal')?.addEventListener('click', closeSearchModal);
    document.getElementById('about-btn')?.addEventListener('click', () => document.getElementById('about-modal')?.classList.remove('hidden'));
    document.getElementById('close-about-modal')?.addEventListener('click', () => document.getElementById('about-modal')?.classList.add('hidden'));

    // Search Input
    const searchInput = document.getElementById('search-input');
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch(e.target.value);
    });

    // Sticker Edit
    const sticker = document.getElementById('cassette-sticker');
    const stickerTag = document.getElementById('cassette-title-tag');
    const stickerInput = document.getElementById('cassette-title-input');

    sticker?.addEventListener('click', () => {
        stickerTag?.classList.add('hidden');
        stickerInput?.classList.remove('hidden');
        stickerInput.value = state.title;
        stickerInput?.focus();
    });

    stickerInput?.addEventListener('blur', () => finishStickerEdit());
    stickerInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finishStickerEdit();
        if (e.key === 'Escape') {
            stickerInput?.classList.add('hidden');
            stickerTag?.classList.remove('hidden');
        }
    });

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);
}

function finishStickerEdit() {
    const stickerTag = document.getElementById('cassette-title-tag');
    const stickerInput = document.getElementById('cassette-title-input');
    if (!stickerInput || stickerInput.classList.contains('hidden')) return;

    const newTitle = stickerInput.value.trim() || 'Untitled Mix';
    state.title = newTitle;
    localStorage.setItem('74min_title', newTitle);

    stickerInput.classList.add('hidden');
    stickerTag.classList.remove('hidden');

    import('./ui.js').then(m => {
        m.updateUI();
        m.animateLabelWriting(newTitle);
    });
}

// --- Specific Handlers ---

let progressInterval = null;

function togglePlay() {
    if (!state.isPlayerReady) return;
    if (state.isPlaying) {
        state.player.pauseVideo();
        state.isPlaying = false;
        if (progressInterval) clearInterval(progressInterval);
    } else {
        if (state.currentTrackIndex === -1 && state.tracks.length > 0) {
            playTrack(0, updateUI, updateMediaSession);
        } else {
            state.player.playVideo();
            state.isPlaying = true;
        }
        startProgressTracking();
    }
    updateUI();
}

function startProgressTracking() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (state.isPlaying && state.player && state.player.getCurrentTime) {
            // Internal totalTime is sum of previous tracks + current track time
            const previousTracksDuration = state.tracks.slice(0, state.currentTrackIndex).reduce((acc, t) => acc + t.duration, 0);
            state.totalTime = previousTracksDuration + state.player.getCurrentTime();
            updateUI();
        }
    }, 500);
}

function playNextTrack() {
    if (state.currentTrackIndex + 1 < state.tracks.length) {
        playTrack(state.currentTrackIndex + 1, updateUI, updateMediaSession);
    } else {
        stopPlayback(updateUI);
    }
}

function playPrevTrack() {
    const idx = Math.max(0, state.currentTrackIndex - 1);
    playTrack(idx, updateUI, updateMediaSession);
}

function handleDeleteTrack(track) {
    window.commandManager.execute(new DeleteTrackCommand(track, () => {
        renderTrackList(handleDeleteTrack);
        updateUI();
    }));
}

function handleDeleteAll() {
    if (state.tracks.length > 0 && confirm('Are you sure?')) {
        window.commandManager.execute(new ClearAllCommand(() => {
            renderTrackList(handleDeleteTrack);
            updateUI();
        }));
    }
}

function switchMedia(type) {
    state.mediaType = type;
    document.querySelectorAll('.media-element').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${type}-element`)?.classList.remove('hidden');

    // In Premium Radikase, the panel is shared, but we toggle active classes
    const cdBtn = document.getElementById('btn-mode-cd');
    const tapeBtn = document.getElementById('btn-mode-tape');
    if (cdBtn && tapeBtn) {
        if (type === 'cd') {
            cdBtn.classList.add('active');
            tapeBtn.classList.remove('active');
        } else {
            cdBtn.classList.remove('active');
            tapeBtn.classList.add('active');
        }
    }

    // Toggle traditional control panels if they exist (legacy support)
    document.getElementById(`${type}-controls`)?.classList.remove('hidden');

    const toggleBtn = document.getElementById('media-toggle');
    if (toggleBtn) toggleBtn.textContent = `Media: ${type.toUpperCase()}`;
    updateUI();
}

function switchAtmosphere(type) {
    state.atmosphere = type;
    document.body.dataset.atmosphere = type;
    localStorage.setItem('74min_atmo', type);
    updateUI();
}

function openSearchModal() {
    document.getElementById('search-modal')?.classList.remove('hidden');
    document.getElementById('search-input')?.focus();
}

function closeSearchModal() {
    document.getElementById('search-modal')?.classList.add('hidden');
    // Clear results
    const resultsEl = document.getElementById('search-results');
    if (resultsEl) resultsEl.innerHTML = '<div class="empty-state">Type to search...</div>';
}

async function handleSearch(query) {
    if (!query.trim()) return;
    const resultsEl = document.getElementById('search-results');
    if (resultsEl) resultsEl.innerHTML = '<div class="loading">Searching...</div>';

    const results = await searchYouTube(query, CONFIG.YOUTUBE_API_KEY);

    import('./ui.js').then(m => {
        m.renderSearchResults(results, handleSelectResult);
    });
}

function handleSelectResult(item) {
    window.commandManager.execute(new AddTrackCommand(item, () => {
        renderTrackList(handleDeleteTrack);
        updateUI();
    }));
    closeSearchModal();
}

function updateMediaSession(track) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title, artist: track.artist, album: state.title,
            artwork: [{ src: track.thumbnail || 'https://via.placeholder.com/150', sizes: '150x150', type: 'image/png' }]
        });
    }
}

async function loadInitialData() {
    // Placeholder for Supabase integration logic moved from old loadPlaylists
}

function handleKeyboard(e) {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) window.commandManager.redo();
        else window.commandManager.undo();
    }
}

init();
