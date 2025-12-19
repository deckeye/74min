
// Application State and Constants

export const MODES = {
    STANDARD: { label: '74min', time: 74 * 60 },
    CLASSIC: { label: '60min', time: 60 * 60 },
    FOCUS: { label: '25min', time: 25 * 60 }
};

export const state = {
    tracks: [],
    totalTime: 0, // in seconds
    maxTime: 74 * 60, // 74 minutes in seconds
    title: localStorage.getItem('74min_title') || "My Summer Mix",
    mediaType: 'cd', // 'cd' | 'cassette' | 'pomodoro'
    isPlaying: false,
    isLooping: false,
    currentPlaylistId: null,
    currentTrackIndex: -1,
    player: null,
    isPlayerReady: false,

    // Pomodoro specific state
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

// Configuration State
export let CONFIG = {
    YOUTUBE_API_KEY: ''
};

export function setConfig(newConfig) {
    CONFIG = { ...CONFIG, ...newConfig };
}
