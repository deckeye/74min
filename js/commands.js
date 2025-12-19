
import { state } from './state.js';
import {
    saveTrackToSupabase,
    updateTrackSoftDelete,
    softDeleteAllTracks,
    restoreAllTracks
} from './services.js';

// --- Command Pattern Implementation ---
export class CommandManager {
    constructor(updateCallback) {
        this.undoStack = [];
        this.redoStack = [];
        this.updateCallback = updateCallback;
    }

    async execute(command) {
        console.log('Executing command:', command.constructor.name);
        await command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
        if (this.updateCallback) this.updateCallback();
    }

    async undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        console.log('Undoing command:', command.constructor.name);
        await command.undo();
        this.redoStack.push(command);
        if (this.updateCallback) this.updateCallback();
    }

    async redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        console.log('Redoing command:', command.constructor.name);
        await command.execute();
        this.undoStack.push(command);
        if (this.updateCallback) this.updateCallback();
    }
}

export class AddTrackCommand {
    constructor(track, renderCallback) {
        this.track = { ...track };
        this.renderCallback = renderCallback;
    }
    async execute() {
        if (window.supabaseClient?.isReady?.()) {
            if (this.track.id) {
                await updateTrackSoftDelete(this.track.id, false);
            } else {
                await saveTrackToSupabase(this.track);
            }
        }
        state.tracks.push(this.track);
        state.totalTime += this.track.duration;
        if (this.renderCallback) this.renderCallback();
    }
    async undo() {
        const index = state.tracks.indexOf(this.track);
        if (index > -1) {
            state.tracks.splice(index, 1);
            state.totalTime -= this.track.duration;
        }
        if (window.supabaseClient?.isReady?.() && this.track.id) {
            await updateTrackSoftDelete(this.track.id, true);
        }
        if (this.renderCallback) this.renderCallback();
    }
}

export class DeleteTrackCommand {
    constructor(track, renderCallback) {
        this.track = track;
        this.index = state.tracks.indexOf(track);
        this.renderCallback = renderCallback;
    }
    async execute() {
        if (this.index > -1) {
            state.tracks.splice(this.index, 1);
            state.totalTime -= this.track.duration;
        }
        if (window.supabaseClient?.isReady?.() && this.track.id) {
            await updateTrackSoftDelete(this.track.id, true);
        }
        if (this.renderCallback) this.renderCallback();
    }
    async undo() {
        state.tracks.splice(this.index, 0, this.track);
        state.totalTime += this.track.duration;
        if (window.supabaseClient?.isReady?.() && this.track.id) {
            await updateTrackSoftDelete(this.track.id, false);
        }
        if (this.renderCallback) this.renderCallback();
    }
}

export class ClearAllCommand {
    constructor(renderCallback) {
        this.previousTracks = [...state.tracks];
        this.previousTotalTime = state.totalTime;
        this.renderCallback = renderCallback;
    }
    async execute() {
        state.tracks = [];
        state.totalTime = 0;
        if (window.supabaseClient?.isReady?.() && state.currentPlaylistId) {
            await softDeleteAllTracks(state.currentPlaylistId);
        }
        if (this.renderCallback) this.renderCallback();
    }
    async undo() {
        state.tracks = [...this.previousTracks];
        state.totalTime = this.previousTotalTime;
        if (window.supabaseClient?.isReady?.() && state.currentPlaylistId) {
            await restoreAllTracks(state.currentPlaylistId);
        }
        if (this.renderCallback) this.renderCallback();
    }
}
