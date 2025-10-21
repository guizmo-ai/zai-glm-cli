/**
 * ChatStateMachine
 *
 * Manages chat flow state transitions to ensure proper sequencing
 * of thinking, tool execution, and content streaming.
 *
 * Prevents concurrent streaming and tool execution that causes
 * the "deconstructed" response problem.
 */
/**
 * ChatStateMachine - Enforces sequential chat flow
 *
 * Ensures:
 * 1. Content only streams in "responding" state
 * 2. Tools only execute in "executing_tools" state
 * 3. Invalid transitions are prevented
 */
export class ChatStateMachine {
    state = "idle";
    history = [];
    listeners = new Set();
    /**
     * Valid state transitions
     */
    validTransitions = {
        idle: ["thinking"],
        thinking: ["planning_tools", "responding", "done", "error"],
        planning_tools: ["executing_tools", "error"],
        executing_tools: ["thinking", "responding", "done", "error"],
        responding: ["done", "error"],
        done: ["idle"],
        error: ["idle"],
    };
    /**
     * Get current state
     */
    getCurrentState() {
        return this.state;
    }
    /**
     * Transition to new state
     *
     * @param to - Target state
     * @param metadata - Optional metadata for the transition
     * @throws Error if transition is invalid
     */
    transition(to, metadata) {
        const validTargets = this.validTransitions[this.state] || [];
        if (!validTargets.includes(to)) {
            throw new Error(`Invalid state transition: ${this.state} -> ${to}. Valid transitions from ${this.state}: ${validTargets.join(", ")}`);
        }
        const transition = {
            from: this.state,
            to,
            timestamp: Date.now(),
            metadata,
        };
        this.state = to;
        this.history.push(transition);
        // Notify listeners
        for (const listener of this.listeners) {
            listener(transition);
        }
    }
    /**
     * Check if content streaming is allowed
     */
    canStreamContent() {
        return this.state === "responding";
    }
    /**
     * Check if tool execution is allowed
     */
    canExecuteTools() {
        return this.state === "executing_tools";
    }
    /**
     * Check if thinking display is allowed
     */
    canShowThinking() {
        return this.state === "thinking" || this.state === "planning_tools";
    }
    /**
     * Check if processing is complete
     */
    isComplete() {
        return this.state === "done" || this.state === "error";
    }
    /**
     * Check if in error state
     */
    isError() {
        return this.state === "error";
    }
    /**
     * Check if idle
     */
    isIdle() {
        return this.state === "idle";
    }
    /**
     * Reset to idle state
     */
    reset() {
        this.state = "idle";
        this.history = [];
    }
    /**
     * Get transition history
     */
    getHistory() {
        return [...this.history];
    }
    /**
     * Add state change listener
     *
     * @param listener - Callback for state transitions
     * @returns Unsubscribe function
     */
    onTransition(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    /**
     * Get duration in current state
     */
    getStateDuration() {
        if (this.history.length === 0)
            return 0;
        const lastTransition = this.history[this.history.length - 1];
        return Date.now() - lastTransition.timestamp;
    }
    /**
     * Get total processing time
     */
    getTotalDuration() {
        if (this.history.length === 0)
            return 0;
        const first = this.history[0];
        const last = this.history[this.history.length - 1];
        return last.timestamp - first.timestamp;
    }
    /**
     * Force state (use with caution - for error recovery)
     */
    forceState(state) {
        this.state = state;
    }
    /**
     * Create a checkpoint of current state
     */
    checkpoint() {
        return {
            state: this.state,
            historyLength: this.history.length,
        };
    }
    /**
     * Restore from checkpoint (for error recovery)
     */
    restore(checkpoint) {
        this.state = checkpoint.state;
        this.history = this.history.slice(0, checkpoint.historyLength);
    }
}
/**
 * Create a new state machine instance
 */
export function createChatStateMachine() {
    return new ChatStateMachine();
}
//# sourceMappingURL=chat-state-machine.js.map