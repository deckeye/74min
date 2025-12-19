
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
    updateTapePhysics();
}

/**
 * Calculations for realistic tape accumulation and auto-reverse
 */
export function updateTapePhysics() {
    const spoolLeft = document.getElementById('spool-left');
    const spoolRight = document.getElementById('spool-right');
    const sideIndicator = document.getElementById('side-indicator');
    const cassElement = document.getElementById('cassette-element');

    if (!spoolLeft || !spoolRight) return;

    // Logic: 
    // Side A = 0 to maxTime/2
    // Side B = maxTime/2 to maxTime (reflected progress)
    const midPoint = state.maxTime / 2;
    let progress; // 0.0 to 1.0 within the current side
    const isSideB = state.totalTime > midPoint;

    if (!isSideB) {
        progress = state.totalTime / midPoint;
        if (sideIndicator) sideIndicator.textContent = 'SIDE A';
        if (cassElement) cassElement.classList.remove('reversed');
    } else {
        progress = (state.totalTime - midPoint) / midPoint;
        if (sideIndicator) sideIndicator.textContent = 'SIDE B';
        if (cassElement) cassElement.classList.add('reversed');
    }

    // Tape Radii:
    // Min radius (hub only) = 35px
    // Max radius (full tape) = 110px
    // Since total volume is constant, the sum of areas is constant (roughly)
    // Here we use a simpler linear-to-sqrt approximation for visual feel
    const minR = 35;
    const maxR = 110;

    let leftR, rightR;
    if (!isSideB) {
        // Side A: Left reel (source) decreases, Right reel (take-up) increases
        leftR = maxR - (maxR - minR) * progress;
        rightR = minR + (maxR - minR) * progress;
    } else {
        // Side B: Right reel becomes source, Left reel becomes take-up
        // But physically, on reverse, the take-up reel is often the one that was the source
        // Let's stick to the visual: Tape is physically moving to the other side
        rightR = maxR - (maxR - minR) * progress;
        leftR = minR + (maxR - minR) * progress;
    }

    spoolLeft.style.setProperty('--radius', `${leftR}px`);
    spoolRight.style.setProperty('--radius', `${rightR}px`);
}

/**
 * Animate the handwriting effect on the cassette sticker
 */
export function animateLabelWriting(text) {
    const el = document.getElementById('cassette-title-tag');
    if (!el) return;

    el.textContent = text;
    el.classList.remove('writing');
    void el.offsetWidth; // Trigger reflow
    el.classList.add('writing');
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
