
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
        updateUI();
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
        updateUI();
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
        updateUI();
    }
    async undo() {
        state.tracks.splice(this.index, 0, this.track);
        state.totalTime += this.track.duration;
        if (isSupabaseReady && this.track.id) {
            await updateTrackSoftDelete(this.track.id, false);
        }
        renderTrackList();
        updateUI();
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
        updateUI();
    }
    async undo() {
        state.tracks = [...this.previousTracks];
        state.totalTime = this.previousTotalTime;
        if (isSupabaseReady && state.currentPlaylistId) {
            await restoreAllTracks(state.currentPlaylistId);
        }
        renderTrackList();
        updateUI();
    }
}
// --------------------------------------

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
const cassElement = document.getElementById('cassette-element');
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
        try {
            const configModule = await import('./config.js');
            CONFIG = configModule.CONFIG;
        } catch (configError) {
            console.warn('⚠️ config.js not found.');
        }

        updateUI();

        if (undoBtn) undoBtn.addEventListener('click', () => commandManager.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => commandManager.redo());
        if (clearAllBtn) clearAllBtn.addEventListener('click', deleteAllTracks);
        if (addBtn) addBtn.addEventListener('click', openModal);
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
        if (searchInput) searchInput.addEventListener('input', handleSearch);
        document.addEventListener('mousemove', handleMouseMove);

        if (aboutBtn) aboutBtn.addEventListener('click', openAboutModal);
        if (closeAboutModalBtn) closeAboutModalBtn.addEventListener('click', closeAboutModal);
        if (aboutModal) aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) closeAboutModal(); });

        const toggleLightBtn = document.getElementById('toggle-light-btn');
        if (toggleLightBtn) {
            toggleLightBtn.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                toggleLightBtn.textContent = document.body.classList.contains('light-mode') ? 'Modern Mode' : 'Light Mode';
            });
        }

        document.addEventListener('keydown', (e) => {
            const isCmdOrCtrl = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();
            if (isCmdOrCtrl && key === 'z' && !e.shiftKey) { e.preventDefault(); commandManager.undo(); }
            if (isCmdOrCtrl && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); commandManager.redo(); }
        });

        if (mediaToggleBtn) {
            mediaToggleBtn.addEventListener('click', () => {
                const types = ['cd', 'cassette'];
                let nextIndex = (types.indexOf(state.mediaType) + 1) % types.length;
                switchMedia(types[nextIndex]);
            });
        }

        if (logoEl) {
            let logoClickSessions = 0;
            logoEl.addEventListener('click', () => {
                logoClickSessions++;
                if (logoClickSessions >= 5) {
                    switchMedia('pomodoro');
                    logoClickSessions = 0;
                }
            });
        }

        if (pomoKnob) pomoKnob.addEventListener('click', handleKnobClick);
        if (pomoSoundSelect) pomoSoundSelect.addEventListener('change', (e) => { state.pomodoro.soundType = e.target.value; });
        if (pomoNightWavesCheck) pomoNightWavesCheck.addEventListener('change', (e) => { state.pomodoro.isAutoNightWaves = e.target.checked; });

        // Controls
        const cdPlayPause = document.getElementById('cd-play-pause');
        const cdStop = document.getElementById('cd-stop');
        const cdPrev = document.getElementById('cd-prev');
        const cdNext = document.getElementById('cd-next');
        if (cdPlayPause) cdPlayPause.addEventListener('click', togglePlay);
        if (cdStop) cdStop.addEventListener('click', stopPlayback);
        if (cdPrev) cdPrev.addEventListener('click', playPrevTrack);
        if (cdNext) cdNext.addEventListener('click', playNextTrack);

        const cassPlay = document.getElementById('cass-play');
        const cassStop = document.getElementById('cass-stop');
        const cassRew = document.getElementById('cass-rew');
        const cassFF = document.getElementById('cass-ff');
        if (cassPlay) cassPlay.addEventListener('click', () => { if (!state.isPlaying) togglePlay(); });
        if (cassStop) cassStop.addEventListener('click', stopPlayback);
        if (cassRew) cassRew.addEventListener('click', playPrevTrack);
        if (cassFF) cassFF.addEventListener('click', playNextTrack);

        if (isSupabaseReady) await loadPlaylists();
        initYouTubePlayer();

        const atmoToggleBtn = document.getElementById('atmo-toggle');
        if (atmoToggleBtn) {
            atmoToggleBtn.addEventListener('click', () => {
                const nextAtmo = state.atmosphere === 'cyber' ? 'study-desk' : 'cyber';
                switchAtmosphere(nextAtmo);
            });
        }
        const savedAtmo = localStorage.getItem('74min_atmo') || 'cyber';
        switchAtmosphere(savedAtmo);

    } catch (err) {
        console.error('❌ Critical Initialization Error:', err);
    }
}

async function loadPlaylists() {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    try {
        const { data, error } = await supabase.from('playlists').select('*').order('created_at', { ascending: false }).limit(1);
        if (!error && data && data.length > 0) await loadPlaylistTracks(data[0].id);
    } catch (err) { console.error(err); }
}

async function loadPlaylistTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    try {
        const { data, error } = await supabase.from('tracks').select('*').eq('playlist_id', playlistId).order('position', { ascending: true });
        if (!error) {
            state.tracks = data.filter(t => !t.is_deleted);
            state.totalTime = state.tracks.reduce((sum, track) => sum + track.duration, 0);
            state.currentPlaylistId = playlistId;
            renderTrackList();
            updateUI();
        }
    } catch (err) { console.error(err); }
}

function renderTrackList() {
    trackListEl.innerHTML = '';
    state.tracks.forEach(track => renderTrack(track));
}

function togglePlay() {
    if (!state.isPlayerReady) return;
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        cdDisc.classList.add('playing');
        if (cassElement) cassElement.classList.add('playing');
        if (state.currentTrackIndex === -1 && state.tracks.length > 0) {
            playTrack(0);
        } else {
            state.player.playVideo();
        }
    } else {
        cdDisc.classList.remove('playing');
        if (cassElement) cassElement.classList.remove('playing');
        state.player.pauseVideo();
    }
    updateUI();
}

function initYouTubePlayer() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
        state.player = new YT.Player('player', {
            height: '0', width: '0',
            playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
            events: {
                'onReady': () => { state.isPlayerReady = true; },
                'onStateChange': (e) => { if (e.data === 0) playNextTrack(); },
                'onError': (e) => console.error('YT Player Error:', e)
            }
        });
    };
}

function playTrack(index) {
    if (!state.isPlayerReady || index < 0 || index >= state.tracks.length) return;
    const track = state.tracks[index];
    state.currentTrackIndex = index;
    if (track.service === 'YT' && track.id) {
        state.player.loadVideoById(track.id);
        state.isPlaying = true;
        cdDisc.classList.add('playing');
        if (cassElement) cassElement.classList.add('playing');
        updateMediaSession(track);
    } else {
        playNextTrack();
    }
    updateUI();
}

function playNextTrack() {
    if (state.currentTrackIndex + 1 < state.tracks.length) {
        playTrack(state.currentTrackIndex + 1);
    } else {
        stopPlayback();
    }
}

function playPrevTrack() {
    if (state.currentTrackIndex > 0) {
        playTrack(state.currentTrackIndex - 1);
    } else if (state.tracks.length > 0) {
        playTrack(0);
    }
}

function stopPlayback() {
    state.isPlaying = false;
    state.currentTrackIndex = -1;
    cdDisc.classList.remove('playing');
    if (cassElement) cassElement.classList.remove('playing');
    if (state.player && state.player.stopVideo) state.player.stopVideo();
    updateUI();
}

function updateMediaSession(track) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title, artist: track.artist, album: state.title,
            artwork: [{ src: track.thumbnail || 'https://via.placeholder.com/150', sizes: '150x150', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', playPrevTrack);
        navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
    }
}

async function saveTrackToSupabase(track) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    try {
        if (!state.currentPlaylistId) {
            const { data: playlist, error } = await supabase.from('playlists').insert({ title: state.title, total_duration: track.duration, is_public: true }).select().single();
            if (!error) state.currentPlaylistId = playlist.id;
        }
        const { data, error } = await supabase.from('tracks').insert({ playlist_id: state.currentPlaylistId, title: track.title, artist: track.artist, duration: track.duration, service: track.service, position: state.tracks.length }).select().single();
        if (!error && data) track.id = data.id;
    } catch (err) { console.error(err); }
}

async function deleteAllTracks() {
    if (state.tracks.length === 0) return;
    if (confirm('Are you sure you want to empty the disc?')) await commandManager.execute(new ClearAllCommand());
}

async function updateTrackSoftDelete(trackId, isDeleted) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    await supabase.from('tracks').update({ is_deleted: isDeleted }).eq('id', trackId);
}

async function softDeleteAllTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    await supabase.from('tracks').update({ is_deleted: true }).eq('playlist_id', playlistId);
}

async function restoreAllTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    await supabase.from('tracks').update({ is_deleted: false }).eq('playlist_id', playlistId);
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
            <span class="service-tag">${track.service}</span>
            <span class="duration">${formatTime(track.duration)}</span>
            <button class="btn-delete">×</button>
        </div>
    `;
    el.querySelector('.btn-delete').addEventListener('click', (e) => { e.stopPropagation(); commandManager.execute(new DeleteTrackCommand(track)); });
    trackListEl.appendChild(el);
    trackListEl.scrollTop = trackListEl.scrollHeight;
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
    if (timelineBar) timelineBar.style.width = `${pct}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(state.totalTime);
    const trackItems = trackListEl.querySelectorAll('.track-item');
    trackItems.forEach((el, idx) => {
        if (idx === state.currentTrackIndex) el.classList.add('active');
        else el.classList.remove('active');
    });
    if (undoBtn) undoBtn.disabled = commandManager.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = commandManager.redoStack.length === 0;
    updateMediaDisplays();
}

function updateMediaDisplays() {
    const minLabel = `${Math.floor(state.maxTime / 60)}min`;
    const cdTimeTag = document.getElementById('cd-time-tag');
    const cassetteTimeTag = document.getElementById('cassette-time-tag');
    const cdTitle = document.getElementById('playlist-title');
    const cassetteTitle = document.getElementById('cassette-title-tag');

    if (cdTimeTag) cdTimeTag.textContent = minLabel;
    if (cassetteTimeTag) cassetteTimeTag.textContent = minLabel;
    if (cdTitle) cdTitle.textContent = state.title;
    if (cassetteTitle) cassetteTitle.textContent = state.title;

    const cdTrackNumEl = document.getElementById('cd-track-num');
    const cdTrackTimeEl = document.getElementById('cd-track-time');
    if (cdTrackNumEl) cdTrackNumEl.textContent = state.currentTrackIndex >= 0 ? String(state.currentTrackIndex + 1).padStart(2, '0') : '00';
    if (cdTrackTimeEl) cdTrackTimeEl.textContent = state.currentTrackIndex >= 0 ? formatTime(state.tracks[state.currentTrackIndex].duration) : '00:00';

    const cdPlayPauseBtn = document.getElementById('cd-play-pause');
    if (cdPlayPauseBtn) cdPlayPauseBtn.textContent = state.isPlaying ? 'Ⅱ' : '▶';

    if (state.mediaType === 'pomodoro') {
        const pomoTimeEl = document.getElementById('pomo-time');
        const pomoStatusEl = document.getElementById('pomo-status');
        const remaining = (state.pomodoro.phase === 'work' ? state.pomodoro.workDuration : state.pomodoro.breakDuration) - state.pomodoro.elapsedInPhase;
        if (pomoTimeEl) pomoTimeEl.textContent = state.pomodoro.isRadioActive ? 'LIVE' : formatTime(Math.max(0, remaining));
        if (pomoStatusEl) pomoStatusEl.textContent = state.pomodoro.isRadioActive ? 'FM IRUKA' : state.pomodoro.phase.toUpperCase();
    }
}

function switchMedia(type) {
    state.mediaType = type;
    document.querySelectorAll('.media-element').forEach(el => el.classList.add('hidden'));
    const targetEl = document.getElementById(`${type}-element`);
    if (targetEl) targetEl.classList.remove('hidden');
    const targetControls = document.getElementById(`${type}-controls`);
    if (targetControls) targetControls.classList.remove('hidden');
    if (mediaToggleBtn) mediaToggleBtn.textContent = `Media: ${type === 'pomodoro' ? 'Pomodoro' : type.toUpperCase()}`;
    if (type === 'pomodoro') startPomodoro();
    else { stopPomodoro(); stopRadio(); }
    updateUI();
}

function switchAtmosphere(type) {
    state.atmosphere = type;
    document.body.dataset.atmosphere = type;
    localStorage.setItem('74min_atmo', type);
    updateUI();
}

function startPomodoro() {
    stopPomodoro();
    state.pomodoro.elapsedInPhase = 0;
    state.pomodoro.timer = setInterval(() => {
        state.pomodoro.elapsedInPhase++;
        const limit = state.pomodoro.phase === 'work' ? state.pomodoro.workDuration : state.pomodoro.breakDuration;
        if (state.pomodoro.elapsedInPhase >= limit) handlePhaseSwitch();
        updateUI();
    }, 1000);
}

function stopPomodoro() { if (state.pomodoro.timer) { clearInterval(state.pomodoro.timer); state.pomodoro.timer = null; } }

async function handlePhaseSwitch() {
    await fadeOutAudio();
    state.pomodoro.phase = state.pomodoro.phase === 'work' ? 'break' : 'work';
    state.pomodoro.elapsedInPhase = 0;
    playPomodoroSE();
    updateUI();
}

function playPomodoroSE() {
    if (state.pomodoro.soundType === 'voice') playVoiceAnnouncement();
}

function playVoiceAnnouncement() {
    const isBreak = state.pomodoro.phase === 'break';
    const msgJp = new SpeechSynthesisUtterance(isBreak ? "休憩時間です" : "作業を再開してください");
    msgJp.lang = 'ja-JP';
    speechSynthesis.speak(msgJp);
}

async function fadeOutAudio() {
    if (state.isPlaying) state.player.pauseVideo();
    if (state.pomodoro.isRadioActive) irukaStream.pause();
}

function handleKnobClick() {
    knobClickCount++;
    if (knobClickCount >= 3) { toggleRadio(); knobClickCount = 0; }
}

function toggleRadio() {
    state.pomodoro.isRadioActive = !state.pomodoro.isRadioActive;
    if (state.pomodoro.isRadioActive) { if (state.isPlaying) togglePlay(); irukaStream.play(); }
    else stopRadio();
    updateUI();
}

function stopRadio() { state.pomodoro.isRadioActive = false; irukaStream.pause(); }

function openModal() { modalOverlay.classList.remove('hidden'); searchInput.focus(); renderSearchResults(''); }
function closeModal() { modalOverlay.classList.add('hidden'); searchInput.value = ''; }

let searchTimeout;
function handleSearch(e) {
    const query = e.target.value;
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { if (!query) renderSearchResults(''); else searchYouTube(query); }, 500);
}

async function searchYouTube(query) {
    if (!CONFIG.YOUTUBE_API_KEY) { renderSearchResults(query.toLowerCase(), true); return; }
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${CONFIG.YOUTUBE_API_KEY}`);
        const data = await response.json();
        const validTracks = (data.items || []).map(item => ({ title: item.snippet.title, artist: item.snippet.channelTitle, duration: 0, id: item.id.videoId, service: 'YT', thumbnail: item.snippet.thumbnails.default.url }));
        renderSearchResultsWithData(validTracks);
    } catch (err) { console.error(err); }
}

function renderSearchResultsWithData(tracks) {
    searchResultsEl.innerHTML = tracks.length === 0 ? '<div class="empty-state">No tracks found.</div>' : '';
    tracks.forEach(track => renderResultItem(track));
}

function renderSearchResults(query, isMock = false) {
    if (isMock) fallbackMockSearch(query);
    else { searchResultsEl.innerHTML = ''; if (!query) DATABASE_TRACKS.slice(0, 5).forEach(track => renderResultItem(track)); }
}

function fallbackMockSearch(query) {
    searchResultsEl.innerHTML = '';
    DATABASE_TRACKS.filter(t => t.title.toLowerCase().includes(query)).forEach(track => renderResultItem(track));
}

function renderResultItem(track) {
    const el = document.createElement('div');
    el.className = 'result-item';
    el.innerHTML = `<div><h4>${track.title}</h4><p>${track.artist}</p></div><button class="btn-add">+</button>`;
    el.querySelector('.btn-add').addEventListener('click', () => { commandManager.execute(new AddTrackCommand(track)); closeModal(); });
    searchResultsEl.appendChild(el);
}

function openAboutModal() { if (aboutModal) aboutModal.classList.remove('hidden'); }
function closeAboutModal() { if (aboutModal) aboutModal.classList.add('hidden'); }

init();
