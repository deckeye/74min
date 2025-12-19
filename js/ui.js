
import { state } from './state.js';

/**
 * UI Rendering and DOM Utilities
 */

export function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
}

export function updateMediaDisplays() {
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

export function updateUI() {
    const timelineBar = document.getElementById('timeline-bar');
    const currentTimeEl = document.getElementById('current-time');
    const trackListEl = document.getElementById('track-list');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const cdDisc = document.querySelector('.cd-disc');
    const cassElement = document.getElementById('cassette-element');

    const pct = (state.totalTime / state.maxTime) * 100;
    if (timelineBar) timelineBar.style.width = `${pct}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(state.totalTime);

    if (trackListEl) {
        const trackItems = trackListEl.querySelectorAll('.track-item');
        trackItems.forEach((el, idx) => {
            if (idx === state.currentTrackIndex) el.classList.add('active');
            else el.classList.remove('active');
        });
    }

    if (undoBtn) undoBtn.disabled = window.commandManager?.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = window.commandManager?.redoStack.length === 0;

    // Visual State
    if (cdDisc) {
        if (state.isPlaying) cdDisc.classList.add('playing');
        else cdDisc.classList.remove('playing');
    }
    if (cassElement) {
        if (state.isPlaying) cassElement.classList.add('playing');
        else cassElement.classList.remove('playing');
    }

    updateMediaDisplays();
}

export function renderTrack(track, onDeleteCallback) {
    const trackListEl = document.getElementById('track-list');
    if (!trackListEl) return;

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
    el.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (onDeleteCallback) onDeleteCallback(track);
    });
    trackListEl.appendChild(el);
    trackListEl.scrollTop = trackListEl.scrollHeight;
}

export function renderTrackList(onDeleteCallback) {
    const trackListEl = document.getElementById('track-list');
    if (trackListEl) trackListEl.innerHTML = '';
    state.tracks.forEach(track => renderTrack(track, onDeleteCallback));
}
