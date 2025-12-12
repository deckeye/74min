
// Main Application Logic
console.log('74min Initializing...');

// Initialize Supabase
const isSupabaseReady = window.supabaseClient?.init();

// Simple state
const state = {
    tracks: [],
    totalTime: 0, // in seconds
    maxTime: 74 * 60, // 74 minutes in seconds
    title: "My Summer Mix",
    isPlaying: false,
    currentPlaylistId: null
};

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

// Initialize
async function init() {
    updateUI();

    // Event Listeners
    if (addBtn) addBtn.addEventListener('click', addRandomTrack);
    document.addEventListener('mousemove', handleMouseMove);

    // Toggle play on CD click
    if (cdVisual) cdVisual.addEventListener('click', togglePlay);

    // Check Supabase connection
    if (isSupabaseReady) {
        console.log('✅ Using Supabase backend');
        // Load existing playlists if any
        await loadPlaylists();
    } else {
        console.log('⚠️ Using mock data (Supabase not configured)');
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
        state.tracks = data;
        state.totalTime = data.reduce((sum, track) => sum + track.duration, 0);
        state.currentPlaylistId = playlistId;

        // Render all tracks
        trackListEl.innerHTML = '';
        data.forEach(track => renderTrack(track));
        updateUI();
    } catch (err) {
        console.error('Error loading tracks:', err);
    }
}

function togglePlay() {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        cdDisc.classList.add('playing');
    } else {
        cdDisc.classList.remove('playing');
    }
}

async function addRandomTrack() {
    const track = MOCK_TRACKS[Math.floor(Math.random() * MOCK_TRACKS.length)];

    if (state.totalTime + track.duration > state.maxTime) {
        alert("Disc Full! 74min limit reached.");
        return;
    }

    // If Supabase is available, save to DB
    if (isSupabaseReady) {
        await saveTrackToSupabase(track);
    }

    state.tracks.push(track);
    state.totalTime += track.duration;

    renderTrack(track);
    updateUI();
    animateCDAction();

    // Auto-play on first track if not playing
    if (!state.isPlaying) togglePlay();
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
            });

        if (error) {
            console.error('Error saving track:', error);
        } else {
            console.log('✅ Saved track to Supabase');
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
}

init();
