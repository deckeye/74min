
// Main Application Logic
console.log('74min Initializing...');

// Initialize Supabase
const isSupabaseReady = window.supabaseClient?.init();


// Configuration State (will be populated by config.js if available)
let CONFIG = {
    YOUTUBE_API_KEY: ''
};

// Simple state
const state = {
    tracks: [],
    totalTime: 0, // in seconds
    maxTime: 74 * 60, // 74 minutes in seconds
    title: "My Summer Mix",
    mediaType: 'cd', // 'cd' | 'cassette' | 'pomodoro'
    isPlaying: false,
    currentPlaylistId: null,
    currentTrackIndex: -1,
    player: null,
    isPlayerReady: false,

    // Pomodoro specific state [RE-APPLIED & EXPANDED]
    pomodoro: {
        phase: 'work', // 'work' | 'break'
        workDuration: 25 * 60,
        breakDuration: 5 * 60,
        timer: null,
        elapsedInPhase: 0,
        soundType: 'bell', // 'bell' | 'voice' | 'waves'
        isAutoNightWaves: false,
        isRadioActive: false
    },
    atmosphere: 'cyber' // 'cyber' | 'study-desk'
};

const MODES = {
    STANDARD: { label: '74min', time: 74 * 60 },
    CLASSIC: { label: '60min', time: 60 * 60 },
    FOCUS: { label: '25min', time: 25 * 60 }
};

let knobClickCount = 0;
let irukaAudio = null;

// --- Command Pattern Implementation ---
class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    async execute(command) {
        console.log('Executing command:', command.constructor.name);
        await command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
        updateUI();
    }

    async undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        console.log('Undoing command:', command.constructor.name);
        await command.undo();
        this.redoStack.push(command);
        updateUI();
    }

    async redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        console.log('Redoing command:', command.constructor.name);
        await command.execute();
        this.undoStack.push(command);
        updateUI();
    }
}

const commandManager = new CommandManager();

class AddTrackCommand {
    constructor(track) {
        this.track = { ...track };
    }
    async execute() {
        if (isSupabaseReady) {
            if (this.track.id) {
                // If already has ID (e.g. from Redo), just restore it
                await updateTrackSoftDelete(this.track.id, false);
            } else {
                // New track
                await saveTrackToSupabase(this.track);
            }
        }
        state.tracks.push(this.track);
        state.totalTime += this.track.duration;
        renderTrackList();
    }
    async undo() {
        const index = state.tracks.indexOf(this.track);
        if (index > -1) {
            state.tracks.splice(index, 1);
            state.totalTime -= this.track.duration;
        }
        if (isSupabaseReady && this.track.id) {
            await updateTrackSoftDelete(this.track.id, true);
        }
        renderTrackList();
    }
}

class DeleteTrackCommand {
    constructor(track) {
        this.track = track;
        this.index = state.tracks.indexOf(track);
    }
    async execute() {
        if (this.index > -1) {
            state.tracks.splice(this.index, 1);
            state.totalTime -= this.track.duration;
        }
        if (isSupabaseReady && this.track.id) {
            await updateTrackSoftDelete(this.track.id, true);
        }
        renderTrackList();
    }
    async undo() {
        state.tracks.splice(this.index, 0, this.track);
        state.totalTime += this.track.duration;
        if (isSupabaseReady && this.track.id) {
            await updateTrackSoftDelete(this.track.id, false);
        }
        renderTrackList();
    }
}

class ClearAllCommand {
    constructor() {
        this.previousTracks = [...state.tracks];
        this.previousTotalTime = state.totalTime;
    }
    async execute() {
        state.tracks = [];
        state.totalTime = 0;
        if (isSupabaseReady && state.currentPlaylistId) {
            await softDeleteAllTracks(state.currentPlaylistId);
        }
        renderTrackList();
    }
    async undo() {
        state.tracks = [...this.previousTracks];
        state.totalTime = this.previousTotalTime;
        if (isSupabaseReady && state.currentPlaylistId) {
            await restoreAllTracks(state.currentPlaylistId);
        }
        renderTrackList();
    }
}
// --------------------------------------

// Mock Data (fallback if Supabase not configured)
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
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const mediaToggleBtn = document.getElementById('media-toggle');
const logoEl = document.getElementById('main-logo');
const pomoKnob = document.getElementById('pomo-knob');
const pomoSoundSelect = document.getElementById('pomo-sound-select');
const pomoNightWavesCheck = document.getElementById('pomo-night-waves');
const irukaStream = document.getElementById('iruka-stream');

const modalOverlay = document.getElementById('search-modal');
const closeModalBtn = document.getElementById('close-modal');
const searchInput = document.getElementById('search-input');
const searchResultsEl = document.getElementById('search-results');

const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutModalBtn = document.getElementById('close-about-modal');

// Expanded Mock Database
const DATABASE_TRACKS = [
    ...MOCK_TRACKS,
    { title: "Harder, Better, Faster, Stronger", artist: "Daft Punk", duration: 224, service: "SP" },
    { title: "Something About Us", artist: "Daft Punk", duration: 231, service: "SP" },
    { title: "Genesis", artist: "Justice", duration: 233, service: "YT" },
    { title: "D.A.N.C.E.", artist: "Justice", duration: 242, service: "YT" },
    { title: "Safe and Sound", artist: "Justice", duration: 346, service: "YT" },
    { title: "Teardrop", artist: "Massive Attack", duration: 331, service: "AM" },
    { title: "Unfinished Sympathy", artist: "Massive Attack", duration: 315, service: "AM" },
    { title: "Royals", artist: "Lorde", duration: 190, service: "SP" },
    { title: "Team", artist: "Lorde", duration: 193, service: "SP" }
];

// Initialize
async function init() {
    console.log('🚀 init() started');
    try {
        // Attempt to load config dynamically to prevent crash if missing
        try {
            console.log('📂 Attempting to load config.js...');
            const configModule = await import('./config.js');
            CONFIG = configModule.CONFIG;
            console.log('✅ config.js loaded successfully');
        } catch (configError) {
            console.warn('⚠️ config.js not found or failed to load. Using fallback/mock mode.', configError);
        }

        updateUI();
        console.log('📊 UI Updated');

        // Event Listeners
        if (undoBtn) undoBtn.addEventListener('click', () => commandManager.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => commandManager.redo());

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', deleteAllTracks);
            console.log('🔗 Clear All button linked');
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                console.log('➕ Add button clicked');
                openModal();
            });
            console.log('🔗 Add Track button linked');
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeModal();
            });
        }
        if (searchInput) searchInput.addEventListener('input', handleSearch);
        document.addEventListener('mousemove', handleMouseMove);

        // About Modal Events
        if (aboutBtn) aboutBtn.addEventListener('click', openAboutModal);
        if (closeAboutModalBtn) closeAboutModalBtn.addEventListener('click', closeAboutModal);
        if (aboutModal) {
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) closeAboutModal();
            });
        }

        // Light Mode Toggle
        const toggleLightBtn = document.getElementById('toggle-light-btn');
        if (toggleLightBtn) {
            toggleLightBtn.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                toggleLightBtn.textContent = document.body.classList.contains('light-mode') ? 'Modern Mode' : 'Light Mode';
            });
        }

        // Keyboard Shortcuts for Undo/Redo
        document.addEventListener('keydown', (e) => {
            const isCmdOrCtrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            // Undo: Ctrl+Z
            if (isCmdOrCtrl && key === 'z' && !e.shiftKey) {
                e.preventDefault();
                commandManager.undo();
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if (isCmdOrCtrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
                e.preventDefault();
                commandManager.redo();
            }
        });

        if (mediaToggleBtn) {
            mediaToggleBtn.addEventListener('click', () => {
                const types = ['cd', 'cassette'];
                let nextIndex = (types.indexOf(state.mediaType) + 1) % types.length;
                switchMedia(types[nextIndex]);
            });
        }

        // Secret Trigger: Logo Click for Pomodoro Timer Mode
        let logoClickSessions = 0;
        if (logoEl) {
            logoEl.addEventListener('click', () => {
                logoClickSessions++;
                if (logoClickSessions >= 5) {
                    alert('SECRET MODE UNLOCKED: Pomodoro Timer Mode');
                    switchMedia('pomodoro');
                    logoClickSessions = 0;
                }
            });
        }

        // Pomodoro Specific Events
        if (pomoKnob) {
            pomoKnob.addEventListener('click', handleKnobClick);
        }

        if (pomoSoundSelect) {
            pomoSoundSelect.addEventListener('change', (e) => {
                state.pomodoro.soundType = e.target.value;
            });
        }

        if (pomoNightWavesCheck) {
            pomoNightWavesCheck.addEventListener('change', (e) => {
                state.pomodoro.isAutoNightWaves = e.target.checked;
            });
        }

        // CD Controls Logic
        const cdPlayPause = document.getElementById('cd-play-pause');
        const cdStop = document.getElementById('cd-stop');
        const cdPrev = document.getElementById('cd-prev');
        const cdNext = document.getElementById('cd-next');

        if (cdPlayPause) cdPlayPause.addEventListener('click', togglePlay);
        if (cdStop) cdStop.addEventListener('click', stopPlayback);
        if (cdPrev) cdPrev.addEventListener('click', playPrevTrack);
        if (cdNext) cdNext.addEventListener('click', playNextTrack);

        // Cassette Controls Logic
        const cassPlay = document.getElementById('cass-play');
        const cassStop = document.getElementById('cass-stop');
        const cassRew = document.getElementById('cass-rew');
        const cassFF = document.getElementById('cass-ff');

        if (cassPlay) cassPlay.addEventListener('click', () => { if (!state.isPlaying) togglePlay(); });
        if (cassStop) cassStop.addEventListener('click', stopPlayback);
        if (cassRew) cassRew.addEventListener('click', playPrevTrack);
        if (cassFF) cassFF.addEventListener('click', playNextTrack);

        // Check Supabase connection
        if (isSupabaseReady) {
            console.log('✅ Using Supabase backend');
            await loadPlaylists();
        } else {
            console.log('⚠️ Using mock data (Supabase not configured)');
        }

        // Initialize YouTube Player
        initYouTubePlayer();

        // Atmosphere Setup
        const atmoToggleBtn = document.getElementById('atmo-toggle');
        if (atmoToggleBtn) {
            atmoToggleBtn.addEventListener('click', () => {
                const nextAtmo = state.atmosphere === 'cyber' ? 'study-desk' : 'cyber';
                switchAtmosphere(nextAtmo);
            });
        }
        const savedAtmo = localStorage.getItem('74min_atmo') || 'cyber';
        switchAtmosphere(savedAtmo);

        console.log('✨ Initialization complete');
    } catch (err) {
        console.error('❌ Critical Initialization Error:', err);
        alert('Application failed to start. Check console for details.');
    }
}

async function loadPlaylists() {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error loading playlists:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Found existing playlist:', data[0]);
            // Load this playlist's tracks
            await loadPlaylistTracks(data[0].id);
        }
    } catch (err) {
        console.error('Supabase error:', err);
    }
}

async function loadPlaylistTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('tracks')
            .select('*')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: true });

        if (error) {
            console.error('Error loading tracks:', error);
            return;
        }

        // Populate state with loaded tracks
        state.tracks = data.filter(t => !t.is_deleted);
        state.totalTime = state.tracks.reduce((sum, track) => sum + track.duration, 0);
        state.currentPlaylistId = playlistId;

        renderTrackList();
        updateUI();
    } catch (err) {
        console.error('Error loading tracks:', err);
    }
}

// Helper to re-render the entire list
function renderTrackList() {
    trackListEl.innerHTML = '';
    state.tracks.forEach(track => renderTrack(track));
}

function togglePlay() {
    if (!state.isPlayerReady) {
        console.log('Player not ready yet');
        return;
    }

    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        cdDisc.classList.add('playing');
        // If nothing is playing, start from the first track
        if (state.currentTrackIndex === -1 && state.tracks.length > 0) {
            playTrack(0);
        } else {
            state.player.playVideo();
        }
    } else {
        cdDisc.classList.remove('playing');
        state.player.pauseVideo();
    }
}

function initYouTubePlayer() {
    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Global callback for YT API
    window.onYouTubeIframeAPIReady = () => {
        console.log('📺 YouTube API Ready');
        state.player = new YT.Player('player', {
            height: '0',
            width: '0',
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'disablekb': 1,
                'fs': 0,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': (e) => console.error('YT Player Error:', e)
            }
        });
    };
}

function onPlayerReady(event) {
    console.log('📺 YouTube Player Instance Ready');
    state.isPlayerReady = true;
}

function onPlayerStateChange(event) {
    // YT.PlayerState.ENDED = 0
    if (event.data === 0) {
        console.log('🎵 Track ended, moving to next');
        playNextTrack();
    }
}

function playTrack(index) {
    if (!state.isPlayerReady || index < 0 || index >= state.tracks.length) return;

    const track = state.tracks[index];
    state.currentTrackIndex = index;

    console.log(`🎵 Playing: ${track.title} (${track.service})`);

    // YouTube specific play
    if (track.service === 'YT' && track.id) {
        state.player.loadVideoById(track.id);
        state.isPlaying = true;
        cdDisc.classList.add('playing');
        updateMediaSession(track);
    } else {
        console.warn('Track service not supported for playback yet:', track.service);
        // Skip to next if not playable
        playNextTrack();
    }

    // Highlight current track in UI (future enhancement)
    updateUI();
}

function playNextTrack() {
    if (state.currentTrackIndex + 1 < state.tracks.length) {
        playTrack(state.currentTrackIndex + 1);
    } else {
        console.log('🏁 End of playlist');
        state.isPlaying = false;
        state.currentTrackIndex = -1;
        cdDisc.classList.remove('playing');
        state.player.stopVideo();
    }
}

function updateMediaSession(track) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: state.title,
            artwork: [
                { src: track.thumbnail || 'https://via.placeholder.com/150', sizes: '150x150', type: 'image/png' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            state.player.playVideo();
            state.isPlaying = true;
            cdDisc.classList.add('playing');
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            state.player.pauseVideo();
            state.isPlaying = false;
            cdDisc.classList.remove('playing');
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (state.currentTrackIndex > 0) playTrack(state.currentTrackIndex - 1);
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            playNextTrack();
        });
    }
}

async function addRandomTrack() {
    // Clone the object to ensure unique references
    const track = { ...MOCK_TRACKS[Math.floor(Math.random() * MOCK_TRACKS.length)] };

    if (state.totalTime + track.duration > state.maxTime) {
        alert("Disc Full! 74min limit reached.");
        return;
    }

    await commandManager.execute(new AddTrackCommand(track));
    animateCDAction();

    // Auto-play on first track if not playing
    if (!state.isPlaying) togglePlay();
}

function stopPlayback() {
    state.isPlaying = false;
    state.currentTrackIndex = -1;
    cdDisc.classList.remove('playing');
    if (state.player && state.player.stopVideo) {
        state.player.stopVideo();
    }
    updateUI();
}

function playPrevTrack() {
    if (state.currentTrackIndex > 0) {
        playTrack(state.currentTrackIndex - 1);
    } else if (state.tracks.length > 0) {
        playTrack(0);
    }
}

async function saveTrackToSupabase(track) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;

    try {
        // Create playlist if it doesn't exist
        if (!state.currentPlaylistId) {
            const { data: playlist, error: playlistError } = await supabase
                .from('playlists')
                .insert({
                    title: state.title,
                    total_duration: track.duration,
                    is_public: true
                })
                .select()
                .single();

            if (playlistError) {
                console.error('Error creating playlist:', playlistError);
                return;
            }

            state.currentPlaylistId = playlist.id;
            console.log('✅ Created playlist:', playlist.id);
        }

        // Add track to playlist
        const { data, error } = await supabase
            .from('tracks')
            .insert({
                playlist_id: state.currentPlaylistId,
                title: track.title,
                artist: track.artist,
                duration: track.duration,
                service: track.service,
                position: state.tracks.length
            })
            .select() // Select the inserted row to get ID
            .single();

        if (error) {
            console.error('Error saving track:', error);
        } else if (data) {
            track.id = data.id; // Save ID for deletion
            console.log('✅ Saved track to Supabase, ID:', track.id);
        }

        // Update playlist total duration
        await supabase
            .from('playlists')
            .update({ total_duration: state.totalTime + track.duration })
            .eq('id', state.currentPlaylistId);

    } catch (err) {
        console.error('Supabase error:', err);
    }
}



async function deleteAllTracks() {
    if (state.tracks.length === 0) return;
    if (!confirm('Are you sure you want to empty the disc? This will delete all tracks.')) return;

    await commandManager.execute(new ClearAllCommand());
}

async function updateTrackSoftDelete(trackId, isDeleted) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    const { error } = await supabase
        .from('tracks')
        .update({ is_deleted: isDeleted })
        .eq('id', trackId);
    if (error) console.error('Soft delete error:', error);
}

async function softDeleteAllTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    const { error } = await supabase
        .from('tracks')
        .update({ is_deleted: true })
        .eq('playlist_id', playlistId);
    if (error) console.error('Bulk soft delete error:', error);
}

async function restoreAllTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    const { error } = await supabase
        .from('tracks')
        .update({ is_deleted: false })
        .eq('playlist_id', playlistId);
    if (error) console.error('Bulk restore error:', error);
}

async function deleteTrack(track) {
    await commandManager.execute(new DeleteTrackCommand(track));
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
            <button class="btn-delete" aria-label="Delete">×</button>
        </div>
    `;

    // Attach delete event
    const deleteBtn = el.querySelector('.btn-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTrack(track);
        });
    }
    trackListEl.appendChild(el);
    trackListEl.scrollTop = trackListEl.scrollHeight;
}

function animateCDAction() {
    if (!cdVisual) return;
    cdVisual.style.transition = 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    cdVisual.style.transform = 'scale(1.05)';
    setTimeout(() => {
        cdVisual.style.transform = 'scale(1)';
        setTimeout(() => {
            cdVisual.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
        }, 100);
    }, 150);
}

function handleMouseMove(e) {
    if (!cdVisual) return;

    const { innerWidth, innerHeight } = window;
    const x = (e.clientX - innerWidth / 2) / 25;
    const y = (e.clientY - innerHeight / 2) / 25;

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
        if (pct > 90) {
            timelineBar.style.boxShadow = '0 0 15px #ff0055';
        }
    }

    if (currentTimeEl) currentTimeEl.textContent = formatTime(state.totalTime);

    // Update track list activity state
    const trackItems = trackListEl.querySelectorAll('.track-item');
    trackItems.forEach((el, idx) => {
        if (idx === state.currentTrackIndex) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Update Undo/Redo button states
    if (undoBtn) undoBtn.disabled = commandManager.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = commandManager.redoStack.length === 0;

    // Update Media Labels
    updateMediaDisplays();

    // Update Atmosphere Button
    const atmoToggleBtn = document.getElementById('atmo-toggle');
    if (atmoToggleBtn) {
        atmoToggleBtn.textContent = `Atmo: ${state.atmosphere === 'cyber' ? 'Cyber' : 'Study Desk'}`;
    }
}

function updateMediaDisplays() {
    const minLabel = `${Math.floor(state.maxTime / 60)}min`;
    const cLabel = `C-${Math.floor(state.maxTime / 60)}`;

    const cdTimeTag = document.getElementById('cd-time-tag');
    const cassetteTimeTag = document.getElementById('cassette-time-tag');
    const cdTitle = document.getElementById('playlist-title');
    const cassetteTitle = document.getElementById('cassette-title-tag');

    if (cdTimeTag) cdTimeTag.textContent = minLabel;
    if (cassetteTimeTag) cassetteTimeTag.textContent = cLabel;
    if (cdTitle) cdTitle.textContent = state.title;
    if (cassetteTitle) cassetteTitle.textContent = state.title;

    // CD Control Display
    const cdTrackNumEl = document.getElementById('cd-track-num');
    const cdTrackTimeEl = document.getElementById('cd-track-time');
    if (cdTrackNumEl) {
        cdTrackNumEl.textContent = state.currentTrackIndex >= 0
            ? String(state.currentTrackIndex + 1).padStart(2, '0')
            : '00';
    }
    if (cdTrackTimeEl) {
        // Here we could show track time, but for now let's show total or current track duration
        if (state.currentTrackIndex >= 0) {
            cdTrackTimeEl.textContent = formatTime(state.tracks[state.currentTrackIndex].duration);
        } else {
            cdTrackTimeEl.textContent = '00:00';
        }
    }

    // Update Play/Pause button icons
    const cdPlayPauseBtn = document.getElementById('cd-play-pause');
    if (cdPlayPauseBtn) {
        cdPlayPauseBtn.textContent = state.isPlaying ? 'Ⅱ' : '▶';
    }

    // Pomodoro Display
    if (state.mediaType === 'pomodoro') {
        const pomoTimeEl = document.getElementById('pomo-time');
        const pomoStatusEl = document.getElementById('pomo-status');
        const remaining = (state.pomodoro.phase === 'work' ? state.pomodoro.workDuration : state.pomodoro.breakDuration) - state.pomodoro.elapsedInPhase;

        if (pomoTimeEl) {
            if (state.pomodoro.isRadioActive) {
                pomoTimeEl.textContent = 'LIVE';
                pomoTimeEl.style.fontSize = '3rem';
            } else {
                pomoTimeEl.textContent = formatTime(Math.max(0, remaining));
                pomoTimeEl.style.fontSize = '4rem';
            }
        }
        if (pomoStatusEl) {
            pomoStatusEl.textContent = state.pomodoro.isRadioActive ? 'FM IRUKA' : state.pomodoro.phase.toUpperCase();
        }
    }
}

function switchMedia(type) {
    console.log(`🎬 Switching media to: ${type}`);
    state.mediaType = type;

    // Hide all
    document.querySelectorAll('.media-element').forEach(el => el.classList.add('hidden'));

    // Show selected
    const elId = `${type}-element`;
    const targetEl = document.getElementById(elId);
    if (targetEl) targetEl.classList.remove('hidden');

    // Show control panel if it exists
    const controlsId = `${type}-controls`;
    const targetControls = document.getElementById(controlsId);
    if (targetControls) targetControls.classList.remove('hidden');

    // Update button text
    if (mediaToggleBtn) {
        const label = type === 'pomodoro' ? 'Pomodoro Timer' : type.toUpperCase();
        mediaToggleBtn.textContent = `Media: ${label}`;
    }

    if (type === 'pomodoro') {
        startPomodoro();
    } else {
        stopPomodoro();
        stopRadio();
    }

    updateUI();
}

function switchAtmosphere(type) {
    console.log(`🌍 Switching atmosphere to: ${type}`);
    state.atmosphere = type;
    document.body.dataset.atmosphere = type;
    localStorage.setItem('74min_atmo', type);
    updateUI();
}

function startPomodoro() {
    if (state.pomodoro.timer) clearInterval(state.pomodoro.timer);
    state.pomodoro.elapsedInPhase = 0;
    state.pomodoro.timer = setInterval(() => {
        state.pomodoro.elapsedInPhase++;
        const limit = state.pomodoro.phase === 'work' ? state.pomodoro.workDuration : state.pomodoro.breakDuration;
        if (state.pomodoro.elapsedInPhase >= limit) {
            handlePhaseSwitch();
        }
        updateUI();
    }, 1000);
}

function stopPomodoro() {
    if (state.pomodoro.timer) {
        clearInterval(state.pomodoro.timer);
        state.pomodoro.timer = null;
    }
}

async function handlePhaseSwitch() {
    console.log('⏳ Transitioning phase...');

    // Fade out
    await fadeOutAudio();

    state.pomodoro.phase = state.pomodoro.phase === 'work' ? 'break' : 'work';
    state.pomodoro.elapsedInPhase = 0;

    // Play SE / Announcement
    playPomodoroSE();

    updateUI();
}

function playPomodoroSE() {
    const hours = new Date().getHours();
    const isNightTime = hours >= 22 || hours < 5;
    const useWaves = state.pomodoro.soundType === 'waves' || (state.pomodoro.isAutoNightWaves && isNightTime);

    if (useWaves) {
        console.log('🌊 Playing Beach Waves...');
        // In reality: new Audio('assets/waves.mp3').play();
    } else {
        console.log('🔔 Ringing Bell...');
        // In reality: new Audio('assets/bell.mp3').play();
    }

    if (state.pomodoro.soundType === 'voice') {
        // Wait a small bit after the bell/waves to start voice for natural feel
        setTimeout(() => {
            playVoiceAnnouncement();
        }, 1000);
    }
}

function playVoiceAnnouncement() {
    const isBreak = state.pomodoro.phase === 'break';
    const textJp = isBreak ? "休憩、休憩、休憩時間です" : "作業再開、作業再開の時間ですよ！作業を再開してください";
    const textEn = isBreak ? "Break time, break time, it's time for a break" : "Work time, work time, please resume your work";

    const msgJp = new SpeechSynthesisUtterance(textJp);
    msgJp.lang = 'ja-JP';
    const msgEn = new SpeechSynthesisUtterance(textEn);
    msgEn.lang = 'en-US';

    speechSynthesis.speak(msgJp);
    msgJp.onend = () => speechSynthesis.speak(msgEn);
}

async function fadeOutAudio() {
    return new Promise(resolve => {
        let vol = 1.0;
        const interval = setInterval(() => {
            vol -= 0.1;
            if (vol <= 0) {
                clearInterval(interval);
                if (state.isPlaying) state.player.pauseVideo();
                if (state.pomodoro.isRadioActive) irukaStream.pause();
                resolve();
            } else {
                if (state.isPlaying) state.player.setVolume(vol * 100);
                if (state.pomodoro.isRadioActive) irukaStream.volume = vol;
            }
        }, 100);
    });
}

function handleKnobClick() {
    knobClickCount++;
    console.log(`🎛 Knob clicked: ${knobClickCount}`);
    if (knobClickCount >= 3) {
        toggleRadio();
        knobClickCount = 0;
    }
}

function toggleRadio() {
    state.pomodoro.isRadioActive = !state.pomodoro.isRadioActive;
    if (state.pomodoro.isRadioActive) {
        console.log('📻 FM IRUKA Streaming Start');
        if (state.isPlaying) togglePlay(); // Stop YT
        irukaStream.volume = 1.0;
        irukaStream.play().catch(e => console.error('Radio block:', e));
    } else {
        stopRadio();
    }
    updateUI();
}

function stopRadio() {
    state.pomodoro.isRadioActive = false;
    irukaStream.pause();
    irukaStream.currentTime = 0;
}

function openModal() {
    modalOverlay.classList.remove('hidden');
    searchInput.focus();
    renderSearchResults(''); // Show all or empty
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    searchInput.value = '';
}

// Debounce timer
let searchTimeout;

function handleSearch(e) {
    const query = e.target.value;

    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);

    // Debounce API calls (500ms)
    searchTimeout = setTimeout(() => {
        if (!query) {
            renderSearchResults('');
            return;
        }
        searchYouTube(query);
    }, 500);
}

async function searchYouTube(query) {
    if (!CONFIG.YOUTUBE_API_KEY) {
        console.warn('No YouTube API Key configured.');
        // Fallback to mock search
        renderSearchResults(query.toLowerCase(), true);
        return;
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${CONFIG.YOUTUBE_API_KEY}`
        );

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            renderSearchResultsWithData([]);
            return;
        }

        // Convert to internal track format
        const tracks = data.items.map(item => ({
            title: decodeHtmlEntities(item.snippet.title),
            artist: decodeHtmlEntities(item.snippet.channelTitle),
            duration: 0,
            id: item.id.videoId,
            service: 'YT',
            thumbnail: item.snippet.thumbnails.default.url
        }));

        // Filter out any results that might not have a videoId
        const validTracks = tracks.filter(t => t.id);

        if (validTracks.length > 0) {
            // Fetch details to get duration
            await fetchTrackDetails(validTracks);
        }

        renderSearchResultsWithData(validTracks);

    } catch (err) {
        console.error('YouTube Search Error:', err);
        searchResultsEl.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
}

function decodeHtmlEntities(text) {
    if (!text) return '';
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}

async function fetchTrackDetails(tracks) {
    const ids = tracks.map(t => t.id).filter(id => id).join(',');
    if (!ids) return;

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${CONFIG.YOUTUBE_API_KEY}`
        );

        if (!response.ok) {
            console.error('YouTube Videos API error:', response.status);
            return;
        }

        const data = await response.json();

        if (!data.items) return;

        // Map duration back to tracks
        data.items.forEach(item => {
            const track = tracks.find(t => t.id === item.id);
            if (track && item.contentDetails) {
                track.duration = parseISO8601Duration(item.contentDetails.duration);
            }
        });
    } catch (e) {
        console.error('Details fetch error:', e);
    }
}

function parseISO8601Duration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);

    return hours * 3600 + minutes * 60 + seconds;
}

function renderSearchResultsWithData(tracks) {
    searchResultsEl.innerHTML = '';
    if (tracks.length === 0) {
        searchResultsEl.innerHTML = '<div class="empty-state">No tracks found.</div>';
        return;
    }
    tracks.forEach(track => renderResultItem(track));
}

function renderSearchResults(query, isMock = false) {
    if (isMock) {
        // ... existing mock logic ...
        fallbackMockSearch(query);
    } else {
        // Initial state or clear
        searchResultsEl.innerHTML = '';
        if (!query) {
            const recommendations = DATABASE_TRACKS.slice(0, 5);
            recommendations.forEach(track => renderResultItem(track));
        }
    }
}

function fallbackMockSearch(query) {
    searchResultsEl.innerHTML = '';
    const filtered = DATABASE_TRACKS.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query)
    );
    if (filtered.length === 0) {
        searchResultsEl.innerHTML = '<div class="empty-state">No tracks found (Mock).</div>';
        return;
    }
    filtered.forEach(track => renderResultItem(track));
}

function renderResultItem(track) {
    const el = document.createElement('div');
    el.className = 'result-item';

    // Thumbnail check
    let iconOrImg = `<span class="service-icon">${track.service || 'MOCK'}</span>`;
    if (track.thumbnail) {
        iconOrImg = `<img src="${track.thumbnail}" class="result-thumb" alt="art">`;
    }

    el.innerHTML = `
        <div class="result-left">
            ${iconOrImg}
            <div class="result-info">
                <h4>${track.title}</h4>
                <p>${track.artist} • ${formatTime(track.duration)}</p>
            </div>
        </div>
        <button class="btn-add">+</button>
    `;

    el.querySelector('.btn-add').addEventListener('click', () => {
        addTrackFromSearch(track);
    });

    searchResultsEl.appendChild(el);
}

async function addTrackFromSearch(trackTemplate) {
    // Logic similar to addRandomTrack but with specific track
    const track = { ...trackTemplate };

    if (state.totalTime + track.duration > state.maxTime) {
        alert("Disc Full! 74min limit reached.");
        return;
    }

    await commandManager.execute(new AddTrackCommand(track));
    animateCDAction();

    // Auto-play checks
    if (!state.isPlaying) togglePlay();

    closeModal();
}

function openAboutModal() {
    console.log('📖 Opening About Modal');
    if (aboutModal) aboutModal.classList.remove('hidden');
}

function closeAboutModal() {
    if (aboutModal) aboutModal.classList.add('hidden');
}

init();
