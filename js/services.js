
import { state } from './state.js';

/**
 * YouTube API and Supabase common services
 */

export async function saveTrackToSupabase(track) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    try {
        if (!state.currentPlaylistId) {
            const { data: playlist, error } = await supabase.from('playlists').insert({
                title: state.title,
                total_duration: track.duration,
                is_public: true
            }).select().single();
            if (!error) state.currentPlaylistId = playlist.id;
        }
        const { data, error } = await supabase.from('tracks').insert({
            playlist_id: state.currentPlaylistId,
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            service: track.service,
            position: state.tracks.length
        }).select().single();
        if (!error && data) track.id = data.id;
    } catch (err) { console.error(err); }
}

export async function updateTrackSoftDelete(trackId, isDeleted) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    await supabase.from('tracks').update({ is_deleted: isDeleted }).eq('id', trackId);
}

export async function softDeleteAllTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    await supabase.from('tracks').update({ is_deleted: true }).eq('playlist_id', playlistId);
}

export async function restoreAllTracks(playlistId) {
    const supabase = window.supabaseClient?.client;
    if (!supabase) return;
    await supabase.from('tracks').update({ is_deleted: false }).eq('playlist_id', playlistId);
}

export async function searchYouTube(query, apiKey) {
    if (!apiKey) return null;
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`);
        const data = await response.json();
        return (data.items || []).map(item => ({
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            duration: 0,
            id: item.id.videoId,
            service: 'YT',
            thumbnail: item.snippet.thumbnails.default.url
        }));
    } catch (err) {
        console.error(err);
        return null;
    }
}
