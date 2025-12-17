
// Main Application Logic
console.log('74min Initializing...');

// Initialize Supabase
const isSupabaseReady = window.supabaseClient?.init();

// Import Config
import { CONFIG } from './config.js';

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

const modalOverlay = document.getElementById('search-modal');
const closeModalBtn = document.getElementById('close-modal');
const searchInput = document.getElementById('search-input');
const searchResultsEl = document.getElementById('search-results');

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
    updateUI();

    // Event Listeners
    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', deleteAllTracks);

    if (addBtn) addBtn.addEventListener('click', () => openModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    if (searchInput) searchInput.addEventListener('input', handleSearch);
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
    // Clone the object to ensure unique references
    const track = { ...MOCK_TRACKS[Math.floor(Math.random() * MOCK_TRACKS.length)] };

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

    // 1. Clear State
    const previousTracks = [...state.tracks]; // Backup just in case (though we don't have undo yet)
    state.tracks = [];
    state.totalTime = 0;

    // 2. Clear Supabase
    if (state.currentPlaylistId && window.supabaseClient?.client) {
        const supabase = window.supabaseClient.client;
        try {
            const { error } = await supabase
                .from('tracks')
                .delete()
                .eq('playlist_id', state.currentPlaylistId);

            if (error) {
                console.error('Error deleting all tracks:', error);
                // Optional: restore state if critical failure, but for now just log
            } else {
                console.log('All tracks deleted from DB');

                // Reset playlist duration
                await supabase
                    .from('playlists')
                    .update({ total_duration: 0 })
                    .eq('id', state.currentPlaylistId);
            }
        } catch (err) {
            console.error('Supabase error during bulk delete:', err);
        }
    }

    // 3. Update UI
    trackListEl.innerHTML = '';
    updateUI();
}

async function deleteTrack(track) {
    if (!confirm(`Delete "${track.title}"?`)) return; // Optional confirmation

    // 1. Remove from State
    const index = state.tracks.indexOf(track);
    if (index > -1) {
        state.tracks.splice(index, 1);
        state.totalTime -= track.duration;
    }

    // 2. Remove from Supabase (if ID exists)
    if (track.id && window.supabaseClient?.client) {
        const supabase = window.supabaseClient.client;
        supabase.from('tracks').delete().eq('id', track.id).then(({ error }) => {
            if (error) console.error('Error deleting from DB:', error);
            else console.log('Deleted from DB');
        });

        // Update playlist duration in DB
        if (state.currentPlaylistId) {
            supabase.from('playlists')
                .update({ total_duration: state.totalTime })
                .eq('id', state.currentPlaylistId);
        }
    }

    // 3. Update UI
    // Re-render entire list to ensure order/stats are correct
    trackListEl.innerHTML = '';
    state.tracks.forEach(t => renderTrack(t)); // Pass original track refs
    updateUI();
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
            throw new Error(err.error?.message || 'API Error');
        }

        const data = await response.json();

        // Convert to internal track format
        const tracks = data.items.map(item => ({
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            duration: 0, // YouTube Search API doesn't return duration. Requires separate 'videos' call. We'll set 0 or fetch details later.
            // For prototype: random duration or placeholder '??:??'
            // Actually, let's fetch details to be proper, OR just estimate for now to save quota.
            // Let's use 0 and handle it in UI? Or better, fetch details.
            // To save quota (search=100 units), we can skip details (video=1 unit). 
            // But we need duration for the CD limit.
            // Let's assume user accepts 0 or we do a second call.
            // For this step, I'll fetch details for the IDs found.
            id: item.id.videoId, // Temporary ID holder
            service: 'YT',
            thumbnail: item.snippet.thumbnails.default.url
        }));

        // Fetch details to get duration
        await fetchTrackDetails(tracks);

        renderSearchResultsWithData(tracks);

    } catch (err) {
        console.error('YouTube Search Error:', err);
        searchResultsEl.innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
}

async function fetchTrackDetails(tracks) {
    if (tracks.length === 0) return;
    const ids = tracks.map(t => t.id).join(',');

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${CONFIG.YOUTUBE_API_KEY}`
        );
        const data = await response.json();

        // Map duration back to tracks
        data.items.forEach(item => {
            const track = tracks.find(t => t.id === item.id);
            if (track) {
                track.duration = parseISO8601Duration(item.contentDetails.duration);
            }
        });
    } catch (e) {
        console.error('Details fetch error', e);
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

    // If Supabase is available, save to DB
    if (isSupabaseReady) {
        await saveTrackToSupabase(track);
    }

    state.tracks.push(track);
    state.totalTime += track.duration;

    renderTrack(track); // Add to main list
    updateUI();
    animateCDAction();

    // Auto-play checks
    if (!state.isPlaying) togglePlay();

    // Close modal? Maybe keep open for multi-add. 
    // Let's close for now to be simple.
    closeModal();
}

init();
