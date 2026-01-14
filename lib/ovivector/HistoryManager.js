export default class HistoryManager {
    constructor(maxSize = 50) {
        this.maxSize = maxSize;
        this.stack = [];
        this.index = -1;
    }

    push(state) {
        // If we are in the middle of the stack (after undos), discard future states
        if (this.index < this.stack.length - 1) {
            this.stack = this.stack.slice(0, this.index + 1);
        }

        // Push new state
        this.stack.push(state);

        // Keep size within limits
        if (this.stack.length > this.maxSize) {
            this.stack.shift();
        } else {
            this.index++;
        }

        console.log(`[History] State saved. Stack size: ${this.stack.length}, Index: ${this.index}`);
    }

    undo() {
        if (this.index > 0) {
            this.index--;
            return this.stack[this.index];
        }
        return null;
    }

    redo() {
        if (this.index < this.stack.length - 1) {
            this.index++;
            return this.stack[this.index];
        }
        return null;
    }

    clear() {
        this.stack = [];
        this.index = -1;
    }
}
