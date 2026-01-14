
export default class HistoryManager {
    constructor(limit = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.limit = limit;
        this.isLocked = false; // Prevent recursive history entries
    }

    /**
     * Push a new state to the history stack.
     * @param {Object} state - The complete state object (e.g. simulationData).
     */
    push(state) {
        if (this.isLocked) return;

        // Clone state to avoid reference issues
        const snapshot = JSON.stringify(state);

        // Avoid duplicate consecutive states
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
            return;
        }

        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.limit) {
            this.undoStack.shift(); // Remove oldest
        }

        // Clear redo stack on new action
        this.redoStack = [];
        console.log(`[History] State saved. Stack: ${this.undoStack.length}`);
    }

    /**
     * Perform Undo
     * @returns {Object|null} The previous state, or null if empty.
     */
    undo(currentState) {
        if (this.undoStack.length === 0) {
            console.log('[History] Undo stack empty.');
            return null;
        }

        // 1. Save current state to Redo stack first
        // If we are at the "tip" of history, the currentState might be newer than the top of undoStack
        // But usually, we push to undoStack BEFORE modifying. 
        // Strategy: 
        // - Push 'currentState' to redoStack.
        // - Pop from undoStack -> become new state.

        const currentSnapshot = JSON.stringify(currentState);
        this.redoStack.push(currentSnapshot);

        const prevSnapshot = this.undoStack.pop();
        console.log(`[History] Undoing... Left: ${this.undoStack.length}`);
        return JSON.parse(prevSnapshot);
    }

    /**
     * Perform Redo
     * @returns {Object|null} The next state, or null if empty.
     */
    redo(currentState) {
        if (this.redoStack.length === 0) {
            console.log('[History] Redo stack empty.');
            return null;
        }

        // 1. Save current state to Undo stack
        const currentSnapshot = JSON.stringify(currentState);
        this.undoStack.push(currentSnapshot);

        const nextSnapshot = this.redoStack.pop();
        console.log(`[History] Redoing... Left: ${this.redoStack.length}`);
        return JSON.parse(nextSnapshot);
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}
