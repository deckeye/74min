
import { state } from './state.js';

/**
 * YouTube Player Controller
 */

export function initYouTubePlayer(onStateChangeCallback, onReadyCallback) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
        state.player = new YT.Player('player', {
            height: '0', width: '0',
            playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
            events: {
                'onReady': () => {
                    state.isPlayerReady = true;
                    if (onReadyCallback) onReadyCallback();
                },
                'onStateChange': (e) => {
                    if (onStateChangeCallback) onStateChangeCallback(e);
                },
                'onError': (e) => console.error('YT Player Error:', e)
            }
        });
    };
}

export function playTrack(index, updateUICallback, updateMediaSessionCallback) {
    if (!state.isPlayerReady || index < 0 || index >= state.tracks.length) return;
    const track = state.tracks[index];
    state.currentTrackIndex = index;
    if (track.service === 'YT' && track.id) {
        state.player.loadVideoById(track.id);
        state.isPlaying = true;
        if (updateMediaSessionCallback) updateMediaSessionCallback(track);
    } else {
        // Handle non-YT tracks or skip
    }
    if (updateUICallback) updateUICallback();
}

export function stopPlayback(updateUICallback) {
    state.isPlaying = false;
    state.currentTrackIndex = -1;
    if (state.player && state.player.stopVideo) state.player.stopVideo();
    if (updateUICallback) updateUICallback();
}
